const conf = require("./../conf.js")


function mergeIndexSources (indexSizes, getIndexes, primaryIndexStats, secondaryIndexStats) {
    var since
    var flattenedKeys = Object.keys(getIndexes).map((_key) => ({"name": _key, flattened: getIndexes[_key].flattened}))
    for (var inxKey in getIndexes) {
        getIndexes[inxKey].indexSize = (indexSizes[inxKey]/conf.SCALE_MB).toFixed(4)
        getIndexes[inxKey].type = 'mongod'
        getIndexes[inxKey].primaryOps = primaryIndexStats[inxKey] ? primaryIndexStats[inxKey].ops : null
        getIndexes[inxKey].secondaryOps = secondaryIndexStats[inxKey] ? secondaryIndexStats[inxKey].ops : null
        var dups = flattenedKeys.filter((_getIndex) => 
            _getIndex.flattened.startsWith(getIndexes[inxKey].flattened, 0) && 
            inxKey !== _getIndex.name &&
            getIndexes[inxKey].flattened.length < _getIndex.flattened.length
        )
        getIndexes[inxKey].duplicate = dups.length > 0
        since = primaryIndexStats[inxKey] ? primaryIndexStats[inxKey].since : null
    }
    return {indexes: getIndexes, since: since}
}

module.exports = {
    collStatsBO: function (dbStats, _getIndexesBO, _indexStatsBO_Primary, _indexStatsBO_Secondary) {
        this.size = (dbStats.size/conf.SCALE_MB).toFixed(4)
        this.count = dbStats.count
        this.avgObjSize = (dbStats.avgObjSize/conf.SCALE_KB).toFixed(4),
        this.storageSize= (dbStats.storageSize/conf.SCALE_MB).toFixed(4) //compressed
        this.capped = dbStats.capped
        this.nindexes = dbStats.nindexes
        this.totalIndexSize = (dbStats.totalIndexSize/conf.SCALE_MB).toFixed(4)
        var res = mergeIndexSources(dbStats.indexSizes, _getIndexesBO, _indexStatsBO_Primary, _indexStatsBO_Secondary)
        this.since = res.since
        this.indexes = res.indexes

        return this
    }
}