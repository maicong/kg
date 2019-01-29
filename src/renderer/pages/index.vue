<template lang="pug">
.page.page-index
  .label
    input.input(
      type="text",
      placeholder="输入 UID 并回车",
      v-model="uid",
      :readonly="isWait",
      @keyup.enter="loader(uid)"
    )
  .message(
    :class="{ 'message--error': error }"
    v-show="msg"
  ) {{ error || msg }}
  .aplayer(
    ref="player",
    v-show="isLoad"
  ) Loading
</template>

<script>
import 'aplayer/dist/APlayer.min.css'

import APlayer from 'aplayer'
import Mousetrap from 'mousetrap'
import qs from 'qs'

import { get, size, map, indexOf } from 'lodash'
import { format } from 'date-fns'

export default {
  name: 'Index',
  data () {
    return {
      isLoad: false,
      isWait: false,
      showHistory: false,
      uid: '',
      player: null,
      msg: '',
      error: '',
      histories: [],
      dataList: []
    }
  },
  methods: {
    /**
     * 构建请求
     */
    async query (host, params) {
      const data = await this.$jsonp(`${host}?${qs.stringify(params)}`, {
        jsonpCallback: 'jsonpCallback',
        jsonpCallbackFunction: 'kg'
      })
        .then(res => {
          this.error = ''
          return res.json()
        })
        .catch(err => {
          this.error = err
          return ''
        })
      return data
    },
    /**
     * 获取歌曲列表
     */
    async getIds (uid, page = 1, ids = []) {
      const res = await this.query(
        'https://kg.qq.com/cgi/kg_ugc_get_homepage',
        {
          format: 'jsonp',
          inCharset: 'utf8',
          outCharset: 'utf-8',
          type: 'get_ugc',
          jsonpCallback: 'kg',
          share_uid: uid,
          start: page,
          num: 15
        }
      )

      const data = get(res, 'data')
      const ugclist = get(data, 'ugclist')

      if (size(ugclist)) {
        map(ugclist, v => ids.push(v.shareid))
        if (get(data, 'has_more')) {
          await this.getIds(uid, ++page, ids)
        }
        return ids
      }
      return []
    },
    /**
     * 获取歌曲详情
     */
    async getDetail (id) {
      const res = await this.query('https://kg.qq.com/cgi/kg_ugc_getdetail', {
        format: 'jsonp',
        inCharset: 'utf8',
        outCharset: 'utf-8',
        callback: 'kg',
        v: 4,
        shareid: id
      })

      const data = get(res, 'data')
      const nick = get(data, 'nick')
      const time = format(get(data, 'ctime') * 1000, 'YYYY/MM/DD HH:mm:ss')
      return {
        ksongmid: get(data, 'ksong_mid'),
        name: get(data, 'song_name'),
        artist: `${nick} (${time})`,
        url: get(data, 'playurl'),
        cover: get(data, 'cover')
      }
    },
    /**
     * 获取歌词
     */
    async getLyric (ksongmid) {
      const res = await this.query('https://kg.qq.com/cgi/fcg_lyric', {
        format: 'jsonp',
        inCharset: 'utf8',
        outCharset: 'utf-8',
        callback: 'kg',
        ksongmid: ksongmid
      })

      const data = get(res, 'data')
      if (data) {
        return data.lyric
      }
    },
    /**
     * 加载
     */
    async loader (uid) {
      if (this.player) {
        this.player.pause()
        this.player.destroy()
      }

      this.error = ''
      this.isWait = true

      if (!uid) {
        this.msg = 'UID 不能为空'
        this.isWait = false
        return
      }

      this.msg = '加载歌单中...'

      const ids = await this.getIds(uid, 1)
      if (!size(ids)) {
        this.msg = '没有歌单信息'
        this.isWait = false
        return
      }

      this.dataList = []

      for (const id of ids) {
        const data = await this.getDetail(id)
        const ksongmid = get(data, 'ksongmid')
        data.lrc = (await this.getLyric(ksongmid)) || '[00:00.00] 暂无歌词'
        this.msg = `加载歌曲 (${indexOf(ids, id) + 1}/${size(ids)}) ${
          data.name
        }`
        this.dataList.push(data)
      }

      this.isWait = false

      if (!size(this.dataList)) {
        this.msg = '没有歌曲'
        this.isLoad = false
      } else {
        this.msg = ''
        this.isLoad = true
        this.render()
      }
    },
    /**
     * 渲染
     */
    render () {
      this.player = new APlayer({
        container: this.$refs.player,
        volume: 0.8,
        lrcType: 1,
        mutex: true,
        mini: false,
        autoplay: true,
        preload: 'metadata',
        loop: 'all',
        order: 'list',
        listFolded: false,
        listMaxHeight: '230px',
        audio: this.dataList
      })

      this.$refs.player.classList.remove('aplayer-withlrc')

      const el = document.querySelector('.aplayer-music')
      const span = document.createElement('span')
      const link = document.createElement('a')

      span.classList = 'aplayer-link'
      link.textContent = '下载'

      span.appendChild(link)
      el.appendChild(span)

      this.player.on('canplay', () => {
        const current = this.player.list.audios[this.player.list.index]
        link.href = current.url
        link.download = `${current.name}-${current.artist}`
      })

      this.bindKey()
    },
    /**
     * 绑定按键
     */
    bindKey () {
      if (!this.player) return

      const maxIndex = this.dataList.length - 1

      // 切换播放
      Mousetrap.bind('space', () => {
        this.player.toggle()
      })
      // 上一首
      Mousetrap.bind(['up', 'left'], () => {
        this.player.list.switch(
          this.player.list.index === 0 ? maxIndex : this.player.list.index - 1
        )
      })
      // 下一首
      Mousetrap.bind(['down', 'right'], () => {
        this.player.list.switch(
          this.player.list.index === maxIndex ? 0 : this.player.list.index + 1
        )
      })
    }
  }
}
</script>

<style lang="stylus">
.page-index
  display flex
  flex-direction column
  .label
    padding 9px
    background #eee
    border-radius 3px
    .input
      width 100%
      height 30px
      line-height 30px
      font-size 12px
      padding 0 6px
      text-align center
      color #666
      border 1px solid #ddd
      border-radius 3px
      box-sizing border-box
      outline 0
      &:focus
        border-color #bbb
      &::placeholder
        color #ccc
      &:readonly
        opacity .65
        cursor not-allowed
  .message
    font-size 12px
    height 30px
    line-height 30px
    padding 0 12px
    margin-top -9px
    text-align center
    color #c79a2a
    background #eee
    border-radius 0 0 3px 3px
    &--error
      color #d03a3a
  .aplayer
    flex 1
    padding-right 180px
    margin 0 !important
    box-shadow none
    &-body
      position initial
      padding 9px
    &-info
      display flex
      flex-direction column
      justify-content space-between
      padding 0 5px
      border-bottom 0 !important
    &-lrc
      display block
      position absolute
      right 0
      top 0
      bottom 0
      width 180px
      height 100%
      margin auto
      border-left 5px solid #eee
      &-contents
        position absolute
        left 0
        top 0
        bottom 0
        margin auto
        height 16px
      &-current
        font-weight bold
      &:before,
      &:after
        height 30px
    &-music
      display flex
      align-items center
    &-author
      white-space pre-wrap
    &-link
      font-size 12px
      color #666
      flex 1
      text-align right
      a
        color currentColor
        text-decoration none
        &:hover
          color blue
    &-icon
      &-order,
      &-loop
        display inline !important
      &-menu,
      &-lrc
        display none !important
    &-list
      overflow auto !important
      &::-webkit-scrollbar
        display none
    &-list-index
      display inline-block
      width 12px
</style>
