const conf = require("./../conf.js")

module.exports = {
    indexStatsBO: function (_indexStats) {
        this.indexStats = {}
        for (var indexStat of _indexStats) {
            this.indexStats[indexStat.name] = {
                ops : indexStat.accesses.ops || null,
                since : indexStat.accesses.since || null
            }
        }

        return this
    }
}