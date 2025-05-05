const conf = require("./../conf.js")

function deleteKeys (top) {
    delete top['note']
    var keys = Object.keys(top)
    for (var key of keys) {
        var keyFields = key.split(".");
        if (conf.RESERVED_DBS.includes(keyFields[0])) {
            delete top[key]
        }
    }
    return top
}

module.exports = {
    topBO: function (top) {
        return deleteKeys(top.totals)
    }
}