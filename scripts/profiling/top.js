const topBO = require("../../BOs/topBO.js");
const MIN_INTERVAL = 5;

const WINDOW = WINDOW ? Math.round(WINDOW / 5) * 5 : 5; // Default to 5 minutes if not set
const ITERATIONS = WINDOW / MIN_INTERVAL;

print(`Executing top.js with ${ITERATIONS}, 5-minute iterations for a total of ${WINDOW} minutes`);

var waitUntilTopOfMinute = () => {
    var currentTime = new Date();
    var minutes = currentTime.getMinutes();
    var seconds = currentTime.getSeconds();
    var milliseconds = currentTime.getMilliseconds();
    return (5 - (minutes % 5)) * 60 * 1000 - (seconds * 1000 + milliseconds);
}

var waitTime = waitUntilTopOfMinute();
var startTime = new Date();
startTime.setMilliseconds(startTime.getMilliseconds() + waitTime);
print("Start of program, waiting to start until " + startTime.toISOString());
sleep(waitUntilTopOfMinute());


var db = db.getSiblingDB("admin");
db.getMongo().setReadPref('primaryPreferred');
print(`TimeStamp;Namespace;Total Reads;Total Writes;Queries;Getmores;Inserts;Updates;Removes;Commands`)

for (var i = 0; i < ITERATIONS; i++) {

    var primaryTopRd1 = new topBO.topBO(db.runCommand({top: 1}));
    sleep(waitUntilTopOfMinute());
    var primaryTopRd2 = new topBO.topBO(db.runCommand({top: 1}));

    var end = new Date();
    end.setSeconds(0, 0); // Round to the nearest minute
    end = end.toISOString();

    var resMap = {}
    for (var ns in primaryTopRd2) {
        if (primaryTopRd1[ns]) {
            resMap[ns] = {
                totalReads: (primaryTopRd2[ns].commands.count+primaryTopRd2[ns].queries.count) - (primaryTopRd1[ns].commands.count + primaryTopRd1[ns].queries.count),
                totalWrites: (primaryTopRd2[ns].insert.count + primaryTopRd2[ns].update.count + primaryTopRd2[ns].remove.count) - (primaryTopRd1[ns].insert.count + primaryTopRd1[ns].update.count + primaryTopRd1[ns].remove.count),
                queries: primaryTopRd2[ns].queries.count - primaryTopRd1[ns].queries.count,
                getmore: primaryTopRd2[ns].getmore.count - primaryTopRd1[ns].getmore.count,
                insert: primaryTopRd2[ns].insert.count - primaryTopRd1[ns].insert.count,
                update: primaryTopRd2[ns].update.count - primaryTopRd1[ns].update.count,
                remove: primaryTopRd2[ns].remove.count - primaryTopRd1[ns].remove.count,
                commands: primaryTopRd2[ns].commands.count - primaryTopRd1[ns].commands.count,
            }
        } else {
            resMap[ns] = {
                totalReads: (primaryTopRd2[ns].commands.count + primaryTopRd2[ns].queries.count),
                totalWrites: (primaryTopRd2[ns].insert.count + primaryTopRd2[ns].update.count + primaryTopRd2[ns].remove.count),
                queries: primaryTopRd2[ns].queries.count,
                getmore: primaryTopRd2[ns].getmore.count,
                insert: primaryTopRd2[ns].insert.count,
                update: primaryTopRd2[ns].update.count,
                remove: primaryTopRd2[ns].remove.count,
                commands: primaryTopRd2[ns].commands.count,
            }
        }
    }

    for (var ns in resMap) {
        var strBuilder = `${end};${ns};`;
        for (var metric in resMap[ns]) {
            strBuilder += `${resMap[ns][metric]};`
        }
        print(strBuilder);
    }

}