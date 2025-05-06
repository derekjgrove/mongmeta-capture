# mongmeta-capture
mongmeta-capture includes multiple utilities to capture cluster level statistics.

## DB data capture
```shell
cd <PATH_TO_THIS_PACKAGE>/scripts
mongosh "mongodb+srv://<user>:<pass>@<cluster_uri>" --file main.js
```

### viewer
There is an `appScript.js` that can input the block of text generated from the shell into a tabular viewer in Google Doc
There is also an `sheets_appScript.js` that can input multiple rows of text generated from the shell into a sheets tabular view

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
