function doGet(e) {
  const page = e.parameter.page || "mainpage_ui"; // default to main page
  const title = (page === "stockOut_ui") ? "Stock Out Form" : "Growsari CB Inventory";
  return HtmlService.createTemplateFromFile(page)
    .evaluate()
    .setTitle(title)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function loadHtmlPage(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function showMainPage() {
  const html = HtmlService.createTemplateFromFile("mainpage_ui").evaluate()
    .setWidth(800)
    .setHeight(500);
  SpreadsheetApp.getUi().showModalDialog(html, "📦 Growsari CB Inventory");
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}