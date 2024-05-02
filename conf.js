const SCALE_KB = 1024
const SCALE_MB = 1024*1024
const SCALE_GB = 1024*1024*1024
const RESERVED_DBS = [
    "admin",
    "config",
    "local"
]
const RESERVED_COLLECTIONS = [
    "system"
    // "system.views",
    // "system.profile"
]
const RESERVED_OPS = [
    "command",
    "getMore"
]
const OUTPUT_STYLES = {
    th_line: "---------------------------------------------------------"
}

module.exports = {
    SCALE_KB,
    SCALE_MB,
    SCALE_GB,
    RESERVED_DBS,
    RESERVED_COLLECTIONS,
    OUTPUT_STYLES
}