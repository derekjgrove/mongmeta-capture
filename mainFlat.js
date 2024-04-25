
function mergeIndexSources (indexSizes, getIndexes) {
    for (var inxKey in getIndexes) {
        getIndexes[inxKey].indexSize = (indexSizes[inxKey]/conf.SCALE_MB).toFixed(4)
        getIndexes[inxKey].type = 'mongod'
    }
    return getIndexes
}

const WILDCARD_VALUE = "$**"

const collStatsBO = {
    collStatsBO: function (dbStats, _getIndexesBO) {
        this.size = (dbStats.size/conf.SCALE_MB).toFixed(4)
        this.count = dbStats.count
        this.avgObjSize = (dbStats.avgObjSize/conf.SCALE_KB).toFixed(4),
        this.storageSize= (dbStats.storageSize/conf.SCALE_MB).toFixed(4) //compressed
        this.capped = dbStats.capped
        this.nindexes = dbStats.nindexes
        this.totalIndexSize = (dbStats.totalIndexSize/conf.SCALE_MB).toFixed(4)
        this.indexes = mergeIndexSources(dbStats.indexSizes, _getIndexesBO)
        return this
    }
}
const dbStatsBO = {
    dbStatsBO: function (dbStats) {
        this.name = dbStats.db
        this.collections = dbStats.collections
        this.views = dbStats.views
        this.objects = dbStats.objects
        this.dataSize = (dbStats.dataSize/conf.SCALE_GB).toFixed(4)
        this.storageSize = (dbStats.storageSize/conf.SCALE_GB).toFixed(4)
        this.indexes = dbStats.indexes
        this.indexSize = (dbStats.indexSize/conf.SCALE_GB).toFixed(4)
        this.diskPercentageUsed = (dbStats.fsUsedSize/dbStats.fsTotalSize)*100
        this.collectionsMetrics = []

        return this
    }
}
const getCollectionInfosBO = {
    getCollectionInfoBO: function (getCollectionInfo) {
        this.name = getCollectionInfo.name
        this.type = getCollectionInfo.type // [collection, timeseries, view] 
        if (getCollectionInfo.options.clusteredIndex !== undefined) {
            this.isClustered = true
        }
        if (getCollectionInfo.options.capped !== undefined) {
            this.isCapped = true
        }
        if (getCollectionInfo.options.collation !== undefined) {
            this.isCollation = true
        }
        if (getCollectionInfo.options.validator !== undefined) {
            this.isJsonSchema = true
        }
        if (getCollectionInfo.options.changeStreamPreAndPostImages !== undefined) {
            this.isChangeStreamPre = true
        }
        this.options = getCollectionInfo.options
        /*
        [
            changeStreamPreAndPostImages, 
            timeseries, 
            validator, 

            clusteredIndex,     // clustered collection
            expireAfterSeconds

            viewOn,             //view
            pipeline,

            capped,             // capped collection
            size,
            max

            collation


            gridFS is not exploitable
        ]
        */


        return this
    }
}
const getIndexesBO = {
    /*
        key values enum
        key = {<attr> = [
            1
            -1
            2d
            2dsphere
            hashed
            text
        ]}
    */
    getIndexesBO: function (getIndexes) {
        this.indexes = {}
        for (var inx of getIndexes) {
            this.indexes[inx.name] = {}

            if (inx["key"]) this.indexes[inx.name]["key"] = inx['key']
            if (inx["sparse"]) this.indexes[inx.name]["sparse"] = inx['sparse']
            if (inx["collation"]) this.indexes[inx.name]["collation"] = inx['collation']
            if (inx["hidden"]) this.indexes[inx.name]["hidden"] = inx['hidden']
            if (inx["unique"]) this.indexes[inx.name]["unique"] = inx['unique']
            if (inx["partialFilterExpression"]) this.indexes[inx.name]["partialFilterExpression"] = inx['partialFilterExpression']
            if (inx["expireAfterSeconds"]) this.indexes[inx.name]["expireAfterSeconds"] = inx['expireAfterSeconds']

            if (inx["weights"]) this.indexes[inx.name]["weights"] = inx['weights']                                                   // $text index
            if (inx["default_language"]) this.indexes[inx.name]["default_language"] = inx['default_language']
            if (inx["language_override"]) this.indexes[inx.name]["language_override"] = inx['language_override']
            if (inx["textIndexVersion"]) this.indexes[inx.name]["textIndexVersion"] = inx['textIndexVersion']

            if (inx["wildcardProjection"]) this.indexes[inx.name]["wildcardProjection"] = inx['wildcardProjection']                  // this is not required to be wildcard

            if (inx["2dsphereIndexVersion"]) this.indexes[inx.name]["2dsphereIndexVersion"] = inx['2dsphereIndexVersion']            // location
            if (inx["bits"]) this.indexes[inx.name]["bits"] = inx['bits']
            if (inx["min"]) this.indexes[inx.name]["min"] = inx['min']
            if (inx["max"]) this.indexes[inx.name]["max"] = inx['max']

            for (var inxKey in inx["key"]) {
                var attrParts = inxKey.split('.')
                if (attrParts.includes(WILDCARD_VALUE)) {
                    this.indexes[inx.name]["isWildCard"] = true
                }
                // handling type Long assignments
                // if (typeof inx["key"][inxKey] === "object") {
                //     if (typeof JSON.parse(inx["key"][inxKey]) === "number") {
                //         inx["key"][inxKey] = "Long(" + inx["key"][inxKey] + ")"
                //     }
                // }
            }

        }
        
        return this
    }

}

const SCALE_KB = 1024
const SCALE_MB = 1024*1024
const SCALE_GB = 1024*1024*1024
const RESERVED_DBS = [
    "admin",
    "config",
    "local"
]
const RESERVED_COLLECTIONS = [
    "system.views",
    "system.profile"
]
const RESERVED_OPS = [
    "command",
    "getMore"
]
const OUTPUT_STYLES = {
    th_line: "---------------------------------------------------------"
}

const conf = {
    SCALE_KB,
    SCALE_MB,
    SCALE_GB,
    RESERVED_DBS,
    RESERVED_COLLECTIONS,
    OUTPUT_STYLES
}

var ret = []
var allowSampleDoc = false

if (!allowSampleDoc) {
    print("allowSampleDoc is unset or false, if you want to sample documents pleas add the eval option")
    print("--eval 'var allowSampleDoc = true'")
}


var dbs = db.adminCommand({listDatabases: 1})
dbs.databases = dbs['databases'].filter(_db => !conf.RESERVED_DBS.includes(_db.name));
    // totalSize: Long("20593246208"),
    // totalSizeMb: Long("19639"),


for (var _db of dbs.databases) {
    var db = db.getSiblingDB(_db.name);
    var dbStats = new dbStatsBO.dbStatsBO(db.runCommand( { dbStats: 1 } ))
    var colls = db.getCollectionInfos()
    colls = colls.filter(_coll => !conf.RESERVED_COLLECTIONS.includes(_coll.name))
    
    for (var coll of colls) {
        var collectionInfo = new getCollectionInfosBO.getCollectionInfoBO(coll)

        if (collectionInfo.type !== "view") {
            var indexStats = new getIndexesBO.getIndexesBO(db.getCollection(coll.name).getIndexes())
            var searchStats = []
            if (collectionInfo.type !== "timeseries")  {
                searchStats = db.getCollection(coll.name).aggregate([ { $listSearchIndexes: {} }, {$project: {name: 1, type: 1, key: "$latestDefinition", indexSize: {$toInt: false}}}]).toArray()
            }
            var collStats = new collStatsBO.collStatsBO(db.getCollection(coll.name).stats(), indexStats.indexes)
 
            collectionInfo.indexes = [...Object.keys(collStats.indexes).map((key) => ({"name": key, ...collStats.indexes[key]})), ...searchStats]

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
