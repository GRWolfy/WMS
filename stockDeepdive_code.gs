function getFilteredStockInData(startDate, endDate, itemCode, itemName, employee) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Inventory In');
  const skuSheet = ss.getSheetByName('Barcode SKU');

  if (!sheet || !skuSheet) return [];

  const data = sheet.getDataRange().getValues();
  const skuData = skuSheet.getDataRange().getValues();

  const skuMap = {};
  skuData.slice(1).forEach(row => {
    skuMap[row[5]] = row[6];
  });

  const filtered = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const logid = row[0];          // column A - fetched but not displayed
    const groWMSDateRaw = row[1];  // Date (groWMS)
    const uploadDateRaw = row[7];  // Date time uploaded
    const code = row[3];           // gsproductid
    const qty = row[5];            // quantity
    const emp = row[6] || '';      // employee

    if (!groWMSDateRaw) continue;
    const groWMSDate = new Date(groWMSDateRaw);
    if (isNaN(groWMSDate)) continue;

    if (groWMSDate < start || groWMSDate > end) continue;

    if (itemCode && !code.toString().toLowerCase().includes(itemCode.toLowerCase())) continue;
    if (itemName && !skuMap[code]?.toLowerCase().includes(itemName.toLowerCase())) continue;
    if (employee && !emp.toLowerCase().includes(employee.toLowerCase())) continue;

    filtered.push({
      logid,  // stored but not used in display
      groWMSDateFormatted: Utilities.formatDate(groWMSDate, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
      uploadDateFormatted: uploadDateRaw ? Utilities.formatDate(new Date(uploadDateRaw), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss') : '',
      groWMSDate,
      code,
      itemName: skuMap[code] || '',
      emp,
      qty
    });
  }

  filtered.sort((a, b) => b.groWMSDate - a.groWMSDate);

  // Return without logid in displayed data array (but logid is inside the objects for your use)
  return filtered.map(row => [
    row.groWMSDateFormatted,  // Date (groWMS)
    row.uploadDateFormatted,  // Date Time (uploaded)
    row.code,
    row.itemName,
    row.emp,
    row.qty
  ]);
}


function getFilteredStockOutData(startDate, endDate, itemCode, itemName, employee) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Inventory Out');
  const skuSheet = ss.getSheetByName('Barcode SKU');

  if (!sheet || !skuSheet) return [];

  const data = sheet.getDataRange().getValues();
  const skuData = skuSheet.getDataRange().getValues();

  // Map item codes to item names from Barcode SKU sheet
  const skuMap = {};
  skuData.slice(1).forEach(row => {
    skuMap[row[5]] = row[6];
  });

  const filtered = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const logid = row[0];           // A
    const uploadDateRaw = row[6];   // G - Datetime uploaded (actual date for filtering)
    const code = row[2];            // C - item code
    const qty = row[4];             // E - quantity
    const emp = row[5] || '';       // F - employee name

    if (!uploadDateRaw) continue;
    const uploadDate = new Date(uploadDateRaw);
    if (isNaN(uploadDate)) continue;

    if (uploadDate < start || uploadDate > end) continue;

    if (itemCode && !code.toString().toLowerCase().includes(itemCode.toLowerCase())) continue;
    if (itemName && !skuMap[code]?.toLowerCase().includes(itemName.toLowerCase())) continue;
    if (employee && !emp.toLowerCase().includes(employee.toLowerCase())) continue;

    filtered.push({
      logid,
      groWMSDateFormatted: Utilities.formatDate(uploadDate, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
      uploadDateFormatted: Utilities.formatDate(uploadDate, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
      groWMSDate: uploadDate,
      code,
      itemName: skuMap[code] || '',
      emp,
      qty
    });
  }

  filtered.sort((a, b) => b.groWMSDate - a.groWMSDate);

  return filtered.map(row => [
    row.groWMSDateFormatted,  // Used as the main timestamp column
    row.code,
    row.itemName,
    row.emp,
    row.qty
  ]);
}
