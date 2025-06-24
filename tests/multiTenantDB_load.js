// usage - mongosh 'mongodb+srv://<URI>/?retryWrites=true&w=majority&appName=mongosh' --file multiTenantDB_load.js

const { UUID } = require("mongodb");
var collNames = ['apple', 'banana', 'cherry', 'date', 'elderberry', 'fig'];

for (var i = 0; i < 1000; i++) {
    db = db.getSiblingDB(`SomeService-${new UUID().toHexString()}`);
    for (var collName of collNames) {
        var coll = db.getCollection(collName);
        if (!coll.exists()) {
            coll.createIndex({ name: 1 });
            coll.insertMany([
                { name: `Item ${i} in ${collName}`, value: i },
                { name: `Item ${i + 1} in ${collName}`, value: i + 1 }
            ]);
        }
    }
}

//["0d9fd059-6e58-4857-8fcf-61ee4b3a91ad", "22d8e23b-5172-45c6-b286-0fa42429f4a3", "4d0566f9-48cd-4350-bedf-593db29b5e24"]