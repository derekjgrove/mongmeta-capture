
const conf = require("./../../conf.js")
const collStatsBO = require("./../../BOs/collStatsBO_sharded.js");
var shardHashMap = {}
var collections = []
const DELIM = "$$$$$"

var dbs = db.adminCommand({listDatabases: 1})
dbs.databases = dbs['databases'].filter(_db => !conf.RESERVED_DBS.includes(_db.name));

var db = db.getSiblingDB("admin");
var shards = db.runCommand({ listShards: 1 })
for (var _shard of shards.shards) {
    shardHashMap[_shard._id] = {tags: _shard.tags, primaryDBs: []}
}
shards = shards.shards.map((_shard) => _shard._id)
var status = Object.values(sh.status())[1]


for (var _db of dbs.databases) {
    var db = db.getSiblingDB(_db.name);
    var dbStatus = status.databases.find((_status => _status.database._id === _db.name))

    shardHashMap[dbStatus.database.primary].primaryDBs.push(_db.name)

    var colls = db.getCollectionInfos()
    colls = colls.filter(_coll => { 
        var splitColl = _coll.name.split('.')
        return !conf.RESERVED_COLLECTIONS.includes(splitColl[0])
    })

    for (var coll of colls) {
        if (coll.type !== "view") {
            var collStats = new collStatsBO.collStatsBO_sharded([_db.name, coll.name], shards, dbStatus, db.getCollection(coll.name).stats()) 
            collections.push(collStats)  
        }
    }
}

console.log("SHARD_DEFINITION")
for (var shardHashKey in shardHashMap) {
    console.log(`${shardHashKey}${DELIM}${shardHashMap[shardHashKey].tags}`)
}

console.log("SHARD_PRIMARY")
var table = [
    []
]
var colCount = -1
var maxColCount = Object.keys(shardHashMap).length
var maxRowCount = 0
for (var shardHashKey in shardHashMap) {
    ++colCount
    table[0].push(`${shardHashKey}`)
    var rowCount = 0
    for (var _db of shardHashMap[shardHashKey].primaryDBs) {
        ++rowCount
        if (table[rowCount]) {
            table[rowCount][colCount] = _db
        } else {
            var tempRow = []
            for (var i = 0; i < maxColCount; i++) {
                tempRow.push("")
            }
            tempRow[colCount] = _db
            table[rowCount] = tempRow
        }
    }

    if (rowCount < maxRowCount) {
        for (var j = rowCount+1; j <= maxRowCount; j++) {
            table[j][colCount] = ""
        }
    } else {
        maxRowCount = rowCount
    }
}
for (var row of table) {
    console.log(row.join(DELIM))
}

console.log("SHARD_COLLECTION")
for (var _collection of collections) {
    console.log(`${_collection.dbName}${DELIM}${_collection.collName}${DELIM}${_collection.sharded}${DELIM}${EJSON.stringify(_collection.shardKey)}${DELIM}${_collection.balancing}${DELIM}${EJSON.stringify(_collection.tags)}`)
}

console.log("SHARD_COLLECTION_SIZES")
for (var _collection of collections) {
    for (var shardKey in _collection.shards) {
        console.log(`${_collection.dbName}${DELIM}${_collection.collName}${DELIM}${shardKey}${DELIM}${_collection.shards[shardKey].count}${DELIM}${_collection.shards[shardKey].storageSize}${DELIM}${_collection.shards[shardKey].nindexes}${DELIM}${_collection.shards[shardKey].totalIndexSize}`)
    }
}