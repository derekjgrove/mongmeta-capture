// creds - https://stackoverflow.com/a/29202760
const chunkSubstr = (str, size) => {
    const numChunks = Math.ceil(str.length / size)
    const chunks = new Array(numChunks)
  
    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
      chunks[i] = str.substr(o, size)
    }
  
    return chunks
}

module.exports = {
    chunkSubstr
}