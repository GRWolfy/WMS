function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("WMS Tools")
    .addItem("Upload Inventory File", "showUploadDialog")
    .addToUi();
}

function loadMainPage() {
  return HtmlService.createHtmlOutputFromFile('mainpage_ui').getContent();
}

function handleStockInBatchUpload(formData) {
  try {
    if (!formData || !formData.fileName || !formData.fileContent) {
      return { error: "❌ Invalid file data." };
    }

    const fileName = formData.fileName.toLowerCase();
    if (!fileName.endsWith(".csv")) {
      return { error: "❌ Only .csv files are supported. Please upload a CSV file." };
    }

    const content = formData.fileContent.split(',')[1];
    const decoded = Utilities.base64Decode(content);
    const csvString = Utilities.newBlob(decoded).getDataAsString();
    const csvData = Utilities.parseCsv(csvString);

    const requiredHeader = ['day', 'taskid', 'gsproductid', 'uom', 'quantity'];
    const headerRow = csvData[0].map(h => h.toLowerCase().trim());

    if (
      headerRow.length !== requiredHeader.length ||
      !headerRow.every((h, i) => h === requiredHeader[i])
    ) {
      return { error: `❌ Invalid headers. Expected: ${requiredHeader.join(', ')}` };
    }

    return { data: csvData }; // send validated data back to frontend

  } catch (error) {
    return { error: `❌ Upload failed: ${error.message}` };
  }
}

function generateLogId() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 10);
  return timestamp + randomStr;
}

function getValidGsProductIds() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Barcode SKU");
  if (!sheet) throw new Error('Sheet "Barcode SKU" not found.');

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return new Set();

  // Column F is 6, get all item_code values (starting from row 2 to skip header)
  const values = sheet.getRange(2, 6, lastRow - 1, 1).getValues();

  // Normalize by trimming and converting to string
  const idSet = new Set();
  values.forEach(row => {
    const val = row[0];
    if (val !== null && val !== undefined) {
      idSet.add(val.toString().trim());
    }
  });

  return idSet;
}

function uploadToInventoryIn(payload) {
  const { employee, data } = payload;

  if (!Array.isArray(data) || data.length === 0)
    throw new Error("❌ No data provided.");

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Inventory In');
  if (!sheet) throw new Error('Sheet "Inventory In" not found.');

  const datetime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MMMM dd, yyyy HH:mm");
  const validGsProductIds = getValidGsProductIds();

  const missingProducts = new Set();

  // Normalize gsproductid to string and trim whitespace before check
  const filteredData = data.filter(row => {
    const gsIdStr = (row.gsproductid || "").toString().trim();
    if (!gsIdStr || !validGsProductIds.has(gsIdStr)) {
      if (gsIdStr) missingProducts.add(gsIdStr);
      return false; // exclude this row
    }
    return true;
  });

  if (filteredData.length === 0) {
    throw new Error("❌ None of the gsproductid entries exist in Barcode SKU. Nothing to save.");
  }

  const enriched = filteredData.map(row => [
    generateLogId(),
    row.day,
    row.taskid,
    row.gsproductid,
    row.uom,
    row.quantity,
    employee,
    datetime
  ]);

  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, enriched.length, enriched[0].length).setValues(enriched);

  if (missingProducts.size > 0) {
    const missingList = Array.from(missingProducts).join(', ');
    return `⚠️ The following gsproductid(s) were not saved because they do not exist in Barcode SKU: ${missingList}`;
  } else {
    return "✅ All data saved successfully.";
  }
}

function fetchItemCodes() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Barcode SKU');
  const data = sheet.getRange('F2:F' + sheet.getLastRow()).getValues().flat().filter(Boolean);

  const countMap = {};
  for (const code of data) {
    countMap[code] = (countMap[code] || 0) + 1;
  }

  return countMap; // Send map like { "BOX_123456": 1, "123456": 1, ... }
}
