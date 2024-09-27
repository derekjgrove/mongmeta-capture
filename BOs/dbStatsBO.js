const conf = require("./../conf.js")

module.exports = {
    dbStatsBO: function (dbStats) {
        var isSharded = dbStats.raw !== undefined
        this.level = "db"
        this.name = isSharded == false ? dbStats.db : dbStats.raw[Object.keys(dbStats.raw)[0]].db
        this.collections = isSharded == false ? dbStats.collections : Object.keys(dbStats.raw).reduce((accumulator, current) => accumulator > dbStats.raw[current].collections ? accumulator : dbStats.raw[current].collections, 0);
        this.views = isSharded == false ? dbStats.views : Object.keys(dbStats.raw).reduce((accumulator, current) => accumulator > dbStats.raw[current].views ? accumulator : dbStats.raw[current].views, 0);
        this.objects = dbStats.objects
        this.dataSize = (dbStats.dataSize/conf.SCALE_GB).toFixed(4)
        this.storageSize = (dbStats.storageSize/conf.SCALE_GB).toFixed(4)
        this.indexes = isSharded == false ? dbStats.indexes : Object.keys(dbStats.raw).reduce((accumulator, current) => accumulator > dbStats.raw[current].indexes ? accumulator : dbStats.raw[current].indexes, 0);
        this.indexSize = (dbStats.indexSize/conf.SCALE_GB).toFixed(4)
        // this.diskPercentageUsed = (dbStats.fsUsedSize/dbStats.fsTotalSize)*100
        return this
    }
}