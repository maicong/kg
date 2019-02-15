<template lang="pug">
.page.page-index
  .label(
    @mouseover="isHover = true",
    @mouseout="isHover = false"
  )
    input.input(
      ref="input",
      type="text",
      placeholder="输入 UID 并回车",
      v-model="uid",
      :readonly="isWait",
      @focus="onFocus()",
      @blur="onBlur()",
      @keyup.enter="loader(uid)"
    )
    ul.history(
      :class="{ 'history--active': isShowHistory }"
    )
      li.history-item(
        v-for="uid of uidList",
        @click="changeUid(uid)"
      ) {{ uid }}
  .message(
    :class="{ 'message--error': error }"
    v-show="msg"
  ) {{ error || msg }}
  .audio(
    :class="{ 'audio--loading': isWait }",
    v-show="isLoad || isWait"
  )
    .aplayer(
      ref="player",
      v-show="isLoad"
    )
    svg.circular(
      viewBox="0 0 36 36",
      v-show="isWait"
    )
      path.circle-bg(
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
      )
      path.circle(
        :stroke-dasharray="`${percentage}, 100`",
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
      )
      text.percentage(
        x="18",
        y="21"
      ) {{ percentage ? `${percentage}%` : '--' }}
</template>

<script>
import 'aplayer/dist/APlayer.min.css'

import APlayer from 'aplayer'
import Mousetrap from 'mousetrap'
import qs from 'qs'
import sessionstorage from 'sessionstorage'
import downloadjs from 'downloadjs'

import { get, size, map, indexOf, includes, round, replace } from 'lodash'
import { format } from 'date-fns'

export default {
  name: 'Index',
  data () {
    return {
      isLoad: false,
      isWait: false,
      isHover: false,
      isShowHistory: false,
      percentage: 0,
      uid: this.ssGet('__lastuid'),
      player: null,
      msg: '',
      error: '',
      uidList: this.ssGet('__uidlist') || [],
      dataList: []
    }
  },
  mounted () {
    if (this.uid) {
      this.loader(this.uid)
    }
  },
  methods: {
    /**
     * JSON
     */
    json (data, type) {
      try {
        return JSON[type](data)
      } catch (e) {
        return data
      }
    },
    /**
     * sessionStorage getItem
     */
    ssGet (key) {
      return this.json(sessionstorage.getItem(key), 'parse')
    },
    /**
     * sessionStorage setItem
     */
    ssSet (key, data) {
      return sessionstorage.setItem(key, this.json(data, 'stringify'))
    },
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
      const nick = replace(get(data, 'nick'), /\[em\].*?\[\/em\]/, '')
      const time = format(get(data, 'ctime') * 1000, 'YYYY/MM/DD HH:mm:ss')
      return {
        ksongmid: get(data, 'ksong_mid'),
        name: get(data, 'song_name'),
        singer: nick,
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
     * 下载
     */
    async downloadAudio (url, filename) {
      if (this.__isDownload) return
      this.__isDownload = true
      const data = await this.$http
        .get(url, {
          responseType: 'blob'
        })
        .then(res => res.data)
      if (data) {
        const blob = new Blob([data], {
          type: 'audio/mpeg'
        })
        downloadjs(blob, filename)
      }
      this.__isDownload = false
    },
    /**
     * 更换 uid
     */
    changeUid (uid) {
      this.uid = uid
      this.isShowHistory = false
      this.loader(uid)
    },
    /**
     * 输入框聚焦事件
     */
    onFocus () {
      if (this.isLoad && size(this.uidList) > 1) {
        this.isShowHistory = true
      }
    },
    /**
     * 输入框失焦事件
     */
    onBlur () {
      if (!this.isHover) {
        this.isShowHistory = false
      }
    },
    /**
     * 加载
     */
    async loader (uid) {
      if (this.__isLoader) return
      this.__isLoader = true

      if (this.player) {
        this.player.pause()
        this.player.destroy()
        this.player = null
      }

      this.error = ''
      this.isLoad = false
      this.isWait = true
      this.isShowHistory = false

      if (!uid) {
        this.msg = 'UID 不能为空'
        this.isWait = false
        this.__isLoader = false
        return
      }

      if (!includes(this.uidList, uid)) {
        this.uidList.push(uid)
      }

      this.percentage = 0
      this.msg = '加载歌单中...'
      this.ssSet('__lastuid', uid)
      this.ssSet('__uidlist', this.uidList)

      this.dataList = this.ssGet(`__uid_${uid}`) || []

      if (!size(this.dataList)) {
        const ids = await this.getIds(uid, 1)
        if (!size(ids)) {
          this.msg = '没有歌单信息'
          this.isWait = false
          this.__isLoader = false
          return
        }

        for (const id of ids) {
          const data = await this.getDetail(id)
          const ksongmid = get(data, 'ksongmid')
          const lrc = await this.getLyric(ksongmid)
          data.lrc = lrc || '[00:00.00] 暂无歌词'
          this.percentage = round(((indexOf(ids, id) + 1) / size(ids)) * 100)
          this.msg = `加载歌曲 (${indexOf(ids, id) + 1}/${size(ids)}) ${
            data.name
          }`
          this.dataList.push(data)
        }
      }

      this.isWait = false

      if (!size(this.dataList)) {
        this.msg = '没有歌曲'
        this.isLoad = false
      } else {
        this.msg = ''
        this.isLoad = true
        this.ssSet(`__uid_${uid}`, this.dataList)
        this.render()
      }

      this.__isLoader = false
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
        listMaxHeight: '262px',
        audio: this.dataList
      })

      this.$refs.input.blur()
      this.$refs.player.classList.remove('aplayer-withlrc')

      const el = document.querySelector('.aplayer-music')
      const span = document.createElement('span')

      span.classList = 'aplayer-link'
      span.textContent = '下载'

      el.appendChild(span)

      this.player.on('canplay', () => {
        const current = this.player.list.audios[this.player.list.index]
        span.onclick = async () => {
          await this.downloadAudio(
            current.url,
            `${current.name}-${current.singer}`
          )
        }
      })

      this.player.on('listswitch', () => {
        const lrcEl = document.querySelector('.aplayer-lrc-contents')
        lrcEl.style = `transform:translateY(0)`
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
    position relative
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
      border 1PX solid #ddd
      border-radius 3px
      box-sizing border-box
      outline 0
      transition all .2s
      &:focus
        border-color #bbb
      &::placeholder
        color #ccc
      &[readonly]
        opacity .65
        cursor not-allowed
    .history
      position absolute
      z-index 9
      top 41px
      left 10px
      right 10px
      padding 0
      max-height 186px
      margin 0 auto
      list-style none
      text-align center
      overflow auto
      cursor pointer
      background #fff
      box-shadow 0 3px 9px 0 #ccc
      transform translateY(-50%) scale(1, 0)
      transition transform .2s
      &--active
        transform translateY(0) scale(1, 1)
      &-item
        font-size 12px
        height 30px
        line-height 30px
        color #999
        background #fff
        border-bottom 1PX solid #eee
        transition background .2s
        &:hover
          background #e9e9e9
        &:last-child
          border-bottom 0
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
  .audio
    flex 1
    display flex
    &--loading
      align-items center
      justify-content center
  .circular
    width 80px
    height 80px
    .circle-bg
      fill none
      stroke #eee
      stroke-width 3.8
    .circle
      fill none
      stroke #3c9ee5
      stroke-width 2.8
      stroke-linecap round
      animation progress 1s ease-out forwards
      @keyframes progress
        0%
          stroke-dasharray 0 100
    .percentage
      fill #aaa
      font-size .5em
      text-anchor middle
  .aplayer
    flex 1
    padding-right 200px
    margin 0 !important
    box-shadow none
    &-body
      position initial
      padding 9px 10px
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
      width 200px
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
        p
          padding 0 10px !important
      &-current
        font-weight bold
      &:before,
      &:after
        height 30px
    &-music
      display flex
      align-items center
    &-author
      flex 1
      margin 0 6px
      white-space nowrap
      text-overflow ellipsis
      overflow hidden
    &-link
      font-size 12px
      text-align right
      cursor pointer
      color #666
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
      display block !important
      overflow auto !important
      width 100%
      &::-webkit-scrollbar
        display none
    &-list-index
      display inline-block
      width 12px
</style>
