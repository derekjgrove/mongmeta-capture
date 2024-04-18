const conf = require("./../conf.js")


function mergeIndexSources (indexSizes, getIndexes) {
    for (var inxKey in getIndexes) {
        getIndexes[inxKey].indexSize = indexSizes[inxKey]/conf.SCALE_MB
        getIndexes[inxKey].type = 'mongod'
    }
    return getIndexes
}

module.exports = {
    collStatsBO: function (dbStats, _getIndexesBO) {
        this.size = dbStats.size/conf.SCALE_MB
        this.count = dbStats.count
        this.avgObjSize = dbStats.avgObjSize/conf.SCALE_KB,
        this.storageSize= dbStats.storageSize/conf.SCALE_MB //compressed
        this.capped = dbStats.capped
        this.nindexes = dbStats.nindexes
        this.totalIndexSize = dbStats.totalIndexSize/conf.SCALE_MB
        this.indexes = mergeIndexSources(dbStats.indexSizes, _getIndexesBO)
        return this
    }
}