const fs = require('fs')
const path = require('path')
const { isDir, isExists } = require('./util.js')
const corssApi = require('./corss-api.js')

const baseDir = path.resolve('compiled/wechat/src')
const ignoreFolder = ['_locale', '_util', 'mixins', 'style']

main()

function main() {
  generateMpx(baseDir)
  replaceMixins()
  replaceSimply()
}

function generateMpx(basePath) {
  let files = fs.readdirSync(basePath)
  files = files.filter(file => !ignoreFolder.includes(file))
  files.forEach(file => {
    if(isDir(path.join(basePath,file))){
      generateMpx(path.join(basePath,file))
    }
  })
  if(files.includes('index.json')){
    createMpxFile(basePath)
  }
}

function createMpxFile(basePath) {
  const component = path.basename(basePath)
  const componentPath = path.join(basePath, 'index')
  let wxJs = fs.readFileSync(componentPath + '.js', 'utf8')
  const wxJson = fs.readFileSync(componentPath + '.json', 'utf8')
  const wxWxml = fs.readFileSync(componentPath + '.wxml', 'utf8')
  let wxWxss = null
  const wxssPath = componentPath + '.wxss'
  if (isExists(wxssPath)) {
    wxWxss = fs.readFileSync(wxssPath, 'utf8')
  }

  const regex = /Component([\s\(,])/g
  const matchComponents = wxJs.match(regex)
  if (matchComponents && matchComponents.length === 1) {
    wxJs = wxJs.replace(regex, 'createComponent$1')
    wxJs = `
import { createComponent } from '@mpxjs/core'
${wxJs}
`
  }else{
    wxJs = wxJs.replace(regex,'ComponentImpl$1')
  }

  const wxapi = wxJs.match(/wx\.\w+/g)
  const mpxApi = []
  if(wxapi){
    const apis = [...new Set(wxapi)].map(s=>s.split('.')[1])
    apis.forEach(api=>{
      if(corssApi.includes(api)){
        wxJs = wxJs.replaceAll(`wx.${api}`,api)
        mpxApi.push(api)
      }else{
        console.warn(`组件 ${component} 存在不兼容Api: ${api}.`)
      }
    })
  }
  if(mpxApi.length > 0){
    wxJs = `
import { ${mpxApi.join(',')} } from '@mpxjs/api-proxy'
${wxJs}
`
  }

  const template = `
<template>
  ${wxWxml}
</template>
<script>
  ${wxJs}
</script>
<style>
  ${wxWxss || ''}
</style>
<script type="application/json">
  ${wxJson}
</script>
`
  fs.writeFileSync(componentPath + '.mpx', template)
}

function replaceMixins() {
  const folder = path.join(baseDir, 'mixins')
  const mixinFiles = ['value.js', 'computed.js']
  mixinFiles.forEach(file => {
    const originPath = path.join(folder, file)
    const backPath = path.join(folder, path.basename(file, '.js') + '-back.js')
    if (!isExists(backPath)) {
      fs.copyFileSync(originPath, backPath)
    }
    let content = fs.readFileSync(backPath, 'utf8')
    content = content.replace('mixin = Behavior(mixin);', '')
    if(file === 'value.js'){
      content = content.replaceAll(
        'getValueFromProps(this, valueKey) !== null',
        'getValueFromProps(this, valueKey) !== null && getValueFromProps(this, valueKey) !== undefined'
      )
      content = content.replaceAll(
        'this.properties[valueKey] !== null',
        'this.properties[valueKey] !== null && this.properties[valueKey] !== undefined'
      )
    }
    fs.writeFileSync(originPath, content, 'utf8')
  })
}

function replaceSimply() {
  const originPath = path.join(baseDir, '_util/simply.js')
  const backPath = path.join(baseDir, '_util/simply-back.js')
  const componentPath = path.join(baseDir,'_util/component.js')
  fs.copyFileSync(path.resolve('./scripts/mpx/component.js'),componentPath)
  if (!isExists(backPath)) {
    fs.copyFileSync(originPath, backPath)
  }
  let content = fs.readFileSync(backPath, 'utf8')
  content = content.replaceAll('Component(', 'createComponent(')
  content = content.replaceAll('instance.properties','instance.properties || instance.props')
  content = content.replace(' as Component,',',')
  content = `
import createComponent from './component.js';
${content}
`
  fs.writeFileSync(originPath, content, 'utf8')
}
