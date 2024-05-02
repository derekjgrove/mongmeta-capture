const collStatsBO = require("./../BOs/collStatsBO.js");
const dbStatsBO = require("./../BOs/dbStatsBO.js");
const getCollectionInfosBO = require("./../BOs/getCollectionInfosBO.js");
const getIndexesBO = require("./../BOs/getIndexesBO.js")
const indexStatsBO = require("./../BOs/indexStatsBO.js")
const conf = require("./../conf.js")

var ret = []

if (!allowSampleDoc) {
    print("allowSampleDoc is unset or false, if you want to sample documents pleas add the eval option")
    print("--eval 'var allowSampleDoc = true'")
}

var serverInfo = db.serverBuildInfo()

var dbs = db.adminCommand({listDatabases: 1})
dbs.databases = dbs['databases'].filter(_db => !conf.RESERVED_DBS.includes(_db.name));
    // totalSize: Long("20593246208"),
    // totalSizeMb: Long("19639"),


for (var _db of dbs.databases) {
    var db = db.getSiblingDB(_db.name);
    var dbStats = new dbStatsBO.dbStatsBO(db.runCommand( { dbStats: 1 } ))
    var colls = db.getCollectionInfos()
    colls = colls.filter(_coll => { 
        var splitColl = _coll.name.split('.')
        return !conf.RESERVED_COLLECTIONS.includes(splitColl[0])
    })
    
    for (var coll of colls) {
        var collectionInfo = new getCollectionInfosBO.getCollectionInfoBO(coll)

        if (collectionInfo.type !== "view") {
            var indexDefinitions = new getIndexesBO.getIndexesBO(db.getCollection(coll.name).getIndexes())
            var searchStats = []
            if (collectionInfo.type !== "timeseries" && serverInfo.versionArray[0] >= 6)  {
                searchStats = db.getCollection(coll.name).aggregate([ { $listSearchIndexes: {} }, {$project: {name: 1, type: 1, key: "$latestDefinition", indexSize: {$toInt: false}}}]).toArray()
            }
            
            var primaryIndexStats = new indexStatsBO.indexStatsBO(db.getCollection(coll.name).aggregate([{$indexStats:{}}], {readPreference: "primary" }).toArray())
            var secondaryIndexStats = new indexStatsBO.indexStatsBO(db.getCollection(coll.name).aggregate([{$indexStats:{}}], {readPreference: "secondary" }).toArray())
            console.log(coll.name)
            var collStats = new collStatsBO.collStatsBO(db.getCollection(coll.name).stats(), indexDefinitions.indexes, primaryIndexStats.indexStats, secondaryIndexStats.indexStats)
            collectionInfo.indexes = [...Object.keys(collStats.indexes).map((key) => ({"name": key, ...collStats.indexes[key]})), ...searchStats]
            collectionInfo.indexes.sort((a, b) => b.indexSize - a.indexSize);
            delete collStats.indexes
            collectionInfo = {...collectionInfo, ...collStats}
        }

        var sampleDoc = {redacted: true}
        if (allowSampleDoc && allowSampleDoc == true) {
            sampleDoc = db.getCollection(coll.name).findOne({})
        }

        collectionInfo.sampleDoc = sampleDoc

        dbStats.collectionsMetrics.push(collectionInfo)
    }

    ret.push(dbStats)
}



print(EJSON.stringify(ret))
