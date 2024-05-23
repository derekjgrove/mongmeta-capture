const conf = require("./../conf.js")
const WILDCARD_VALUE = "$**"

module.exports = {
    /*
        key values enum
        key = {<attr> = [
            1
            -1
            2d
            2dsphere
            hashed
            text
        ]}

        definitions found --> db.serverStatus().indexStats
        {
        count: Long("193"),
        features: {
            '2d': { count: Long("2"), accesses: Long("0") },
            '2dsphere': { count: Long("4"), accesses: Long("0") },
            '2dsphere_bucket': { count: Long("0"), accesses: Long("0") },
            collation: { count: Long("2"), accesses: Long("0") },
            compound: { count: Long("31"), accesses: Long("0") },
            hashed: { count: Long("1"), accesses: Long("0") },
            id: { count: Long("118"), accesses: Long("0") },
            normal: { count: Long("62"), accesses: Long("0") },
            partial: { count: Long("2"), accesses: Long("0") },
            single: { count: Long("44"), accesses: Long("0") },
            sparse: { count: Long("0"), accesses: Long("0") },
            text: { count: Long("3"), accesses: Long("0") },
            ttl: { count: Long("1"), accesses: Long("0") },
            unique: { count: Long("9"), accesses: Long("0") },
            wildcard: { count: Long("3"), accesses: Long("0") }
        }
        }

    */
    getIndexesBO: function (getIndexes) {
        this.indexes = {}
        for (var inx of getIndexes) {
            this.indexes[inx.name] = {}

            if (inx["key"]) {
                this.indexes[inx.name]["key"] = inx['key']
                this.indexes[inx.name]["flattened"] = JSON.stringify(inx['key'], null, 0).slice(0,-1)
                this.indexes[inx.name]["options"] = {}
            }

            var optionKeys = Object.keys(inx).filter(_inxKey => !conf.INDEX_KEY_EXCLUDE.includes(_inxKey))
            for (var optionKey of optionKeys) {
                this.indexes[inx.name]["options"][optionKey] = inx[optionKey]
            }
            
            for (var inxKey in inx["key"]) {
                var attrParts = inxKey.split('.')
                if (attrParts.includes(WILDCARD_VALUE)) {
                    this.indexes[inx.name]["options"]["isWildCard"] = true
                }
                // handling type Long assignments, not required for mongosh and EJSON
                // if (typeof inx["key"][inxKey] === "object") {
                //     if (typeof JSON.parse(inx["key"][inxKey]) === "number") {
                //         inx["key"][inxKey] = "Long(" + inx["key"][inxKey] + ")"
                //     }
                // }
            }

            // Logic for quick tags later
            // if (inx["sparse"]) this.indexes[inx.name]["options"]["sparse"] = inx['sparse']
            // if (inx["collation"]) this.indexes[inx.name]["options"]["collation"] = inx['collation']
            // if (inx["hidden"]) this.indexes[inx.name]["options"]["hidden"] = inx['hidden']
            // if (inx["unique"]) this.indexes[inx.name]["options"]["unique"] = inx['unique']
            // if (inx["partialFilterExpression"]) this.indexes[inx.name]["options"]["partialFilterExpression"] = inx['partialFilterExpression']
            // if (inx["expireAfterSeconds"]) this.indexes[inx.name]["options"]["expireAfterSeconds"] = inx['expireAfterSeconds']

            // if (inx["weights"]) this.indexes[inx.name]["options"]["weights"] = inx['weights']                                                   // $text index
            // if (inx["default_language"]) this.indexes[inx.name]["options"]["default_language"] = inx['default_language']
            // if (inx["language_override"]) this.indexes[inx.name]["options"]["language_override"] = inx['language_override']
            // if (inx["textIndexVersion"]) this.indexes[inx.name]["options"]["textIndexVersion"] = inx['textIndexVersion']

            // if (inx["wildcardProjection"]) this.indexes[inx.name]["options"]["wildcardProjection"] = inx['wildcardProjection']                  // this is not required to be wildcard

            // if (inx["2dsphereIndexVersion"]) this.indexes[inx.name]["options"]["2dsphereIndexVersion"] = inx['2dsphereIndexVersion']            // location
            // if (inx["bits"]) this.indexes[inx.name]["options"]["bits"] = inx['bits']
            // if (inx["min"]) this.indexes[inx.name]["options"]["min"] = inx['min']
            // if (inx["max"]) this.indexes[inx.name]["options"]["max"] = inx['max']

        }
        
        return this
    }

}
