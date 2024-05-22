const conf = require("./../conf.js")
const capture = JSON.parse(/* <mongmeta-capture main.js output goes here> */)

console.log("DB Table")
console.log(conf.OUTPUT_STYLES.th_line)
var header = Object.keys(conf.DB_COL_MAPPER).reduce((_accumulator, _currentValue) => _accumulator.concat(conf.DELIM, _currentValue))
console.log(header)
var colKeys = Object.values(conf.DB_COL_MAPPER)
for (var db of capture) {
    var dbRow = ''
    for (var colKey of colKeys) {
        dbRow = dbRow.concat(db[colKey], conf.DELIM)
    }
    console.log(dbRow)
}

console.log("\n\n\n\n\n")

console.log("Collections Table")
console.log(conf.OUTPUT_STYLES.th_line)
var header = Object.keys(conf.COLLECTION_COL_MAPPER).reduce((_accumulator, _currentValue) => _accumulator.concat(conf.DELIM, _currentValue))
console.log(header)
var colKeys = Object.values(conf.COLLECTION_COL_MAPPER)
for (var db of capture) {
    for (var collection of db.collectionsMetrics) {
        var collRow = ""
        for (var colKey of colKeys) {
            collRow = collRow.concat(typeof collection[colKey] === "object" ? JSON.stringify(collection[colKey]) : collection[colKey], conf.DELIM)
        }
        console.log(collRow)
    }

}

console.log("\n\n\n\n\n")

console.log("ALL Table")
console.log(conf.OUTPUT_STYLES.th_line)
var header = Object.keys(conf.COLLECTION_COL_MAPPER).reduce((_accumulator, _currentValue) => _accumulator.concat(conf.DELIM, _currentValue))
console.log(header)
var colKeys = Object.values(conf.COLLECTION_COL_MAPPER)
for (var db of capture) {
    for (var collection of db.collectionsMetrics) {
        var collRow = `${db.name}.`
        for (var colKey of colKeys) {
            collRow = collRow.concat(typeof collection[colKey] === "object" ? JSON.stringify(collection[colKey]) : collection[colKey], conf.DELIM)
        }
        console.log(collRow)

        var header = " ;".concat(Object.keys(conf.INDEX_HEADERS).reduce((_accumulator, _currentValue) => _accumulator.concat(conf.DELIM, _currentValue)))
        console.log(header)
        var inxKeys = Object.values(conf.INDEX_HEADERS)
        for (var index of collection.indexes) {
            var inxRow = " ;"
            for (var inxKey of inxKeys) {
                inxRow = inxRow.concat(typeof index[inxKey] === "object" ? JSON.stringify(index[inxKey]) : index[inxKey], conf.DELIM)
            }
            console.log(inxRow)
        }
    }

}

