import App from './App'
import Vue from 'vue'
import axios from 'axios'
import { cacheAdapterEnhancer } from 'axios-extensions'
import fetchJsonp from 'fetch-jsonp'
import router from './router'
import store from './store'

if (!process.env.IS_WEB) Vue.use(require('vue-electron'))

axios.interceptors.request.use(
  config => config,
  error => {
    return Promise.reject(error.message)
  }
)

axios.interceptors.response.use(
  config => config,
  error => {
    return Promise.reject(error.message)
  }
)

const http = axios.create({
  headers: { 'Cache-Control': 'no-cache' },
  adapter: cacheAdapterEnhancer(axios.defaults.adapter)
})

Vue.http = Vue.prototype.$http = http
Vue.jsonp = Vue.prototype.$jsonp = fetchJsonp
Vue.config.productionTip = false

/* eslint-disable no-new */
new Vue({
  components: { App },
  router,
  store,
  template: '<App/>'
}).$mount('#app')
