const conf = require("./../conf.js")

module.exports = {
    dbStatsBO: function (dbStats) {
        this.name = dbStats.db
        this.collections = dbStats.collections
        this.views = dbStats.views
        this.objects = dbStats.objects
        this.dataSize = dbStats.dataSize/conf.SCALE_MB
        this.storageSize = dbStats.storageSize/conf.SCALE_MB
        this.indexes = dbStats.indexes
        this.indexSize = dbStats.indexSize/conf.SCALE_MB
        this.diskPercentageUsed = (dbStats.fsUsedSize/dbStats.fsTotalSize)*100
        this.collectionsMetrics = []

        return this
    }
}