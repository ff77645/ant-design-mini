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
    if (isDir(path.join(basePath, file))) {
      generateMpx(path.join(basePath, file))
    }
  })
  if (files.includes('index.json')) {
    createMpxFile(basePath)
  }
}

function createMpxFile(basePath) {
  const component = path.basename(basePath)
  const componentPath = path.join(basePath, 'index')
  let wxjs = fs.readFileSync(componentPath + '.js', 'utf8')
  const wxjson = fs.readFileSync(componentPath + '.json', 'utf8')
  const wxml = fs.readFileSync(componentPath + '.wxml', 'utf8')

  let wxss = null
  const wxssPath = componentPath + '.wxss'
  if (isExists(wxssPath)) {
    wxss = fs.readFileSync(wxssPath, 'utf8')
  }

  const regex = /Component([\s(,])/g
  const matchComponents = wxjs.match(regex)
  // 如果组件直接调用 Component 则替换为 createComponent
  if (matchComponents && matchComponents.length === 1) {
    wxjs = wxjs.replace(regex, 'createComponent$1')
    wxjs = `
import { createComponent } from '@mpxjs/core'
${wxjs}
`
  } else {
    wxjs = wxjs.replace(regex, 'ComponentImpl$1')
  }

  // 将wx api 替换为 mpx api
  const wxapi = wxjs.match(/wx\.\w+/g)
  const mpxApi = []
  if (wxapi) {
    const apis = [...new Set(wxapi)].map(s => s.split('.')[1])
    apis.forEach(api => {
      if (corssApi.includes(api)) {
        wxjs = wxjs.replaceAll(`wx.${api}`, api)
        mpxApi.push(api)
      } else {
        console.warn(`组件 ${component} 存在不兼容Api: ${api}.`)
      }
    })
  }
  if (mpxApi.length > 0) {
    wxjs = `
import { ${mpxApi.join(',')} } from '@mpxjs/api-proxy'
${wxjs}
`
  }

  const template = `
<template>
  ${wxml}
</template>
<script>
  ${wxjs}
</script>
<style>
  ${wxss || ''}
</style>
<script type="application/json">
  ${wxjson}
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
    if (file === 'value.js') {
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
  const componentPath = path.join(baseDir, '_util/component.js')
  fs.copyFileSync(path.resolve('./scripts/mpx/component.js'), componentPath)
  if (!isExists(backPath)) {
    fs.copyFileSync(originPath, backPath)
  }
  let content = fs.readFileSync(backPath, 'utf8')
  content = content.replaceAll('Component(', 'createComponent(')
  content = content.replaceAll('instance.properties', 'instance.properties || instance.props')
  content = content.replace(' as Component,', ',')
  content = `
import createComponent from './component.js';
${content}
`
  fs.writeFileSync(originPath, content, 'utf8')
}
