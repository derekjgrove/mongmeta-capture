const INFO_MAPPER = {
  "Message": "name"
}

const DB_COL_MAPPER = {
  "Name": "name",
  "# Collections": "collections",
  "# Views": "views",
  "# Documents": "objects",
  "Uncompressed Size (GB)": "dataSize",
  "Compressed Size (GB)": "storageSize",
  "# Indexes": "indexes",
  "Index Size (GB)": "indexSize",
  "% Disk Allocation": "diskPercentageUsed"
}

const COLLECTION_COL_MAPPER = {
  "DB Name": "dbName",
  "Name": "name",
  "Type": "type",
  "# Documents": "count",
  "Avg Doc Size (KB)": "avgObjSize",
  "Uncompressed Size (MB)": "size",
  "Compressed Size (MB)": "storageSize",
  "Fragmented Storage (MB)": "freeStorageSize",
  "# Indexes": "nindexes",
  "Index Size (MB)": "totalIndexSize",
  "Fragmented Index Size (MB)": "indexFreeStorageSize",
  "Ops Usage From Date": "since",
  "Additional Conf": "options",
}

const TWO_COL_HEADERS = [
  "Key",
  "Value"
]

  const INDEX_HEADERS = {
    "DB Name": "dbName",
    "Collection Name": "collName",
    "Name": "name",
    "Type": "type",
    "Size (MB)": "indexSize",
    "Fragmented Size (MB)": "indexFreeStorageSize",
    "# Primary Ops": "primaryOps",
    "# Secondary Ops": "secondaryOps",
    "Key": "key",
    "Options": "options",
    "isDuplicate": "duplicate"
  }

const INDEX_COL_MAPPER = {
  "Name": {
    input: "name",
    autoMap: true,
    size: 200
  },
  "Type": {
    input: "type",
    autoMap: true,
    size: 50
  },
  "Size (MB)": {
    input: "indexSize",
    autoMap: true,
    size: 50
  },
  "Fragmented Size (MB)": {
    input: "indexFreeStorageSize",
    autoMap: true,
    size: 50
  },
  "# Primary Ops": {
    input: "primaryOps",
    autoMap: true,
    size: 75
  },
  "# Secondary Ops": {
    input: "secondaryOps",
    autoMap: true,
    size: 80
  },
  "Key": {
    input: "key",
    autoMap: true,
    size: 300
  },
  "duplicate": {
    input: "duplicate",
    autoMap: false,
    size: null
  },
}

const DOC_HEADERS = [
  "Sample Doc"
]

const DOC_COL_MAPPER = {
  "Sample Doc": "sampleDoc"
}

const TABLE_STYLE = {
  [DocumentApp.Attribute.BORDER_COLOR]: "#001E2B",
  [DocumentApp.Attribute.FONT_FAMILY]: "Lexend Deca;300",
  [DocumentApp.Attribute.FONT_SIZE]: 8,
  [DocumentApp.Attribute.FOREGROUND_COLOR]: "#001E2B"
}

const HEADER_ROW_STYLE = SpreadsheetApp.newTextStyle()
  .setFontFamily("Lexend Deca")
  .setFontSize(10)
  .setForegroundColor("#001E2B")
  .setBold(true)
  .build();

const HEADER_ROW_BACKGROUND_COLOR = "#00ED64"

const CONTENT_STYLE = SpreadsheetApp.newTextStyle()
  .setFontFamily("Roboto Mono")
  .setFontSize(10)
  .setForegroundColor("#001E2B")
  .build();

const CODE_STYLE = {
  [DocumentApp.Attribute.FONT_FAMILY]: "Consolas;300",
}

const TABLE_ROW_ERR_STYLE = {
  [DocumentApp.Attribute.FOREGROUND_COLOR]: "#970606"
}

const SHEETS = [
  {"Info": 1},
  {"DB Stats": 1},
  {"Collection Stats": 2},
  {"Index Stats": 2},
  // {"ALL Stats": 2}
]


function onOpen() {
  SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
      .createMenu('Custom Menu')
      .addItem('Import Cluster Stats', 'importStatsDialogFromTable')
      .addToUi();
}

function importStatsDialogFromTable() {
  var sheet = SpreadsheetApp.getActive().getSheetByName('Paste Input Here')
  var cells = sheet.getRange("A2:A").getValues();
  cells = cells.filter(String);
  importStatsOrchestrator(cells)
}


function importStatsOrchestrator(clusterStats) {

  var dbSummaryTable = [Object.keys(DB_COL_MAPPER)]

  createNewSheets()
  createTableHeader(0, INFO_MAPPER)
  createTableHeader(1, DB_COL_MAPPER)
  createTableHeader(2, COLLECTION_COL_MAPPER)
  createTableHeader(3, INDEX_HEADERS)

  var x = 1
  var i = 1
  var j = 1
  var k = 1

  for (var obj of clusterStats) {
    obj = JSON.parse(obj)
    console.log(obj)
    if (obj.level === "info") {
      ++x
      createInfoTablenReturnSummary(obj, x, 0)
    } else if (obj.level === "db") {
      ++i
      dbSummaryTable.push(createDBTablenReturnSummary(obj, i, 1, j))
    } else {
      var collSummaryTable = [Object.keys(COLLECTION_COL_MAPPER)]
      ++j
      collSummaryTable.push(createCollTablenReturnSummary({dbName: obj.db, ...obj}, i, 2, j))
      var inxCount = createIndexesTable({dbName: obj.db, ...obj}, k, 3, j)
      k = k + inxCount
      // DocumentApp.getActiveDocument().saveAndClose()
    }
  }

}

function createIndexesTable(collObject, inxCount, sheetRef) {
  var i = 0
  
  if (collObject.type !== "view") {
    var sheet = SpreadsheetApp.getActive().getSheetByName(Object.keys(SHEETS[sheetRef])[0])

    for (var inxObj of collObject.indexes) {
      
      ++i
      var body = sheet.getRange(inxCount+i, 1, 1, Object.keys(INDEX_HEADERS).length)  
      var res = createDataRowHelper_colHeader(INDEX_HEADERS, body, {dbName: collObject.dbName, collName: collObject.name, ...inxObj}, true)
    }
  }

  return i
}

function createCollTablenReturnSummary(collObject, dbCount, sheetRef, collCount) {
  
  var sheet = SpreadsheetApp.getActive().getSheetByName(Object.keys(SHEETS[sheetRef])[0])
  var body = sheet.getRange(collCount, 1, 1, Object.keys(COLLECTION_COL_MAPPER).length)  

  return createDataRowHelper_colHeader(COLLECTION_COL_MAPPER, body, collObject, true)

}


function createNewSheets() {
  var ss = SpreadsheetApp.getActive();
  for (var _sheet of SHEETS) {
    ss.insertSheet(Object.keys(_sheet)[0]);
    var sheet = ss.getSheetByName(Object.keys(_sheet)[0])
    var range = sheet.getRange("A1");
    range.setValue("dummyValue")
  }
}

function createTableHeader(sheetRef, headers) {
  var sheet = SpreadsheetApp.getActive().getSheetByName(Object.keys(SHEETS[sheetRef])[0])
  var body = sheet.getRange(1, 1, 1, Object.keys(headers).length)
  body.setValues([
    Object.keys(headers)
  ])
  body.setBackground(HEADER_ROW_BACKGROUND_COLOR);
  body.setTextStyle(HEADER_ROW_STYLE);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(Object.values(SHEETS[sheetRef])[0]);
}

function createInfoTablenReturnSummary(infoObject, infoCount, sheetRef) {
  var sheet = SpreadsheetApp.getActive().getSheetByName(Object.keys(SHEETS[sheetRef])[0])
  var body = sheet.getRange(infoCount, 1, 1, Object.keys(INFO_MAPPER).length)  

  return createDataRowHelper_colHeader(INFO_MAPPER, body, infoObject, true)
}


function createDBTablenReturnSummary(dbObject, dbCount, sheetRef) {
  var sheet = SpreadsheetApp.getActive().getSheetByName(Object.keys(SHEETS[sheetRef])[0])
  var body = sheet.getRange(dbCount, 1, 1, Object.keys(DB_COL_MAPPER).length)  

  return createDataRowHelper_colHeader(DB_COL_MAPPER, body, dbObject, true)
}


function createDataRowHelper_colHeader(columns, table, dataObj, isSummary = false) {
  var summaryRow = []

  var tr = []
  var td = []
  for (var colKey in columns) {


    var tmpData = dataObj[columns[colKey]] || ""
    if (typeof tmpData === "object") {
      td.push(JSON.stringify(tmpData))
    } else if (tmpData == null || tmpData === undefined) {
      td.push("null")
    } else if (typeof tmpData === "number") {
      var tempNum = Number(tmpData)
      td.push(tempNum%1 > 0 ? tempNum.toFixed(4) : tempNum.toFixed(0) || 0)
    } else {
      td.push(tmpData)
    }

    if (isSummary == true) {
      summaryRow.push(
        dataObj[columns[colKey]]
      )
    }
  }

  tr.push(td)
  table.setValues(tr)
  table.setTextStyle(CONTENT_STYLE)


  return summaryRow
}