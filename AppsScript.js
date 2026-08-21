// ==================================================
// COCKTAIL DANIEL SRL - Google Apps Script API
// ==================================================
// Incolla questo codice in: Estensioni → Apps Script
// Poi fai: Esegui → Distribuisci → Nuova distribuzione
// Tipo: App web | Esecuzione come: Me | Chi ha accesso: Chiunque
// ==================================================

function doGet(e) {
  var action = e.parameter.action;

  if (action === 'read') {
    return readOrders();
  }

  return ContentService
    .createTextOutput(JSON.stringify({ error: 'Azione non valida' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var action = data.action;

  if (action === 'add') {
    return addOrder(data.order);
  }

  if (action === 'clear') {
    return clearOrders();
  }

  return ContentService
    .createTextOutput(JSON.stringify({ error: 'Azione non valida' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function readOrders() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var orders = [];

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === '' || data[i][0] === null) continue;
    orders.push({
      id: data[i][0],
      customerName: data[i][1],
      cocktail: data[i][2],
      variant: data[i][3],
      location: data[i][4],
      time: data[i][5],
      orderTime: data[i][6],
      orderDate: data[i][7],
      notes: data[i][8],
      price: data[i][9]
    });
  }

  return ContentService
    .createTextOutput(JSON.stringify({ success: true, orders: orders }))
    .setMimeType(ContentService.MimeType.JSON);
}

function addOrder(order) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.appendRow([
    order.id,
    order.customerName,
    order.cocktail,
    order.variant,
    order.location,
    order.time,
    order.orderTime,
    order.orderDate,
    order.notes,
    order.price
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function clearOrders() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
