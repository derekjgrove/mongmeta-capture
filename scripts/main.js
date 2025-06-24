const collStatsBO = require("./../BOs/collStatsBO.js");
const dbStatsBO = require("./../BOs/dbStatsBO.js");
const getCollectionInfosBO = require("./../BOs/getCollectionInfosBO.js");
const getIndexesBO = require("./../BOs/getIndexesBO.js")
const indexStatsBO = require("./../BOs/indexStatsBO.js")
const conf = require("./../conf.js")

var _dbs = []
var _collections = []
var _info = []
var isTenantDBPartitioned = false
var openDhandles = {primary: {start: 0, end: 0}, secondary: {start: 0, end: 0}}

db.getMongo().setReadPref('primary');
openDhandles.primary.start = db.serverStatus().wiredTiger.connection['files currently open'];

db.getMongo().setReadPref('secondary');
openDhandles.secondary.start = db.serverStatus().wiredTiger.connection['files currently open'];

_info.push({level: "info", name: `mongmeta v${conf.VERSION} - ${new Date().toISOString()}`})
_info.push({level: "info", name: `MongoDB version: ${db.version()}`})

var onPrem = (typeof onPrem === "undefined") ? false : onPrem
if (!onPrem) {
    _info.push({level: "info", name: "onPrem is unset, by default mongmeta captures Atlas deployments, if you want to run this for self hosted deployments please add the eval option --eval 'var onPrem = true'"})
}

var multiTenancyOverride = (typeof multiTenancyOverride === "undefined") ? false : multiTenancyOverride
var tenantIds = (typeof tenantIds === "undefined") ? false : tenantIds
var isMultiTenant = db.serverStatus().catalogStats.collections > 1000
if (!multiTenancyOverride && isMultiTenant && !tenantIds) {
    _info.push({level: "info", name: "You have suspected multi-tenancy/micro-services architecture, set multiTenancyOverride or tenantIds to get full collection/index size stats"})
    _info.push({level: "info", name: "   If you want to assume the risk of activating many dhandles and in turn causing performance issues, you can add the eval option --eval 'var multiTenancyOverride = true' (mainly reserved for lower environments)."})
    _info.push({level: "info", name: "   Alternatively, you can set the tenantIds to the tenants you want to pull data from and avoid performance issues depending on the number of collection namespaces with eval option 'var tenantIds = [\"<tenantId1>\", \"<tenantId2<>\"]'. The script will try to find those keys in either the db name or collection name, if this is not the method of your tenant partitioning, then this will not work."})
}


var serverInfo = db.serverBuildInfo()

var dbs = db.adminCommand({listDatabases: 1})
dbs.databases = dbs['databases'].filter(_db => !conf.RESERVED_DBS.includes(_db.name));


// collection and index stats witch activate dHandles
for (var _db of dbs.databases) {
    var db = db.getSiblingDB(_db.name);
    var dbStats = new dbStatsBO.dbStatsBO(db.runCommand( { dbStats: 1 } ))
    _dbs.push(dbStats)
    var colls = db.getCollectionInfos()

    colls = colls.filter(_coll => { 
        var splitColl = _coll.name.split('.')
        return !conf.RESERVED_COLLECTIONS.includes(splitColl[0])
    })

    if (isMultiTenant && !multiTenancyOverride && tenantIds && Array.isArray(tenantIds) && tenantIds.length > 0) {
        var dbTenantInx = tenantIds.findIndex(tid => _db.name.includes(tid))
        if (dbTenantInx !== -1) {
            isTenantDBPartitioned = true
            _info.push({level: "info", name: `Tenant partitioning detected at the db level for ${_db.name}, filtering collections by tenantIds: ${tenantIds[dbTenantInx]}`})
        }
    }

    for (var coll of colls) {
        var collectionInfo = new getCollectionInfosBO.getCollectionInfoBO(coll, _db.name)

        if (collectionInfo.type !== "view") {
            var indexDefinitions = new getIndexesBO.getIndexesBO(db.getCollection(coll.name).getIndexes())
            var searchStats = []
            if (
                collectionInfo.type !== "timeseries" && 
                serverInfo.versionArray && 
                serverInfo.versionArray[0] >= 6 &&
                serverInfo.modules &&
                serverInfo.modules.includes("enterprise") &&
                !onPrem
            )  {
                searchStats = db.getCollection(coll.name).aggregate([ { $listSearchIndexes: {} }, {$project: {name: 1, type: 1, key: "$latestDefinition", indexSize: {$toInt: false}}}]).toArray()
            }
            
            var primaryIndexStats = new indexStatsBO.indexStatsBO(db.getCollection(coll.name).aggregate([{$indexStats:{}}], {readPreference: "primary" }).toArray())
            var secondaryIndexStats = new indexStatsBO.indexStatsBO(db.getCollection(coll.name).aggregate([{$indexStats:{}}], {readPreference: "secondary" }).toArray())

            var collStats = {}
            if (!isMultiTenant || multiTenancyOverride == true || isTenantDBPartitioned == true ) {
                // print("!isMultiTenant || multiTenancyOverride == true || isTenantDBPartitioned == true")
                collStats = new collStatsBO.collStatsBO(db.getCollection(coll.name).aggregate(
                    [
                        { $collStats: { storageStats: {} } }
                    ], 
                    { readPreference: "secondary" }
                ).toArray()[0].storageStats, indexDefinitions.indexes, primaryIndexStats.indexStats, secondaryIndexStats.indexStats)
            } else if (tenantIds && Array.isArray(tenantIds) && tenantIds.length > 0) {
                // print("tenantIds && Array.isArray(tenantIds) && tenantIds.length > 0")
                var collTenantInx = tenantIds.findIndex(tid => coll.name.includes(tid))
                if (collTenantInx !== -1) {
                    _info.push({level: "info", name: `Tenant partitioning detected at the collection level for ${coll.name}, filtering collections by tenantIds: ${tenantIds[collTenantInx]}`})
                    collStats = new collStatsBO.collStatsBO(db.getCollection(coll.name).aggregate(
                        [
                            { $collStats: { storageStats: {} } }
                        ], 
                        { readPreference: "secondary" }
                    ).toArray()[0].storageStats, indexDefinitions.indexes, primaryIndexStats.indexStats, secondaryIndexStats.indexStats)
                } else {
                    // avoid spinning up dHandles
                    collStats = new collStatsBO.collStatsBO(db.getCollection(coll.name).aggregate(
                        [
                            { $collStats: { count: {} } }
                        ], 
                        { readPreference: "secondary" }
                    ).toArray()[0], indexDefinitions.indexes, primaryIndexStats.indexStats, secondaryIndexStats.indexStats)
                }
                
            } else {
                // print("else")
                // avoid spinning up dHandles
                collStats = new collStatsBO.collStatsBO(db.getCollection(coll.name).aggregate(
                    [
                        { $collStats: { count: {} } }
                    ], 
                    { readPreference: "secondary" }
                ).toArray()[0], indexDefinitions.indexes, primaryIndexStats.indexStats, secondaryIndexStats.indexStats)
            }


            collectionInfo.indexes = [...Object.keys(collStats.indexes).map((key) => ({"name": key, ...collStats.indexes[key]})), ...searchStats]
            collectionInfo.indexes.sort((a, b) => b.indexSize - a.indexSize);
            delete collStats.indexes
            collectionInfo = {...collectionInfo, ...collStats}
        }

        
        var sampleDoc = {redacted: true}

        collectionInfo.sampleDoc = sampleDoc
        _collections.push(collectionInfo)
    }
    
    isTenantDBPartitioned = false
}

openDhandles.secondary.end = db.serverStatus().wiredTiger.connection['files currently open'];

db.getMongo().setReadPref('primary');
openDhandles.primary.end = db.serverStatus().wiredTiger.connection['files currently open'];

_info.push({level: "info", name: `Open dHandles primary: ${openDhandles.primary.start} -> ${openDhandles.primary.end} (${openDhandles.primary.end - openDhandles.primary.start})`})
_info.push({level: "info", name: `Open dHandles secondary: ${openDhandles.secondary.start} -> ${openDhandles.secondary.end} (${openDhandles.secondary.end - openDhandles.secondary.start})`})


for (var _infoItem of _info) {
    console.log(`${EJSON.stringify(_infoItem)}`)
}
for (var _db of _dbs) {
    console.log(`${EJSON.stringify(_db)}`)
}
for (var _collection of _collections) {
    console.log(`${EJSON.stringify(_collection)}`)
}