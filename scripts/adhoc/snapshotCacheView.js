// mongosh "mongodb+srv://<USER>:<PASSWORD>@<URI>/?readPreference=secondary" --file snapshotCacheView.js

const RESERVED_DBS = [
    "admin",
    "config",
    "local"
]
const RESERVED_COLLECTIONS = [
    "system"
]

const DELIM = "$$$$$"
const COLL_OUT = []
var total = 0
var inxTotall = 0

db.getMongo().setReadPref('secondary')

var dbs = db.adminCommand({listDatabases: 1})
dbs.databases = dbs['databases'].filter(_db => !RESERVED_DBS.includes(_db.name));
for (var _db of dbs.databases) {
    var db = db.getSiblingDB(_db.name);

	var colls = db.getCollectionInfos()
    colls = colls.filter(_coll => { 
        var splitColl = _coll.name.split('.')
        return !RESERVED_COLLECTIONS.includes(splitColl[0])
    })

	for (var coll of colls) {
		if (coll.type !== "view") {
			var currCollFrag = db.getCollection(coll.name).stats({indexDetails: true})
            var cacheUsed = currCollFrag.wiredTiger['cache']['bytes currently in the cache']/(1024*1024)
            total += cacheUsed

            var inxTotal = 0
            for (var key in currCollFrag.indexDetails) { 
                inxTotal += currCollFrag.indexDetails[key]['cache']['bytes currently in the cache']/(1024*1024)
            }
            inxTotall += inxTotal

            COLL_OUT.push(`${_db.name}.${coll.name}${DELIM}${cacheUsed > 0 ? cacheUsed.toFixed(3) : cacheUsed}${DELIM}${inxTotal > 0 ? inxTotal.toFixed(3) : inxTotal}${DELIM}${(cacheUsed + inxTotal) > 0 ? (cacheUsed + inxTotal).toFixed(3) : (cacheUsed + inxTotal)}`)
		}
	}
}

print('Collection Cache total: ' + total.toFixed(3) + ' MB')
print('Index Cache total: ' + inxTotall.toFixed(3) + ' MB')
print(`Namespace${DELIM}Data Cache Used (MB)${DELIM}Index Cache Used (MB)${DELIM}Total Cache Used (MB)`)
for (var collOut of COLL_OUT) {
    print(collOut)
}