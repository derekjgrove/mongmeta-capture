const SCALE_KB = 1024
const SCALE_MB = 1024*1024
const SCALE_GB = 1024*1024*1024
const RESERVED_DBS = [
    "admin",
    "config",
    "local"
]
const RESERVED_COLLECTIONS = [
    "system"
    // "system.views",
    // "system.profile"
]
const RESERVED_OPS = [
    "command",
    "getMore"
]
const OUTPUT_STYLES = {
    th_line: "---------------------------------------------------------"
}

const DELIM = ";"

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

  const INDEX_HEADERS = {
    "Name": "name",
    "Type": "type",
    "Size (MB)": "indexSize",
    "# Primary Ops": "primaryOps",
    "# Secondary Ops": "secondaryOps",
    "Key": "key",
    "Options": "options",
    "isDuplicate": "duplicate"
  }

  
module.exports = {
    SCALE_KB,
    SCALE_MB,
    SCALE_GB,
    RESERVED_DBS,
    RESERVED_COLLECTIONS,
    OUTPUT_STYLES,
    DELIM,
    DB_COL_MAPPER,
    COLLECTION_COL_MAPPER,
    INDEX_HEADERS
}