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
  "Name": "name",
  "Type": "type",
  "# Documents": "count",
  "Avg Doc Size (KB)": "avgObjSize",
  "Uncompressed Size (MB)": "size",
  "Compressed Size (MB)": "storageSize",
  "# Indexes": "nindexes",
  "Index Size (MB)": "totalIndexSize",
  "Additional Conf": "options",
  "Ops Usage From Date": "since",
}

const TWO_COL_HEADERS = [
  "Key",
  "Value"
]

const INDEX_HEADERS = [
  "Name",
  "Type",
  "Size (MB)",
  "# Primary Ops",
  "# Secondary Ops",
  "Key",
  "Options"
]

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
  "Options": {
    input: "options",
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

const HEADER_ROW_STYLE = {
  [DocumentApp.Attribute.FONT_FAMILY]: "Lexend Deca;700",
  [DocumentApp.Attribute.FONT_SIZE]: 10,
  [DocumentApp.Attribute.FOREGROUND_COLOR]: "#001E2B"
}

const HEADER_ROW_BACKGROUND_COLOR = "#00ED64"

const CODE_STYLE = {
  [DocumentApp.Attribute.FONT_FAMILY]: "Consolas;300",
}

const TABLE_ROW_ERR_STYLE = {
  [DocumentApp.Attribute.FOREGROUND_COLOR]: "#970606"
}


function onOpen() {
  DocumentApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
      .createMenu('Custom Menu')
      // .addItem('Import Cluster Stats', 'importStatsDialog')
      .addItem('Import Cluster Stats', 'importStatsDialogFromTable')
      .addToUi();
}

function importStatsDialog() {
  var ui = DocumentApp.getUi(); // Same variations.
  var result = ui.prompt(
      'Import',
      'Paste output from cluster stats script:',
      ui.ButtonSet.OK_CANCEL);

  // Process the user's response.
  var button = result.getSelectedButton();
  var text = result.getResponseText();
  
  if (button == ui.Button.OK) {
    // User clicked "OK".
    importStatsOrchestrator(JSON.parse(text))
  } else if (button == ui.Button.CANCEL) {
    // User clicked "Cancel".
    
  } else if (button == ui.Button.CLOSE) {
    // User clicked X in the title bar.
    
  }
}

function importStatsDialogFromTable() {
  var body = DocumentApp.getActiveDocument().getBody();
  var table = body.getTables()[0];
  var cell = table.getCell(1,0);
  importStatsOrchestrator(JSON.parse(cell.getText()))
}


function importStatsOrchestrator(clusterStats) {

  var dbSummaryTable = [Object.keys(DB_COL_MAPPER)]

  var i = 0
  for (var dbObject of clusterStats) {
    ++i
    dbSummaryTable.push(createDBTablenReturnSummary(dbObject, i, j))

    var j = 1
    var collSummaryTable = [Object.keys(COLLECTION_COL_MAPPER)]
    for (var collObject of dbObject.collectionsMetrics) {
      ++j
      collSummaryTable.push(createCollTablenReturnSummary(collObject, i, j))
      createIndexesTable(collObject.indexes, i, j)
      createSampleDataTable({sampleDoc: collObject.sampleDoc}, i, j)
      DocumentApp.getActiveDocument().saveAndClose()
    }
  }

}

function createHeaderRowHelper(headers, tr) {
  tr.setAttributes(HEADER_ROW_STYLE)
  for (var header of headers) {
    tr.appendTableCell(header)
      .setBackgroundColor(HEADER_ROW_BACKGROUND_COLOR)
  }
}

function createDataRowHelper_colHeader(columns, table, dataObj, isSummary = false) {
  var summaryRow = []
  
  for (var colKey in columns) {

    var tr = table.appendTableRow()
    tr.setAttributes(TABLE_STYLE)
    tr.appendTableCell(colKey)

    var tmpData = dataObj[columns[colKey]] || ""
    if (typeof tmpData === "object") {
      tr.appendTableCell(JSON.stringify(tmpData, null, 2))
        .setAttributes(CODE_STYLE)
    } else if (tmpData == null || tmpData === undefined) {
      tr.appendTableCell("null")
    } else if (typeof tmpData === "number") {
      var tempNum = Number(tmpData)
      tr.appendTableCell(tempNum%1 > 0 ? tempNum.toFixed(4) : tempNum.toFixed(0) || 0)
    } else {
      tr.appendTableCell(tmpData)
    }

    if (isSummary == true) {
      summaryRow.push(
        dataObj[columns[colKey]]
      )
    }
  }

  return summaryRow
}

function createDataRowHelper(columns, table, dataObj) {
  var tr = table.appendTableRow()
  tr.setAttributes(TABLE_STYLE)
  
  for (var colKey in columns) {
    var tmpData = dataObj[columns[colKey]] || ""
    if (typeof tmpData === "object") {
      tr.appendTableCell(JSON.stringify(tmpData, null, 2))
        .setAttributes(CODE_STYLE)
    } else if (tmpData == null || tmpData === undefined) {
      tr.appendTableCell("null")
    } else if (typeof tmpData === "number") {
      var tempNum = Number(tmpData)
      tr.appendTableCell(tempNum%1 > 0 ? tempNum.toFixed(4) : tempNum.toFixed(0) || 0)
    } else {
      tr.appendTableCell(tmpData)
    }
  }

  return
}

function createDataRowHelper_Index(columns, table, dataObj) {
  var tr = table.appendTableRow()
  tr.setAttributes(TABLE_STYLE)
  
  for (var colKey in columns) {
    var tmpData = dataObj[columns[colKey]["input"]] || ""

    if (columns[colKey]["autoMap"] == true) {
      var cell
      if (typeof tmpData === "object") {
        cell = tr.appendTableCell(JSON.stringify(tmpData, null, 2))
          .setAttributes(CODE_STYLE)
      } else if (tmpData == null || tmpData === undefined) {
        cell = tr.appendTableCell("null")
      } else if (typeof tmpData === "number") {
        var tempNum = Number(tmpData)
        cell = tr.appendTableCell(tempNum%1 > 0 ? tempNum.toFixed(4) : tempNum.toFixed(0) || 0)
      } else {
        cell = tr.appendTableCell(tmpData)
      }
      cell.setWidth(columns[colKey]["size"])
    } else {
      switch (columns[colKey]["input"]) {
        case "duplicate":
          tmpData == true && tr.setAttributes(TABLE_ROW_ERR_STYLE)
          break;
      }
    }

  }

  return
}

function createDBTablenReturnSummary(dbObject, dbCount) {
  
  var body = DocumentApp.getActiveDocument().getBody();
  

  var header = body.appendParagraph(`${dbCount} [DB] ${dbObject.name}`);
  header.setHeading(DocumentApp.ParagraphHeading.HEADING1);

  var header2 = body.appendParagraph(`${dbCount}.1 DB Details`);
  header2.setHeading(DocumentApp.ParagraphHeading.HEADING2);

  var table = body.appendTable()
  table.setAttributes(TABLE_STYLE)

  var tHeader = table.appendTableRow()
  createHeaderRowHelper(TWO_COL_HEADERS, tHeader)

  return createDataRowHelper_colHeader(DB_COL_MAPPER, table, dbObject, true)
}

function createCollTablenReturnSummary(collObject, dbCount, collCount) {
  
  var body = DocumentApp.getActiveDocument().getBody();

  var collType = collObject.type
  collType = collType.charAt(0).toUpperCase() + collType.slice(1)
  var header2 = body.appendParagraph(`${dbCount}.${collCount} [${collType}] ${collObject.name}`);
  header2.setHeading(DocumentApp.ParagraphHeading.HEADING2);

  var header3 = body.appendParagraph(`${dbCount}.${collCount}.1 Collection Details`);
  header3.setHeading(DocumentApp.ParagraphHeading.HEADING3);

  var table = body.appendTable()
  table.setAttributes(TABLE_STYLE)

  var tHeader = table.appendTableRow()
  createHeaderRowHelper(TWO_COL_HEADERS, tHeader)

  return createDataRowHelper_colHeader(COLLECTION_COL_MAPPER, table, collObject, true)
}

function createIndexesTable(indexesArr = [], dbCount, collCount) {
  var body = DocumentApp.getActiveDocument().getBody();

  var header3 = body.appendParagraph(`${dbCount}.${collCount}.2 Index Details`);
  header3.setHeading(DocumentApp.ParagraphHeading.HEADING3);

  var table = body.appendTable()
  table.setAttributes(TABLE_STYLE)

  var tHeader = table.appendTableRow()
  createHeaderRowHelper(INDEX_HEADERS, tHeader)

  for (var inxObject of indexesArr) {
    createDataRowHelper_Index(INDEX_COL_MAPPER, table, inxObject)
  }

}

function createSampleDataTable(sampleDocObject, dbCount, collCount) {
  var body = DocumentApp.getActiveDocument().getBody();

  var header3 = body.appendParagraph(`${dbCount}.${collCount}.3 Document Details`);
  header3.setHeading(DocumentApp.ParagraphHeading.HEADING3);

  var table = body.appendTable()
  table.setAttributes(TABLE_STYLE)

  var tHeader = table.appendTableRow()
  createHeaderRowHelper(DOC_HEADERS, tHeader)

  createDataRowHelper(DOC_COL_MAPPER, table, sampleDocObject)

}
