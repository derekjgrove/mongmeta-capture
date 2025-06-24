const conf = require("./../conf.js")


function mergeIndexSources (indexDetails, getIndexes, primaryIndexStats, secondaryIndexStats) {
    var since
    var indexFreeStorageSize = 0
    var flattenedKeys = Object.keys(getIndexes).map((_key) => ({"name": _key, flattened: getIndexes[_key].flattened}))
    for (var inxKey in getIndexes) {
        getIndexes[inxKey].indexSize = indexDetails && indexDetails[inxKey] && indexDetails[inxKey]['block-manager'] && typeof indexDetails[inxKey]['block-manager']['file size in bytes'] !== 'undefined'
            ? (indexDetails[inxKey]['block-manager']['file size in bytes']/conf.SCALE_MB).toFixed(4)
            : -1;
        getIndexes[inxKey].freeStorageSize = indexDetails && indexDetails[inxKey] && indexDetails[inxKey]['block-manager'] && typeof indexDetails[inxKey]['block-manager']['file bytes available for reuse'] !== 'undefined'
            ? (indexDetails[inxKey]['block-manager']['file bytes available for reuse']/conf.SCALE_MB).toFixed(4)
            : -1;
        getIndexes[inxKey].type = 'mongod';
        getIndexes[inxKey].primaryOps = primaryIndexStats[inxKey] && typeof primaryIndexStats[inxKey].ops !== 'undefined'
            ? primaryIndexStats[inxKey].ops
            : -1;
        getIndexes[inxKey].secondaryOps = secondaryIndexStats[inxKey] && typeof secondaryIndexStats[inxKey].ops !== 'undefined'
            ? secondaryIndexStats[inxKey].ops
            : -1;
        var dups = flattenedKeys.filter((_getIndex) => 
            _getIndex.flattened.startsWith(getIndexes[inxKey].flattened, 0) && 
            inxKey !== _getIndex.name &&
            getIndexes[inxKey].flattened.length < _getIndex.flattened.length
        )
        getIndexes[inxKey].duplicate = dups.length > 0
        delete getIndexes[inxKey].flattened
        since = primaryIndexStats[inxKey] ? primaryIndexStats[inxKey].since : null
        getIndexes[inxKey].indexFreeStorageSize = indexDetails && indexDetails[inxKey] && indexDetails[inxKey]['block-manager'] && typeof indexDetails[inxKey]['block-manager']['file bytes available for reuse'] !== 'undefined'
            ? (indexDetails[inxKey]['block-manager']['file bytes available for reuse']/conf.SCALE_MB).toFixed(4)
            : -1;
        indexFreeStorageSize += getIndexes[inxKey].indexFreeStorageSize
    }
    return {indexes: getIndexes, since: since, indexFreeStorageSize: indexFreeStorageSize > -1 ? (indexFreeStorageSize/conf.SCALE_MB).toFixed(4) : -1}
}

module.exports = {
    collStatsBO: function (collStats, _getIndexesBO, _indexStatsBO_Primary, _indexStatsBO_Secondary) {
        this.size = typeof collStats.size !== 'undefined' ? (collStats.size/conf.SCALE_MB).toFixed(4) : -1
        this.avgObjSize = typeof collStats.avgObjSize !== 'undefined' ? (collStats.avgObjSize/conf.SCALE_KB).toFixed(4) : -1
        this.storageSize = typeof collStats.storageSize !== 'undefined' ? (collStats.storageSize/conf.SCALE_MB).toFixed(4) : -1 //compressed
        this.freeStorageSize = typeof collStats.freeStorageSize !== 'undefined' ? (collStats.freeStorageSize/conf.SCALE_MB).toFixed(4) : -1
        this.capped = collStats.capped
        this.count = collStats.count
        this.nindexes = typeof collStats.nindexes !== 'undefined' ? collStats.nindexes : Object.keys(_getIndexesBO).length
        this.totalIndexSize = typeof collStats.totalIndexSize !== 'undefined' ? (collStats.totalIndexSize/conf.SCALE_MB).toFixed(4) : -1
        var res = mergeIndexSources(collStats.indexDetails, _getIndexesBO, _indexStatsBO_Primary, _indexStatsBO_Secondary)
        this.since = res.since
        this.indexes = res.indexes
        this.indexFreeStorageSize = res.indexFreeStorageSize
        return this
    }
}