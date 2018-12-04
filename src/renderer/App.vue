<template lang="pug">
#app
  router-view/
</template>

<script>
export default {
  name: 'Kg'
}
</script>

<style lang="stylus">
html
  font-family -apple-system, BlinkMacSystemFont, "Segoe WPC", "Segoe UI", HelveticaNeue-Light, "Noto Sans", "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "Source Han Sans SC", "Source Han Sans CN", "Source Han Sans", "Helvetica Neue", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Noto Emoji", "Segoe UI Emoji", "Segoe UI Symbol"
  height 100%
  text-size-adjust 100%
  touch-action manipulation

body
  height 100%
  margin 0
  -webkit-tap-highlight-color transparent
  -webkit-font-smoothing antialiased

.page
  position relative
  height 100%
  -webkit-overflow-scrolling touch
</style>
