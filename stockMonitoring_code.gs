function onOpen() {
  SpreadsheetApp.getUi().createMenu('Inventory App')
    .addItem('Generate Inventory Balance', 'getInventorybalanceData') // ✅ Add function name
    .addItem('Open Stock Monitoring', 'openStockMonitoring')
    .addToUi();
}

function loadHtmlPage(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function openStockMonitoring() {
  const template = HtmlService.createHtmlOutputFromFile("stockMonitoring_ui")
    .setWidth(300);  // Sidebar max width is 300px
  SpreadsheetApp.getUi().showSidebar(template);
}

function getInventoryBalanceData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const inSheet = ss.getSheetByName("Inventory In");
  const outSheet = ss.getSheetByName("Inventory Out");
  const skuSheet = ss.getSheetByName("Barcode SKU");

  const inData = inSheet.getDataRange().getValues().slice(1);
  const outData = outSheet.getDataRange().getValues().slice(1);
  const skuData = skuSheet.getDataRange().getValues().slice(1);

  const todayStr = new Date().toISOString().slice(0, 10);
  const itemNameMap = {};
  const allCodes = new Set();

  // --- SKU reference mapping ---
  skuData.forEach(row => {
    const code = row[5]; // Column F = item_code
    const name = row[6]; // Column G = sku_name
    if (code) {
      itemNameMap[code] = name;
      allCodes.add(code);
    }
  });

  // Prefer BOX_ if both plain and BOX_ version exist
  function resolvePreferredCode(code) {
    if (allCodes.has("BOX_" + code)) return "BOX_" + code;
    return code;
  }

  const inMap = {}, outMap = {}, inTodayMap = {}, outTodayMap = {}, itemSet = new Set();

  // --- Inventory In ---
  inData.forEach(row => {
    const rawDate = row[7];    // Column H = datetime uploaded
    const rawCode = row[3];    // Column D = gsproductid
    const qty = Number(row[5]) || 0; // Column F = quantity
    if (!rawCode) return;

    const dateObj = new Date(rawDate);
    if (isNaN(dateObj)) return;

    const dateStr = dateObj.toISOString().slice(0, 10);
    const code = resolvePreferredCode(rawCode);

    inMap[code] = (inMap[code] || 0) + qty;
    if (dateStr === todayStr) inTodayMap[code] = (inTodayMap[code] || 0) + qty;

    itemSet.add(code);
  });

  // --- Inventory Out ---
  outData.forEach(row => {
    const rawDate = row[6];    // Assuming still Column G
    const rawCode = row[2];    // Assuming still Column C
    const qty = Number(row[4]) || 0; // Assuming still Column E
    if (!rawCode) return;

    const dateObj = new Date(rawDate);
    if (isNaN(dateObj)) return;

    const dateStr = dateObj.toISOString().slice(0, 10);
    const code = resolvePreferredCode(rawCode);

    outMap[code] = (outMap[code] || 0) + qty;
    if (dateStr === todayStr) outTodayMap[code] = (outTodayMap[code] || 0) + qty;

    itemSet.add(code);
  });

  // --- Final Output ---
  const result = [];
  itemSet.forEach(code => {
    const itemName = itemNameMap[code] || '';
    const totalInToday = inTodayMap[code] || 0;
    const totalOutToday = outTodayMap[code] || 0;
    const actualStock = (inMap[code] || 0) - (outMap[code] || 0);

    result.push([code, itemName, totalInToday, totalOutToday, actualStock]);
  });

  return result;
}