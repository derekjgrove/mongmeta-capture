const clusterStats = [/* res from main.js */]
let res = {}
const DELIM = "$$$$$"

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
    "Fragmented Storage (MB)": "storageReclaimable",
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
  
  
  const SHEETS = [
    {"DB Stats": 1},
    {"Collection Stats": 2},
    {"Index Stats": 2},
  ]
  
  function importStatsOrchestrator() {
  
    var dbSummaryTable = [Object.keys(DB_COL_MAPPER)]
  
    createNewSheets()
    createTableHeader(0, DB_COL_MAPPER)
    createTableHeader(1, COLLECTION_COL_MAPPER)
    createTableHeader(2, INDEX_HEADERS)
    
    var k = 1
  
    for (var obj of clusterStats) {
    //   obj = JSON.parse(obj)
      if (obj.level === "db") {
        dbSummaryTable.push(createDBTablenReturnSummary(obj, 0))
      } else {
        var collSummaryTable = [Object.keys(COLLECTION_COL_MAPPER)]
        collSummaryTable.push(createCollTablenReturnSummary({dbName: obj.db, ...obj}, 1))
        var inxCount = createIndexesTable({dbName: obj.db, ...obj}, 2)
        k = k + inxCount
      }

    }
  
  }
  
  function createIndexesTable(collObject, sheetRef) {
    
    if (collObject.type !== "view") {
  
      for (var inxObj of collObject.indexes) { 
        res[Object.keys(SHEETS[sheetRef])[0]].push(createDataRowHelper_colHeader(INDEX_HEADERS, {dbName: collObject.dbName, collName: collObject.name, ...inxObj}))
      }
    }
  
    return
  }
  
  function createCollTablenReturnSummary(collObject, sheetRef) {
    res[Object.keys(SHEETS[sheetRef])[0]].push(createDataRowHelper_colHeader(COLLECTION_COL_MAPPER, collObject))
    return
  }
  
  
  function createNewSheets() {
    for (var _sheet of SHEETS) {
      res[Object.keys(_sheet)[0]] = []
    }
  }
  
  function createTableHeader(sheetRef, headers) {
    res[Object.keys(SHEETS[sheetRef])[0]].push(Object.keys(headers).join(DELIM))
  }
  
  
  function createDBTablenReturnSummary(dbObject, sheetRef) {
      res[Object.keys(SHEETS[sheetRef])[0]].push(createDataRowHelper_colHeader(DB_COL_MAPPER, dbObject))
      return
  }
  
  
  function createDataRowHelper_colHeader(columns, dataObj) {
  
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

    }
  
    return td.join(DELIM)

  }

  importStatsOrchestrator()

  for (var sheet in res) {
    console.log(`---------------------${sheet}---------------------`)
    for (var row of res[sheet]){
        console.log(row)
    }
  }
