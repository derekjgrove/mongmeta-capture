# mongmeta-capture
mongmeta-capture includes multiple utilities to capture cluster level statistics.

## DB data capture
```shell
cd <PATH_TO_THIS_PACKAGE>/scripts
# set allowSampleDoc=false if you don't want me to output sample document from each collection
mongosh "mongodb+srv://<user>:<pass>@<cluster_uri>" --eval 'var allowSampleDoc = true' --file main.js
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