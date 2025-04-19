const fs = require('fs')
const path = require('path')
const { isDir, isExists } = require('./util.js')

const baseDir = path.resolve('compiled/wechat/src')
const ignoreFolder = ['_locale', '_util', 'mixins', 'Form', 'style']

main()

function main() {
  generateMpx(baseDir)
  generateMpx(path.join(baseDir, 'Form'))
  replaceMixins()
  replaceSimply()
}

function generateMpx(basePath) {
  let files = fs.readdirSync(basePath)
  files = files.filter(file => !ignoreFolder.includes(file) && isDir(path.join(basePath, file)))
  files.forEach(file => {
    fs.unlinkSync(path.join(basePath, file, 'index.mpx'))
  })
}

function replaceMixins() {
  const folder = path.join(baseDir, 'mixins')
  const mixinFiles = ['value.js', 'computed.js']
  mixinFiles.forEach(file => {
    const originPath = path.join(folder, file)
    const backPath = path.join(folder, path.basename(file, '.js') + '-back.js')
    if (isExists(backPath)) {
      const content = fs.readFileSync(backPath, 'utf8')
      fs.writeFileSync(originPath, content, 'utf8')
    }
  })
}

function replaceSimply() {
  const originPath = path.join(baseDir, '_util/simply.js')
  const backPath = path.join(baseDir, '_util/simply-back.js')
  if (isExists(backPath)) {
    const content = fs.readFileSync(backPath, 'utf8')
    fs.writeFileSync(originPath, content, 'utf8')
  }
}
