const fs = require('fs')

exports.isDir = (path) => {
  const stats = fs.statSync(path)
  return stats.isDirectory()
}

exports.isExists = path => {
  return fs.existsSync(path)
}
