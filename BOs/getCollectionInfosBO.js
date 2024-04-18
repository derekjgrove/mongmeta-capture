const conf = require("./../conf.js")




module.exports = {
    getCollectionInfoBO: function (getCollectionInfo) {
        this.name = getCollectionInfo.name
        this.type = getCollectionInfo.type // [collection, timeseries, view] 
        if (getCollectionInfo.options.clusteredIndex !== undefined) {
            this.isClustered = true
        }
        if (getCollectionInfo.options.capped !== undefined) {
            this.isCapped = true
        }
        if (getCollectionInfo.options.collation !== undefined) {
            this.isCollation = true
        }
        if (getCollectionInfo.options.validator !== undefined) {
            this.isJsonSchema = true
        }
        if (getCollectionInfo.options.changeStreamPreAndPostImages !== undefined) {
            this.isChangeStreamPre = true
        }
        this.options = getCollectionInfo.options
        /*
        [
            changeStreamPreAndPostImages, 
            timeseries, 
            validator, 

            clusteredIndex,     // clustered collection
            expireAfterSeconds

            viewOn,             //view
            pipeline,

            capped,             // capped collection
            size,
            max

            collation


            gridFS is not exploitable
        ]
        */


        return this
    }
}