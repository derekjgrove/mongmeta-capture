const SCALE_KB = 1024
const SCALE_MB = 1024*1024
const SCALE_GB = 1024*1024*1024
const RESERVED_DBS = [
    "admin",
    "config",
    "local"
]
const RESERVED_COLLECTIONS = [
    "system.views"
]

module.exports = {
    SCALE_KB,
    SCALE_MB,
    SCALE_GB,
    RESERVED_DBS,
    RESERVED_COLLECTIONS
}