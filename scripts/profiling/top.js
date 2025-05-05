const topBO = require("../../BOs/topBO.js");
const MIN = 5;

var start = (new Date().toISOString())
var db = db.getSiblingDB("admin");
db.getMongo().setReadPref('primary');
var primaryTopRd1 = new topBO.topBO(db.runCommand({top: 1}));
db.getMongo().setReadPref('secondary');
var secondaryTopRd1 = new topBO.topBO(db.runCommand({top: 1}));
sleep(MIN * 60 * 1000);
db.getMongo().setReadPref('primary');
var primaryTopRd2 = new topBO.topBO(db.runCommand({top: 1}));
db.getMongo().setReadPref('secondary');
var secondaryTopRd2 = new topBO.topBO(db.runCommand({top: 1}));
var end = (new Date().toISOString())

var resMap = {}
for (var ns in primaryTopRd2) {
    if (primaryTopRd1[ns]) {
        resMap[ns] = {
            "primary": {
                queries: primaryTopRd2[ns].queries.count - primaryTopRd1[ns].queries.count,
                getmore: primaryTopRd2[ns].getmore.count - primaryTopRd1[ns].getmore.count,
                insert: primaryTopRd2[ns].insert.count - primaryTopRd1[ns].insert.count,
                update: primaryTopRd2[ns].update.count - primaryTopRd1[ns].update.count,
                remove: primaryTopRd2[ns].remove.count - primaryTopRd1[ns].remove.count,
                commands: primaryTopRd2[ns].commands.count - primaryTopRd1[ns].commands.count,
            }
        }
    } else {
        resMap[ns] = {
            "primary": {
                queries: primaryTopRd2[ns].queries.count,
                getmore: primaryTopRd2[ns].getmore.count,
                insert: primaryTopRd2[ns].insert.count,
                update: primaryTopRd2[ns].update.count,
                remove: primaryTopRd2[ns].remove.count,
                commands: primaryTopRd2[ns].commands.count,
            }
        }
    }
}


for (var ns in secondaryTopRd2) {
    if (secondaryTopRd1[ns]) {
        resMap[ns].secondary = {

                queries: secondaryTopRd2[ns].queries.count - secondaryTopRd1[ns].queries.count,
                getmore: secondaryTopRd2[ns].getmore.count - secondaryTopRd1[ns].getmore.count,
                insert: secondaryTopRd2[ns].insert.count - secondaryTopRd1[ns].insert.count,
                update: secondaryTopRd2[ns].update.count - secondaryTopRd1[ns].update.count,
                remove: secondaryTopRd2[ns].remove.count - secondaryTopRd1[ns].remove.count,
                commands: secondaryTopRd2[ns].commands.count - secondaryTopRd1[ns].commands.count,
            }
        
    } else {
        resMap[ns].secondary = {

                queries: secondaryTopRd2[ns].queries.count,
                getmore: secondaryTopRd2[ns].getmore.count,
                insert: secondaryTopRd2[ns].insert.count,
                update: secondaryTopRd2[ns].update.count,
                remove: secondaryTopRd2[ns].remove.count,
                commands: secondaryTopRd2[ns].commands.count,
            
        }
    }
}


print(`${start} - ${end}`)
print(`------------------------------Primary------------------------------`)
print(`Namespace;Queries;Getmores;Inserts;Updates;Removes;Commands`)
for (var ns in resMap) {
    var strBuilder = `${ns};`;
    for (var metric in resMap[ns].primary) {
        strBuilder += `${resMap[ns].primary[metric]};`
    }
    print(strBuilder);
}

print(`------------------------------Secondary------------------------------`)
print(`Namespace;Queries;Getmores;Inserts;Updates;Removes;Commands`)
for (var ns in resMap) {
    var strBuilder =  `${ns};`;
    for (var metric in resMap[ns].secondary) {
        strBuilder += `${resMap[ns].secondary[metric]};`
    }
    print(strBuilder);
}