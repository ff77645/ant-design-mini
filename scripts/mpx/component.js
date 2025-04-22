import { createComponent } from '@mpxjs/core';

const mixin = {
  created() {
    if (!this.properties && this.props) {
      Object.defineProperty(this, 'properties', {
        get() {
          return this.props
        }
      })
    }
  }
}

const fnReg = /^on[A-Z]/
export default (options) => {
  const mixins = options.behaviors || []
  const data = options.data || {}
  const properties = options.properties || {}
  const methods = options.methods || {}

  mixins.push(mixin)

  const newProperties = {}
  Object.keys(properties).forEach(key => {
    // if(typeof properties[key] === 'function') return 
    if (fnReg.test(key)) return
    if (data[key] !== undefined || methods[key]) return
    newProperties[key] = properties[key]
  })

  delete options.behaviors
  delete options.properties
  options.properties = newProperties
  options.mixins = mixins

  createComponent(options)
}