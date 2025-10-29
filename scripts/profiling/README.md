
## Usual usage
The script has defaults for most parameters including finding start time and end time automatically. The minimum required parameters are the oplog database and collection names.

```shell
mongosh "mongodb+srv://<user>:<pass>@<cluster_uri>" --file oplog.js --eval 'var oplogDb="<local_db_destination_name>"; var oplogCollection="oplog.rs"'
```


### Default Behavior

When no variables are specified, the script will:
- Analyze the `local.oplog.rs` collection
- Use the current day (00:00:00 to 23:55:00 UTC) as the time window
- Group operations in 5-minute intervals
- Output results in CSV format
- Include all namespaces (filtered by reserved databases)

### Time Format

All time values should be provided in ISO 8601 format:
- `"2025-01-01T00:00:00.000Z"` (UTC)
- `"2025-01-01T14:30:00.000+05:00"` (with timezone offset)

### Namespace Filtering

The `namespace` variable supports:
- Exact collection match: `"myapp.users"`
- Database-level filtering: `"myapp"` (includes all collections in myapp database)
- Dot notation: `"myapp."` (explicit database prefix)

### Output Formats

#### CSV Format
```
TimeStamp;Namespace;Total Writes;Inserts;Updates;Removes
2025-01-01T00:00:00.000Z;myapp.users;150;100;40;10
```

#### JSON Format
```json
{
  "timestamp": "2025-01-01T00:00:00.000Z",
  "namespace": "myapp.users",
  "totalWrites": 150,
  "inserts": 100,
  "updates": 40,
  "removes": 10
}
```


### Show help
```shell
mongosh "mongodb+srv://<user>:<pass>@<cluster_uri>" --file oplog.js --eval 'var help=true'
```

### All Variables
| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `oplogDb` | String | `'local'` | Database name containing the oplog collection |
| `oplogCollection` | String | `'oplog.rs'` | Name of the oplog collection to analyze |
| `startTime` | ISO Date String | Beginning of today (UTC) | Start time for oplog analysis window |
| `endTime` | ISO Date String | End of today (UTC) | End time for oplog analysis window |
| `interval` | Number | `5` | Time interval in minutes for grouping operations |
| `format` | String | `'csv'` | Output format: `'csv'` or `'json'` |
| `namespace` | String | `null` | Filter analysis to specific namespace (database.collection) |
| `help` | Boolean | `false` | Show help message and exit |

