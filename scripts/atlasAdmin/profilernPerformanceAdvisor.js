const httpClient = require('urllib');
const GROUP_ID = "<ATLAS_PROJECT_ID>"
const API_KEY = "<PUBLIC:PRIVATE>"
const FILTER_HOSTS = [  // use if more than 1 cluster per project

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

    var processes = processesRes.data.results.map(process => process.id)
    if (clustersRes.data.results.length > 1 && FILTER_HOSTS.length == 0) {
        console.log(`There is more than 1 cluster in this project, please add the unwanted process into the FILTERED_HOSTS list`)
        console.log(processes)
        return
    }


    // Get the slow queries
    var queryHashMap = {}
    var performanceAdvisorObj = {
        shapes: [],
        suggestedIndexes: []
    }
    for (var process of processes.filter( _process => !FILTER_HOSTS.includes(_process))) {
        var processSlowQueryRes = await httpClient.request(`https://cloud.mongodb.com/api/atlas/v2/groups/${GROUP_ID}/processes/${process}/performanceAdvisor/slowQueryLogs?duration=${FIVE_DAYS}`, 
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

        var processSuggestedIndexesRes = await httpClient.request(`https://cloud.mongodb.com/api/atlas/v2/groups/${GROUP_ID}/processes/${process}/performanceAdvisor/suggestedIndexes?duration=${FIVE_DAYS}`, 
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

        performanceAdvisorObj.shapes.push(...processSuggestedIndexesRes.data.shapes)
        performanceAdvisorObj.suggestedIndexes.push(...processSuggestedIndexesRes.data.suggestedIndexes)

        //Build unique slowQuery hashmap
        for (var slowQuery of processSlowQueryRes.data.slowQueries) {
            var formatedSlowQuery = JSON.parse(slowQuery.line)
            if (formatedSlowQuery?.attr?.queryHash) {
                if (!queryHashMap[`${slowQuery.namespace}-${formatedSlowQuery?.attr?.queryHash}`]) {
                    queryHashMap[`${slowQuery.namespace}-${formatedSlowQuery?.attr?.queryHash}`] = {opCount : 1, ...formatedSlowQuery}
                } else {
                    queryHashMap[`${slowQuery.namespace}-${formatedSlowQuery?.attr?.queryHash}`].opCount += 1
                }
            } else {
                if (!formatedSlowQuery.attr.command.lsid) {
                } else {
                if (!queryHashMap[`${slowQuery.namespace}-${formatedSlowQuery.attr.command.lsid.id["$uuid"]}`]) {
                    queryHashMap[`${slowQuery.namespace}-${formatedSlowQuery.attr.command.lsid.id["$uuid"]}`] = {opCount : 1, ...formatedSlowQuery}
                } else {
                    queryHashMap[`${slowQuery.namespace}-${formatedSlowQuery.attr.command.lsid.id["$uuid"]}`].opCount += 1
                }}
            }
        }
    }

    // Remove Duplicate shapes and suggestedIndexes (could be duplicated across nodes)
    performanceAdvisorObj.shapes = performanceAdvisorObj.shapes.filter((obj, index) => {
        return index === performanceAdvisorObj.shapes.findIndex(o => obj.id === o.id);
    });

    performanceAdvisorObj.suggestedIndexes = performanceAdvisorObj.suggestedIndexes.filter((obj, index) => {
        return index === performanceAdvisorObj.suggestedIndexes.findIndex(o => obj.id === o.id);
    });


    // Converge profiler and performanceAdvisor
    var foundIndexes = []
    var foundShapes = []
    
      for (var shape of performanceAdvisorObj.shapes) {
        var shapeIndexes = performanceAdvisorObj.suggestedIndexes.filter(_suggestedIndex => _suggestedIndex.impact.includes(shape.id))
        if (shapeIndexes.length > 0) {
            shape.indexSuggested = shapeIndexes
            foundIndexes.push(...shapeIndexes.map(_suggestedIndex => _suggestedIndex.id))
        }
    
        for (var op of shape.operations) {
            var shapeExplain = JSON.parse(op.raw)
            if (shapeExplain?.attr?.queryHash) {
                if (queryHashMap[`${shape.namespace}-${shapeExplain?.attr?.queryHash}`]) {
                    delete op.raw
                    queryHashMap[`${shape.namespace}-${shapeExplain?.attr?.queryHash}`].performanceAdvisor = shape
                    foundShapes.push(shape.id)
                }
            } else if (shapeExplain?.attr?.command?.lsid) {
                if (queryHashMap[`${shape.namespace}-${shapeExplain?.attr?.command?.lsid?.id["$uuid"]}`]) {
                    delete op.raw
                    queryHashMap[`${shape.namespace}-${shapeExplain?.attr?.command?.lsid?.id["$uuid"]}`].performanceAdvisor = shape
                    foundShapes.push(shape.id)
                }
            }
        }
    
    }

    // Remove all merged performance advisor entries (left over did not have profiler record)
    // Profiler goes back 5 days, Performance Advisor goes back 21 days
    performanceAdvisorObj.suggestedIndexes = performanceAdvisorObj.suggestedIndexes.filter(_suggestedIndex => !foundIndexes.includes(_suggestedIndex.id))
    performanceAdvisorObj.shapes = performanceAdvisorObj.shapes.filter(_shape => !foundShapes.includes(_shape.id))
    
    
    
    queryHashMap['performanceAdvisorLeftOver'] = performanceAdvisorObj
    console.log(JSON.stringify(queryHashMap))
}
main()





// TODO redacter - https://medium.com/@stheodorejohn/recursive-value-transformation-in-javascript-unleash-the-power-of-data-manipulation-20b7f8ad3578