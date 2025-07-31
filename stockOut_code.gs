function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Inventory App")
    .addItem("Open Stock Out Form", "openStockOutForm")
    .addToUi();
}

function openStockOutForm() {
  const html = HtmlService.createHtmlOutputFromFile('stock_out_form')
    .setWidth(800)
    .setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(html, 'Stock Out Form');
}

function loadMainPage() {
  return HtmlService.createHtmlOutputFromFile('mainpage_ui').getContent();
}

function stock_out(barcode, quantity, employeeName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Inventory Out');
  const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  const datetime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MMMM dd, yyyy HH:mm");
  const out = "Out";

  sheet.appendRow([uniqueId, out, barcode, quantity, employeeName, datetime]);
  return 'Success';
}

function generateLogId() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 10); // 8 chars random
  return timestamp + randomStr;
}

function saveMultipleStockOut(dataArray) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Inventory Out');
  const timezone = Session.getScriptTimeZone();

  const rows = dataArray.map(row => {
    return [
      generateLogId(),
      "Out",
      row.item_code,
      row.barcode,
      row.quantity,
      row.employee,
      Utilities.formatDate(new Date(), timezone, "MMMM dd, yyyy HH:mm")
    ];
  });

  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  return 'Success';
}

function getEmployeeNameByGSID(gsid) {
  Logger.log("Looking up GSID: " + gsid);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Employee GSID');
  if (!sheet) return '';

  const data = sheet.getDataRange().getValues();
  gsid = gsid.toString().trim().toUpperCase();

  for (let i = 1; i < data.length; i++) {
    const rowGSID = (data[i][0] || '').toString().trim().toUpperCase();
    if (gsid === rowGSID) {
      Logger.log("Match found. Employee Name: " + data[i][1]);
      return data[i][1] || '';
    }
  }

  Logger.log("No match found for GSID.");
  return '';
}

function getItemCodeFromBarcode(barcode) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Barcode SKU');
  if (!sheet) return {};

  const data = sheet.getDataRange().getValues();
  const searchBarcode = barcode.toString().trim().toUpperCase();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const barcode1 = (row[2] || '').toString().trim().toUpperCase(); // Column C
    const barcode2 = (row[3] || '').toString().trim().toUpperCase(); // Column D
    const barcode3 = (row[4] || '').toString().trim().toUpperCase(); // Column E

    if ([barcode1, barcode2, barcode3].includes(searchBarcode)) {
      return {
        item_code: row[5],   // Column F
        sku_name: row[6]     // Column G
      };
    }
  }

  return {}; // No match
}

function cleanBarcodes(barcode) {
  if (typeof barcode === 'string' && barcode.startsWith('0')) {
    return barcode.substring(1);
  }
  return barcode;
}