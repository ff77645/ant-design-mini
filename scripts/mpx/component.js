import { createComponent } from '@mpxjs/core';

const mixin = {
  created(){
    if(!this.properties && this.props){
      Object.defineProperty(this,'properties',{
        get(){
          return this.props
        }
      })
    }
  }
}


export default (options) =>{
  const behaviors = options.behaviors || []
  const data = options.data || {}
  const properties = options.properties || {}

  behaviors.push(mixin)

  const newProperties = {}
  Object.keys(properties).forEach(key=>{
    if(typeof properties[key] === 'function') return
    if(data[key] !== undefined) return
    newProperties[key] = properties[key]
  })
  
  delete options.behaviors

  createComponent({
    ...options,
    properties:newProperties,
    mixins:behaviors,
  })
}