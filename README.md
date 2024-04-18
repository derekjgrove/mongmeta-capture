# mongmeta-capture
mongmeta-capture uses MongoDB API to request DDL and DML definitions of your cluster. Data captured is a snapshot of what you see in a MongoDB client such as MongoDBCompass

## data capture
```shell
cd <PATH_TO_THIS_PACKAGE>
# set allowSampleDoc=false if you don't want me to output sample document from each collection
mongosh "mongodb+srv://<user>:<pass>@<cluster_uri>" --eval 'var allowSampleDoc = true' --file main.js
```

## viewer
There is an `appScript.js` that can input the block of text generated from the shell into a tabular viewer in Google Doc