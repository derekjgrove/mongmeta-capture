# mongmeta-capture

A MongoDB metadata and statistics capture tool for advanced diagnostics, profiling, and slow query analysis.

### Project Structure

```
BOs/
    collStatsBO.js
    dbStatsBO.js
    getCollectionInfosBO.js
    getIndexesBO.js
    indexStatsBO.js
conf.js
scripts/
    main.js
    profiling/
        top.js
        oplog.js
    atlasAdmin/
        profilernPerformanceAdvisor.js
        utils.js
views/
    appScript.js
    README.md
package.json
README.md
.gitignore
```

### License

MIT

## main.js (Data Definition Capture)

### Features

- Collects detailed stats for all databases and collections, including index and storage stats.
  - Gathers any storage fragmentation, storage sizes and counts
- The script uses secondary read preference for stats where possible.
- Gathers index statistics for both primary and secondary nodes. (the only usage of primary outside of getting dHandles' counts)
  - Helps determine impact of indexes if used at all and detects duplicate indexes
- Optionally lists Atlas Search indexes (MongoDB Enterprise 6+).
- Tracks open dHandles before and after stats collection.
- Supports multi-tenancy detection.
- Avoids performance impact by limiting dHandle usage in large/multi-tenant clusters.
- Outputs all results as EJSON for easy downstream processing.

### Usage

#### Prerequisites

- Node.js (for running scripts outside the mongo shell)
- MongoDB shell (for running scripts inside the mongo shell)
- DB Access to a MongoDB deployment (Atlas or self-hosted)
  - `clusterMonitor` and `readOnly` roles

#### Running the Script

You can run the main script in the mongo shell:

```sh
mongosh <connection-string> scripts/main.js
```

#### Options

- `onPrem`: Set to `true` for self-hosted deployments.

- `multiTenancyOverride`: Set to `true` to force full stats collection in multi-tenant environments.  
    > **Warning:** This will spin up dHandles, which impacts memory consumption and requires CPU cycles to create and destroy.
- `tenantIds`: Array of tenant IDs to filter collections/databases.

<ins>Examples</ins>:

```sh
mongosh <connection-string> scripts/main.js --eval 'var onPrem=true'
mongosh <connection-string> scripts/main.js --eval 'var tenantIds=["tenant1","tenant2"]'
mongosh <connection-string> scripts/main.js --eval 'var multiTenancyOverride=true'
```

### Output

- Info, database stats, and collection stats are printed as EJSON objects to the console.
- Each collection includes index stats, storage stats, and a redacted sample document.

#### Viewer
There is an `appScript.js` that can input the block of text generated from the shell into a tabular viewer in Google Sheets.

<ins>Steps:</ins>
1. Create new Google Sheets
2. Copy contents from `views/appScript.js` and paste into the Google Sheet's Apps Script and save
3. Rename the sheet as `Paste Input Here` and paste content from the script starting at row 2
4. In the header select `Custom Menu` --> `Import Cluster Stats`


### Multi-Tenancy

- The script auto-detects multi-tenant clusters (more than 1000 collections).
- By default, it avoids opening too many dHandles to prevent performance issues.
- Use `multiTenancyOverride` or `tenantIds` to control stats collection granularity.




## Profiler & Performance Advisor capture
### Setup

```shell
cd <PATH_TO_THIS_PACKAGE>
npm install
```
This script uses the Atlas Admin API to capture Profiler and Performance Advisor output. The following steps must be completed:
1. Create an Atlas Admin API key [[Instructions here](https://www.mongodb.com/docs/atlas/configure-api-access/)]
2. Replace `GROUP_ID` and `API_KEY` in the file `scripts\atlasAdmin\profilernPerformanceAdvisor.js`
3. (OPTIONAL) You can exclude clusters from project output with the `FILTER_CLUSTERS` variable


### Running
```shell
cd <PATH_TO_THIS_PACKAGE>/scripts/atlasAdmin
node profilernPerformanceAdvisor.js
```


## Namespace Usage ($top)
This script uses the MongoDB top command to get usage stats for each collection. Since these stats are persisted since last restart, this script compares results in segments of 5 minutes.
<br/>
Supply how long you want the window to be, for example: for 1 hour, supply `WINDOW=60`

Replace `60` with the desired duration in minutes.
```shell
cd <PATH_TO_THIS_PACKAGE>/scripts/profiling
mongosh "mongodb+srv://<user>:<pass>@<cluster_uri>" --file top.js --eval "WINDOW=60"
```

### Viewer
There is a quick chart `/profiling/chart.py`, modify the `file_path` variable with the actual path of the output from `top.js`