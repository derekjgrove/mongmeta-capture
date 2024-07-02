const httpClient = require('urllib');
const querystring = require('node:querystring'); 
const GROUP_ID = "<ATLAS_PROJECT_ID>"
const API_KEY = "<PUBLIC:PRIVATE>"
const KEY_DELIM = "$$$$$"
const PRIMARY_NAME = "REPLICA_PRIMARY"
const SECONDARY_NAME = "REPLICA_SECONDARY"
const FILTER_CLUSTERS = [  // use if you want to exclude clusters from results

]
const FIVE_DAYS = 832000000

async function main () {

    // Basic auth check
    var verifyAccessRes = await httpClient.request(`https://cloud.mongodb.com/api/atlas/v2/groups/${GROUP_ID}/`, 
        {
            method: 'GET',
            rejectUnauthorized: false,
            digestAuth: `${API_KEY}`,
            dataType: 'json',
            headers: {
                "Accept": "application/vnd.atlas.2023-11-15+json",
            }
        },
    )

    if (verifyAccessRes.status != 200) {
        console.error(`Got ${verifyAccessRes.status} code for basic project URI, add IP access in atlas or check API_KEY`)
        return
    }


    // Check if need to handle multiple clusters
    var clustersRes = await httpClient.request(`https://cloud.mongodb.com/api/atlas/v2/groups/${GROUP_ID}/clusters`, 
        {
            method: 'GET',
            rejectUnauthorized: false,
            digestAuth: `${API_KEY}`,
            dataType: 'json',
            headers: {
                "Accept": "application/vnd.atlas.2023-11-15+json",
            }
        },
    )

    // Get the available processes
    var processesRes = await httpClient.request(`https://cloud.mongodb.com/api/atlas/v2/groups/${GROUP_ID}/processes`, 
        {
            method: 'GET',
            rejectUnauthorized: false,
            digestAuth: `${API_KEY}`,
            dataType: 'json',
            headers: {
                "Accept": "application/vnd.atlas.2023-11-15+json",
            }
        },
    )

    // Map clusters to processes
    var clusters = clustersRes.data.results.map(cluster => {
        return { 
            replicaSetName: querystring.parse(cluster.connectionStrings.standard).replicaSet,
            name: cluster.name
        }
    });

    var processes = processesRes.data.results.map(process => {
        return {
            clusterName: clusters.find(cluster => cluster.replicaSetName === process.replicaSetName).name,
            id: process.id,
            typeName: process.typeName
        }
    });


    // Get the slow queries
    var queryHashMap = {}
    var performanceAdvisorObj = {}
    for (var process of processes.filter( _process => !FILTER_CLUSTERS.includes(_process.clusterName))) {
        var processSlowQueryRes = await httpClient.request(`https://cloud.mongodb.com/api/atlas/v2/groups/${GROUP_ID}/processes/${process.id}/performanceAdvisor/slowQueryLogs?duration=${FIVE_DAYS}`, 
            {
                method: 'GET',
                rejectUnauthorized: false,
                digestAuth: `${API_KEY}`,
                dataType: 'json',
                headers: {
                    "Accept": "application/vnd.atlas.2023-11-15+json",
                }
            },
        )

        var processSuggestedIndexesRes = await httpClient.request(`https://cloud.mongodb.com/api/atlas/v2/groups/${GROUP_ID}/processes/${process.id}/performanceAdvisor/suggestedIndexes?duration=${FIVE_DAYS}`, 
            {
                method: 'GET',
                rejectUnauthorized: false,
                digestAuth: `${API_KEY}`,
                dataType: 'json',
                headers: {
                    "Accept": "application/vnd.atlas.2023-11-15+json",
                }
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
      
    console.log(JSON.stringify(queryHashMap))
}
main()





// TODO redacter - https://medium.com/@stheodorejohn/recursive-value-transformation-in-javascript-unleash-the-power-of-data-manipulation-20b7f8ad3578