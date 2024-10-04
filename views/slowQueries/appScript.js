const COLLECTION_COL_MAPPER = {
    "DB Name": "dbName",
    "Collection Name": "name",
    "# Slow Queries": "count",
  }
  
  const TWO_COL_HEADERS = [
    "Key",
    "Value"
  ]
  
  const EXCLUDE_CMD_ATTR = [
    "shardVersion",
    "databaseVersion",
    "clientOperationKey",
    "lsid",
    "$clusterTime",
    "$configTime",
    "$topologyTime",
    "$audit",
    "runtimeConstants" 
  ]
  
  const INDEX_HEADERS = {
    "Namespace": "attr.ns",
    "App Name": "attr.appName",
    "Type": "attr.type",
    "Primary Op #": "primaryOpCount",
    "Secondary Op #": "secondaryOpCount",
    "Query Targeting": (dataObj) => {
      return {
        "keysExamined": dataObj['attr']['keysExamined'],
        "docsExamined": dataObj['attr']['docsExamined'],
        "nreturned": dataObj['attr']['nreturned']
      }
    },
    "Duration": "attr.durationMillis",
    "IP": "attr.remote",
    "Summary": "attr.planSummary",
    "Query": (dataObj) => {
      var tempObj =  dataObj['attr']['originatingCommand'] ? 
          dataObj['attr']['originatingCommand']
        : 
          dataObj['attr']['command']
  
      for (var excludeAttr of EXCLUDE_CMD_ATTR) {
        delete tempObj[excludeAttr]
      }
      return tempObj; 
    },
    "Performance Advisor": "performanceAdvisor"
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
    {"Namespace Summary": 1},
    {"Slow Queries": 2},
  ]
  
  
  function onOpen() {
    SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
        .createMenu('Custom Menu')
        .addItem('Import Slow Queries', 'importStatsDialogFromTable')
        .addToUi();
  }
  
  function importStatsDialogFromTable() {
    var sheet = SpreadsheetApp.getActive().getSheetByName('Paste Input Here')
    var cells = sheet.getRange("A2:A").getValues();
    cells = cells.filter(String);
    // importStatsOrchestrator(JSON.parse(cells.join('')))
    importStatsOrchestrator(cells)
  }
  
  
  function importStatsOrchestrator(slowQueries) {
  
    var collSummary = {}
  
    var i = 1
  
    var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets().map(_sheet => _sheet.getName());
  
    if (sheets.includes(Object.keys(SHEETS[1])[0])) {
      var sheet = SpreadsheetApp.getActive().getSheetByName(Object.keys(SHEETS[1])[0])
      var cells = sheet.getRange("A2:A").getValues();
      cells = cells.filter(String);
      if (cells.length < slowQueries.length) {
        slowQueries = slowQueries.slice(cells.length-1)
        i = cells.length
      }
    } else {
      createNewSheets()
      createTableHeader(0, COLLECTION_COL_MAPPER)
      createTableHeader(1, INDEX_HEADERS)
    }
  
    for (var slowQuery of slowQueries) {
      ++i
      var tempSlowQuery = Object.values(JSON.parse(slowQuery))[0]
      if (collSummary[tempSlowQuery['attr']['ns']]) {
        collSummary[tempSlowQuery['attr']['ns']] = collSummary[tempSlowQuery['attr']['ns']] + 1
      } else {
        collSummary[tempSlowQuery['attr']['ns']] = 1
      }
  
      createSlowQueryTablenReturnSummary(tempSlowQuery, i, 1)
    }
  
  }
  
  
  function createSlowQueryTablenReturnSummary(slowQueryObject, rowCount, sheetRef) {
    
    var sheet = SpreadsheetApp.getActive().getSheetByName(Object.keys(SHEETS[sheetRef])[0])
    var body = sheet.getRange(rowCount, 1, 1, Object.keys(INDEX_HEADERS).length)  
  
    return createDataRowHelper_colHeader(INDEX_HEADERS, body, slowQueryObject, true)
  
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
      var dataObjKey = columns[colKey]
      var tmpData = ""
  
      if (typeof dataObjKey === "function") {
        tmpData = dataObjKey(dataObj)
      } else if (dataObjKey.includes(".")) {
        tmpData = dataObjKey.split('.').reduce((prev, cur) => prev[cur], dataObj) || ""
      } else {
        tmpData = dataObj[dataObjKey] || ""
      }
  
      if (typeof tmpData === "object") {
        td.push(JSON.stringify(tmpData, null, 2))
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
          dataObj[dataObjKey]
        )
      }
    }
  
    tr.push(td)
    table.setValues(tr)
    table.setTextStyle(CONTENT_STYLE)
  
  
    return summaryRow
  }