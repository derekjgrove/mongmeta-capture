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
    */
    getIndexesBO: function (getIndexes) {
        this.indexes = {}
        for (var inx of getIndexes) {
            this.indexes[inx.name] = {}

            if (inx["key"]) {
                this.indexes[inx.name]["key"] = inx['key']
                this.indexes[inx.name]["flattened"] = JSON.stringify(inx['key'], null, 0).slice(0,-1)
            }
            if (inx["sparse"]) this.indexes[inx.name]["sparse"] = inx['sparse']
            if (inx["collation"]) this.indexes[inx.name]["collation"] = inx['collation']
            if (inx["hidden"]) this.indexes[inx.name]["hidden"] = inx['hidden']
            if (inx["unique"]) this.indexes[inx.name]["unique"] = inx['unique']
            if (inx["partialFilterExpression"]) this.indexes[inx.name]["partialFilterExpression"] = inx['partialFilterExpression']
            if (inx["expireAfterSeconds"]) this.indexes[inx.name]["expireAfterSeconds"] = inx['expireAfterSeconds']

            if (inx["weights"]) this.indexes[inx.name]["weights"] = inx['weights']                                                   // $text index
            if (inx["default_language"]) this.indexes[inx.name]["default_language"] = inx['default_language']
            if (inx["language_override"]) this.indexes[inx.name]["language_override"] = inx['language_override']
            if (inx["textIndexVersion"]) this.indexes[inx.name]["textIndexVersion"] = inx['textIndexVersion']

            if (inx["wildcardProjection"]) this.indexes[inx.name]["wildcardProjection"] = inx['wildcardProjection']                  // this is not required to be wildcard

            if (inx["2dsphereIndexVersion"]) this.indexes[inx.name]["2dsphereIndexVersion"] = inx['2dsphereIndexVersion']            // location
            if (inx["bits"]) this.indexes[inx.name]["bits"] = inx['bits']
            if (inx["min"]) this.indexes[inx.name]["min"] = inx['min']
            if (inx["max"]) this.indexes[inx.name]["max"] = inx['max']

            for (var inxKey in inx["key"]) {
                var attrParts = inxKey.split('.')
                if (attrParts.includes(WILDCARD_VALUE)) {
                    this.indexes[inx.name]["isWildCard"] = true
                }
                // handling type Long assignments
                // if (typeof inx["key"][inxKey] === "object") {
                //     if (typeof JSON.parse(inx["key"][inxKey]) === "number") {
                //         inx["key"][inxKey] = "Long(" + inx["key"][inxKey] + ")"
                //     }
                // }
            }

        }
        
        return this
    }

}
