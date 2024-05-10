const httpClient = require('urllib');
const GROUP_ID = "<ATLAS_PROJECT_ID>"
const API_KEY = "<PUBLIC:PRIVATE>"
const FILTER_HOSTS = [  // use if more than 1 cluster

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

        console.log(`-------------------${process}--------------------------`)
        console.log(processSlowQueryRes.data)
        console.log(processSuggestedIndexesRes.data)
    }


}
main()