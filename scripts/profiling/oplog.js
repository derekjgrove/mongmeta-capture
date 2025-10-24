const conf = require("./../../conf.js")
const oplogAggBO = require('./oplogAgg');

// Configuration with eval overrides - check for undefined variables
const OPLOG_DB_NAME = typeof oplogDb === "undefined" ? 'local' : oplogDb;
const OPLOG_COLLECTION_NAME = typeof oplogCollection === "undefined" ? 'oplog.rs' : oplogCollection;
const START_TIME = typeof startTime === "undefined" ? (function() {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0); // beginning of today (UTC)
    return new Date(d.toISOString());
})() : new Date(startTime);
const END_TIME = typeof endTime === "undefined" ? (function() {
    const d = new Date();
    d.setUTCHours(23, 55, 0, 0); // end of today (UTC)
    return new Date(d.toISOString());
})() : new Date(endTime);
const INTERVAL_MINUTES = typeof interval === "undefined" ? 5 : parseInt(interval);
const OUTPUT_FORMAT = typeof format === "undefined" ? 'csv' : format; // csv or json
const FILTER_NAMESPACE = typeof namespace === "undefined" ? null : namespace; // filter specific namespace

db.getSiblingDB(OPLOG_DB_NAME).getCollection(OPLOG_COLLECTION_NAME).createIndex({ wall: 1 });
db.getSiblingDB(OPLOG_DB_NAME).getCollection(OPLOG_COLLECTION_NAME).createIndex({
    ns: 1,
    op: 1,
    wall: -1
});

while (true) {
    const indexStats = db.getSiblingDB(OPLOG_DB_NAME).getCollection(OPLOG_COLLECTION_NAME).aggregate([
      {
        $indexStats: {}
      },
      {
        $match: {
          building: true
        }
      },
      { $count: "stillBuilding" }
    ]).toArray();
    if (indexStats.length > 0 && indexStats[0].stillBuilding === 0) {
        break;
    }
}

// Help function
if (typeof help !== "undefined" && help==true) {
    print("MongoDB Oplog Analysis Script");
    print("Usage: mongosh [connection] --file oplog.js --eval 'var varName=\"value\"'");
    print("");
    print("Variables:");
    print("  var oplogDb=\"name\"           Oplog database name (default: 'local')");
    print("  var oplogCollection=\"name\"   Oplog collection name (default: 'oplog.rs')");
    print("  var startTime=\"ISO date\"     Start time for analysis (default: beginning of today UTC)");
    print("  var endTime=\"ISO date\"       End time for analysis (default: end of today UTC)");
    print("  var interval=5               Time interval in minutes (default: 5)");
    print("  var format=\"csv\"             Output format: 'csv' or 'json' (default: 'csv')");
    print("  var namespace=\"ns\"           Filter specific namespace (optional)");
    print("  var help=true                Show this help message");
    print("");
    print("Examples:");
    print("  mongosh [connection] --file oplog.js --eval 'var startTime=\"2025-01-01T00:00:00.000Z\"; var endTime=\"2025-01-01T01:00:00.000Z\"'");
    print("  mongosh [connection] --file oplog.js --eval 'var interval=10; var format=\"json\"'");
    print("  mongosh [connection] --file oplog.js --eval 'var namespace=\"myapp.users\"; var oplogDb=\"local\"'");
    quit();
}

function roundUpToNearest0or5Min(date) {
    const minutes = date.getMinutes();
    const roundedMinutes = minutes % INTERVAL_MINUTES === 0 ? minutes : minutes + (INTERVAL_MINUTES - (minutes % INTERVAL_MINUTES));
    if (roundedMinutes === 60) {
        date.setHours(date.getHours() + 1);
        date.setMinutes(0, 0, 0);
    } else {
        date.setMinutes(roundedMinutes, 0, 0);
    }
    return date;
}

// Get oplog bounds if not specified
let firstWall, lastWall;
if (typeof startTime === "undefined" || typeof endTime === "undefined") {
    print("i have made it here")
    const collection = db.getSiblingDB(OPLOG_DB_NAME).getCollection(OPLOG_COLLECTION_NAME);
    if (typeof startTime === "undefined") {
        const firstDoc = collection.find().sort({$natural: 1}).limit(1).toArray()[0];
        firstWall = firstDoc ? firstDoc.wall : null;
        START_TIME = roundUpToNearest0or5Min(new Date(firstWall));
    }
    if (typeof endTime === "undefined") {
        const lastDoc = collection.find().sort({$natural: -1}).limit(1).toArray()[0];
        lastWall = lastDoc ? lastDoc.wall : null;
        END_TIME = roundUpToNearest0or5Min(new Date(lastWall));
    }
}

const TIMES = [START_TIME, END_TIME];

// Print configuration
if (OUTPUT_FORMAT === 'json') {
    print(JSON.stringify({
        config: {
            oplogDb: OPLOG_DB_NAME,
            oplogCollection: OPLOG_COLLECTION_NAME,
            startTime: START_TIME.toISOString(),
            endTime: END_TIME.toISOString(),
            interval: INTERVAL_MINUTES,
            format: OUTPUT_FORMAT,
            namespace: FILTER_NAMESPACE
        }
    }));
} else {
    print(`# Configuration: DB=${OPLOG_DB_NAME}, Collection=${OPLOG_COLLECTION_NAME}, Start=${START_TIME.toISOString()}, End=${END_TIME.toISOString()}, Interval=${INTERVAL_MINUTES}min`);
    if (FILTER_NAMESPACE) {
        print(`# Filtering namespace: ${FILTER_NAMESPACE}`);
    }
}

var namespaces = []

// Output headers
if (OUTPUT_FORMAT === 'csv') {
    print("TimeStamp;Namespace;Total Writes;Inserts;Updates;Removes");
}

// Get namespaces
var ns = db.getSiblingDB(OPLOG_DB_NAME).getCollection(OPLOG_COLLECTION_NAME).distinct("ns");
ns = ns.filter(_ns => !conf.RESERVED_DBS.includes(_ns.split('.')[0]) && _ns.length > 0);

// Apply namespace filter if specified
if (FILTER_NAMESPACE) {
    ns = ns.filter(_ns => _ns === FILTER_NAMESPACE || _ns.startsWith(FILTER_NAMESPACE + '.'));
}

for (var _ns of ns) {
    var _totalWrites = 0
    var oplogAgg = new oplogAggBO.oplogAgg(TIMES, _ns)
    var res = db.getSiblingDB(OPLOG_DB_NAME).getCollection(OPLOG_COLLECTION_NAME).aggregate(oplogAgg).toArray()
    
    if (res.length > 0) {
        for (var r of res) {
            if (r._id === "Other") continue;
            _totalWrites += r.totalWrites || 0
            
            if (OUTPUT_FORMAT === 'json') {
                print(JSON.stringify({
                    timestamp: r._id instanceof Date ? r._id.toISOString() : r._id,
                    namespace: r.ns,
                    totalWrites: r.totalWrites,
                    inserts: r.insert,
                    updates: r.update,
                    removes: r.remove
                }));
            } else {
                print(`${r._id instanceof Date ? r._id.toISOString() : r._id};${r.ns};${r.totalWrites};${r.insert};${r.update};${r.remove}`);
            }
        }
    }
    namespaces.push({ ns: _ns, totalWrites: _totalWrites })
}

// Summary output
namespaces.sort((a, b) => b.totalWrites - a.totalWrites);

if (OUTPUT_FORMAT === 'json') {
    print(JSON.stringify({
        summary: {
            title: "Namespaces by total writes",
            data: namespaces
        }
    }));
} else {
    print("\n\nNamespaces by total writes");
    for (var ns of namespaces) {
        print(`${ns.ns};${ns.totalWrites}`);
    }
}