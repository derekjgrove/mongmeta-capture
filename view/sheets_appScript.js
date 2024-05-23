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
    "# Indexes": "nindexes",
    "Index Size (MB)": "totalIndexSize",
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
    {"DB Stats": 1},
    {"Collection Stats": 2},
    {"Index Stats": 2},
    {"ALL Stats": 2}
  ]
  
  
  function onOpen() {
    SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
        .createMenu('Custom Menu')
        .addItem('Import Cluster Stats', 'importStatsDialogFromTable')
        .addToUi();
  }
  
  function importStatsDialogFromTable() {
    var sheet = SpreadsheetApp.getActive().getSheetByName('Paste Input Here')
    var cell = sheet.getRange("A2")
    importStatsOrchestrator(JSON.parse(cell.getValue()))
  }
  
  
  function importStatsOrchestrator(clusterStats) {
  
    var dbSummaryTable = [Object.keys(DB_COL_MAPPER)]
  
    createNewSheets()
    createTableHeader(0, DB_COL_MAPPER)
    createTableHeader(1, COLLECTION_COL_MAPPER)
    createTableHeader(2, INDEX_HEADERS)
  
    var i = 1
    var j = 1
    var k = 1
  
    for (var dbObject of clusterStats) {
      ++i
      dbSummaryTable.push(createDBTablenReturnSummary(dbObject, i, 0, j))
  
      var collSummaryTable = [Object.keys(COLLECTION_COL_MAPPER)]
      for (var collObject of dbObject.collectionsMetrics) {
        ++j
        collSummaryTable.push(createCollTablenReturnSummary({dbName: dbObject.name, ...collObject}, i, 1, j))
        var inxCount = createIndexesTable({dbName: dbObject.name, ...collObject}, k, 2, j)
        k = k + inxCount
        // DocumentApp.getActiveDocument().saveAndClose()
      }
    }
  
  }
  
  function createIndexesTable(collObject, inxCount, sheetRef) {
    
    var sheet = SpreadsheetApp.getActive().getSheetByName(Object.keys(SHEETS[sheetRef])[0])
  
    var i = 0
    for (var inxObj of collObject.indexes) {
      
      ++i
      var body = sheet.getRange(inxCount+i, 1, 1, Object.keys(INDEX_HEADERS).length)  
      var res = createDataRowHelper_colHeader(INDEX_HEADERS, body, {dbName: collObject.dbName, collName: collObject.name, ...inxObj}, true)
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