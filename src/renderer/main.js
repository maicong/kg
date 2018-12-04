import App from './App'
import Vue from 'vue'
import axios from 'axios'
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

Vue.http = Vue.prototype.$http = axios
Vue.jsonp = Vue.prototype.$jsonp = fetchJsonp
Vue.config.productionTip = false

/* eslint-disable no-new */
new Vue({
  components: { App },
  router,
  store,
  template: '<App/>'
}).$mount('#app')
