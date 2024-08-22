const httpClient = require('urllib');
const querystring = require('node:querystring'); 

const GROUP_ID = "<ATLAS_PROJECT_ID>"
const API_KEY = "<PUBLIC:PRIVATE>"
const FILTER_CLUSTERS = [  // use if you want to exclude clusters from results

]

const KEY_DELIM = "$$$$$"
const PRIMARY_NAME = "REPLICA_PRIMARY"
const SECONDARY_NAME = "REPLICA_SECONDARY"
const TYPENAME_EXCLUDES = ['SHARD_CONFIG_SECONDARY', 'SHARD_CONFIG_PRIMARY']
const TIMEOUT = 60000*5
const FIVE_DAYS = 832000000
const BASIC_REQ_OPTIONS = {
    method: 'GET',
    rejectUnauthorized: false,
    digestAuth: `${API_KEY}`,
    dataType: 'json',
    headers: {
        "Accept": "application/vnd.atlas.2023-11-15+json",
    },
    timeout: TIMEOUT
}

async function main () {

    // Basic auth check
    var verifyAccessRes = await httpClient.request(`https://cloud.mongodb.com/api/atlas/v2/groups/${GROUP_ID}/`, 
        {
            ...BASIC_REQ_OPTIONS
        },
    )

    if (verifyAccessRes.status != 200) {
        console.error(`Got ${verifyAccessRes.status} code for basic project URI, add IP access in atlas or check API_KEY`)
        return
    }


    // Check if need to handle multiple clusters
    var clustersRes = await httpClient.request(`https://cloud.mongodb.com/api/atlas/v2/groups/${GROUP_ID}/clusters`, 
        {
            ...BASIC_REQ_OPTIONS
        },
    )

    // Get the available processes
    var processesRes = await httpClient.request(`https://cloud.mongodb.com/api/atlas/v2/groups/${GROUP_ID}/processes`, 
        {
            ...BASIC_REQ_OPTIONS
        },
    )

    // Map clusters to processes
    var clusters = await clustersRes.data.results.map(cluster => {
        var temp = querystring.parse(cluster.connectionStrings.standard)
        temp = Object.keys(temp)[0]
        temp = temp.substring(0, temp.lastIndexOf("/") );
        temp = temp.substring(10, temp.length)
        var fields = temp.split(",")

        var aliases = []
        for (var field of fields) {
            var subFields = field.split(":")
            aliases.push(subFields[0])
        }

        return { 
            aliases: aliases,
            name: cluster.name,
            clusterType: cluster.clusterType
        }
    });

    var processes = await processesRes.data.results.map(process => {
        if (!TYPENAME_EXCLUDES.includes(process.typeName)) {
            var parentCluster = clusters.find(cluster => cluster.aliases.includes(process.userAlias))
            
            // handle hidden nodes
            if (!parentCluster) { return null }

            // currently mongos' logs are not sourced in atlas slowQueries, ideally this will be used for sharded cluster to also conduct scatter gather analysis
            // typeName=SHARD_MONGOS

            return {
                clusterName: parentCluster.name,
                id: process.id,
                typeName: process.typeName
            }
           
        } else {
            return null
        }
    }).filter( process => process);


    // Get the slow queries
    var queryHashMap = {}
    var performanceAdvisorObj = {}
    for (var process of processes.filter( _process => !FILTER_CLUSTERS.includes(_process.clusterName))) {
        var processSlowQueryRes = await httpClient.request(`https://cloud.mongodb.com/api/atlas/v2/groups/${GROUP_ID}/processes/${process.id}/performanceAdvisor/slowQueryLogs?duration=${FIVE_DAYS}`, 
            {
                ...BASIC_REQ_OPTIONS
            },
        )

        var processSuggestedIndexesRes = await httpClient.request(`https://cloud.mongodb.com/api/atlas/v2/groups/${GROUP_ID}/processes/${process.id}/performanceAdvisor/suggestedIndexes?duration=${FIVE_DAYS}`, 
            {
                ...BASIC_REQ_OPTIONS
            },
        )

        if (!performanceAdvisorObj[process.clusterName]) {
            performanceAdvisorObj[process.clusterName] = {
                shapes: [],
                suggestedIndexes: []
            }
        }

        performanceAdvisorObj[process.clusterName].shapes.push(...processSuggestedIndexesRes.data.shapes)
        performanceAdvisorObj[process.clusterName].suggestedIndexes.push(...processSuggestedIndexesRes.data.suggestedIndexes)
        

        //Build unique slowQuery hashmap
        for (var slowQuery of processSlowQueryRes.data.slowQueries) {
            var formatedSlowQuery = JSON.parse(slowQuery.line)
            if (formatedSlowQuery?.attr?.queryHash) {
                if (!queryHashMap[`${process.clusterName}${KEY_DELIM}${slowQuery.namespace}${KEY_DELIM}${formatedSlowQuery?.attr?.queryHash}`]) {
                    queryHashMap[`${process.clusterName}${KEY_DELIM}${slowQuery.namespace}${KEY_DELIM}${formatedSlowQuery?.attr?.queryHash}`] = {
                        primaryOpCount : process.typeName === PRIMARY_NAME ? 1 : 0,
                        secondaryOpCount : process.typeName === SECONDARY_NAME ? 1 : 0,
                        ...formatedSlowQuery
                    }
                } else {
                    queryHashMap[`${process.clusterName}${KEY_DELIM}${slowQuery.namespace}${KEY_DELIM}${formatedSlowQuery?.attr?.queryHash}`][process.typeName === PRIMARY_NAME ? "primaryOpCount" : "secondaryOpCount"] += 1
                }
            } else {
                if (!formatedSlowQuery.attr.command.lsid) {
                } else {
                if (!queryHashMap[`${process.clusterName}${KEY_DELIM}${slowQuery.namespace}${KEY_DELIM}${formatedSlowQuery.attr.command.lsid.id["$uuid"]}`]) {
                    queryHashMap[`${process.clusterName}${KEY_DELIM}${slowQuery.namespace}${KEY_DELIM}${formatedSlowQuery.attr.command.lsid.id["$uuid"]}`] = {
                        primaryOpCount : process.typeName === PRIMARY_NAME ? 1 : 0,
                        secondaryOpCount : process.typeName === SECONDARY_NAME ? 1 : 0,
                        ...formatedSlowQuery
                    }
                } else {
                    queryHashMap[`${process.clusterName}${KEY_DELIM}${slowQuery.namespace}${KEY_DELIM}${formatedSlowQuery.attr.command.lsid.id["$uuid"]}`][process.typeName === PRIMARY_NAME ? "primaryOpCount" : "secondaryOpCount"] += 1
                }}
            }
        }
    }

    // Remove Duplicate shapes and suggestedIndexes (could be duplicated across nodes)
    for (var performanceAdvisorObjKey in performanceAdvisorObj) {
        performanceAdvisorObj[performanceAdvisorObjKey].shapes = performanceAdvisorObj[performanceAdvisorObjKey].shapes.filter((obj, index) => {
            return index === performanceAdvisorObj[performanceAdvisorObjKey].shapes.findIndex(o => obj.id === o.id);
        });

        performanceAdvisorObj[performanceAdvisorObjKey].suggestedIndexes = performanceAdvisorObj[performanceAdvisorObjKey].suggestedIndexes.filter((obj, index) => {
            return index === performanceAdvisorObj[performanceAdvisorObjKey].suggestedIndexes.findIndex(o => obj.id === o.id);
        });
    }

    // Converge profiler and performanceAdvisor
    var foundIndexes = []
    var foundShapes = []
    for (var performanceAdvisorObjKey in performanceAdvisorObj) {
        for (var shape of performanceAdvisorObj[performanceAdvisorObjKey].shapes) {
            var shapeIndexes = performanceAdvisorObj[performanceAdvisorObjKey].suggestedIndexes.filter(_suggestedIndex => _suggestedIndex.impact.includes(shape.id))
            if (shapeIndexes.length > 0) {
                shape.indexSuggested = shapeIndexes
                foundIndexes.push(...shapeIndexes.map(_suggestedIndex => _suggestedIndex.id))
            }
        
            for (var op of shape.operations) {
                var shapeExplain = JSON.parse(op.raw)
                if (shapeExplain?.attr?.queryHash) {
                    if (queryHashMap[`${performanceAdvisorObjKey}${KEY_DELIM}${shape.namespace}${KEY_DELIM}${shapeExplain?.attr?.queryHash}`]) {
                        delete op.raw
                        queryHashMap[`${performanceAdvisorObjKey}${KEY_DELIM}${shape.namespace}${KEY_DELIM}${shapeExplain?.attr?.queryHash}`].performanceAdvisor = shape
                        foundShapes.push(shape.id)
                    }
                } else if (shapeExplain?.attr?.command?.lsid) {
                    if (queryHashMap[`${performanceAdvisorObjKey}${KEY_DELIM}${shape.namespace}${KEY_DELIM}${shapeExplain?.attr?.command?.lsid?.id["$uuid"]}`]) {
                        delete op.raw
                        queryHashMap[`${performanceAdvisorObjKey}${KEY_DELIM}${shape.namespace}${KEY_DELIM}${shapeExplain?.attr?.command?.lsid?.id["$uuid"]}`].performanceAdvisor = shape
                        foundShapes.push(shape.id)
                    }
                }
            }
        
        }
    }

    // Remove all merged performance advisor entries (left over did not have profiler record)
    // Profiler goes back 5 days, Performance Advisor goes back 21 days
    for (var performanceAdvisorObjKey in performanceAdvisorObj) {
        performanceAdvisorObj[performanceAdvisorObjKey].suggestedIndexes = performanceAdvisorObj[performanceAdvisorObjKey].suggestedIndexes.filter(_suggestedIndex => !foundIndexes.includes(_suggestedIndex.id))
        performanceAdvisorObj[performanceAdvisorObjKey].shapes = performanceAdvisorObj[performanceAdvisorObjKey].shapes.filter(_shape => !foundShapes.includes(_shape.id))
        queryHashMap[performanceAdvisorObjKey] = {performanceAdvisorLeftOver: performanceAdvisorObj[performanceAdvisorObjKey]}
    }
      
    for (var hashKey in queryHashMap) {
        console.log(`{"${hashKey}":${JSON.stringify(queryHashMap[hashKey])}}`)
    }
}
main()





// TODO redacter - https://medium.com/@stheodorejohn/recursive-value-transformation-in-javascript-unleash-the-power-of-data-manipulation-20b7f8ad3578