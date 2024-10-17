const conf = require("./../conf.js")

module.exports = {
    collStatsBO_sharded: function (_ns, shards, dbStatus, collStats) {
        this.dbName = _ns[0];
        this.collName = _ns[1]
        this.sharded = collStats.sharded == true
        if (collStats.sharded == true) {
            var collStatus = dbStatus.collections[collStats.ns]
            this.shardKey = collStatus.shardKey
            this.balancing = collStatus.balancing
            this.tags = collStatus.tags
            this.chunkMetadata = collStatus.chunkMetadata
        }
        this.shards = {}
        for (var _shard of shards) {
            this.shards[_shard] = {
                count: collStats.shards[_shard] !== undefined && collStats.shards[_shard].count !== undefined ? collStats.shards[_shard].count : 0,
                storageSize: collStats.shards[_shard] !== undefined ? (collStats.shards[_shard].storageSize/conf.SCALE_MB).toFixed(4) : 0, //compressed
                nindexes: collStats.shards[_shard] !== undefined ? collStats.shards[_shard].nindexes : 0,
                totalIndexSize: collStats.shards[_shard] !== undefined ? (collStats.shards[_shard].totalIndexSize/conf.SCALE_MB).toFixed(4) : 0
            }
        }

        return this
    }
}