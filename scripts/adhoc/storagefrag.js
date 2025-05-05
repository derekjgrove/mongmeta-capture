const RESERVED_DBS = [
    "admin",
    "config",
    "local"
]
const RESERVED_COLLECTIONS = [
    "system"
]

const DELIM = "$$$$$"


const DB_OUT = []
const COLL_OUT = []

var dbs = db.adminCommand({listDatabases: 1})
dbs.databases = dbs['databases'].filter(_db => !RESERVED_DBS.includes(_db.name));
for (var _db of dbs.databases) {
    var db = db.getSiblingDB(_db.name);
    var dbStats = db.stats({freeStorage: 1, scale: 1024*1024*1024})
    DB_OUT.push(`${_db.name}${DELIM}${dbStats.freeStorageSize > 0 ? dbStats.freeStorageSize.toFixed(3) : dbStats.freeStorageSize}${DELIM}${dbStats.indexFreeStorageSize > 0 ? dbStats.indexFreeStorageSize.toFixed(3) : dbStats.indexFreeStorageSize}${DELIM}${dbStats.totalFreeStorageSize > 0 ? dbStats.totalFreeStorageSize.toFixed(3) : dbStats.totalFreeStorageSize}`)
    
	var colls = db.getCollectionInfos()
    colls = colls.filter(_coll => { 
        var splitColl = _coll.name.split('.')
        return !RESERVED_COLLECTIONS.includes(splitColl[0])
    })

    var freeStorageSize = 0
    var indexFreeStorageSize = 0
	for (var coll of colls) {
		if (coll.type !== "view") {
			var currCollFrag = db.getCollection(coll.name).stats({indexDetails: true})
            var collFree = currCollFrag.wiredTiger['block-manager']['file bytes available for reuse']/(1024*1024*1024)
            freeStorageSize += collFree

            var inxTotal = 0
            for (var key in currCollFrag.indexDetails) { 
                inxTotal += currCollFrag.indexDetails[key]['block-manager']['file bytes available for reuse']/(1024*1024*1024)
            }

            indexFreeStorageSize += inxTotal
            COLL_OUT.push(`${_db.name}.${coll.name}${DELIM}${collFree > 0 ? collFree.toFixed(3) : collFree}${DELIM}${inxTotal > 0 ? inxTotal.toFixed(3) : inxTotal}${DELIM}${(collFree + inxTotal) > 0 ? (collFree + inxTotal).toFixed(3) : (collFree + inxTotal)}`)
		}
	}
}

for (var dbOut of DB_OUT) {
    print(dbOut)
}
print("-------------------------------------------------------")
for (var collOut of COLL_OUT) {
    print(collOut)
}