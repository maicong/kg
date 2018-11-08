const APlayer = require('aplayer')
const Mousetrap = require('mousetrap')
const dataList = JSON.parse(process.env.MUSIC_LIST)

const player = new APlayer({
  element: document.getElementById('player'),
  autoplay: true,
  showlrc: false,
  mutex: true,
  preload: 'metadata',
  mode: 'circulation',
  listmaxheight: '230px',
  music: dataList
})
const el = document.querySelector('.aplayer-music')
const span = document.createElement('span')
const link = document.createElement('a')

span.classList = 'aplayer-link'
link.textContent = '下载'

span.appendChild(link)
el.appendChild(span)

player.on('canplay', () => {
  link.href = player.music.url
  link.download = `${player.music.title}-${player.music.author}`
})

const maxIndex = dataList.length - 1

Mousetrap.bind('space', () => {
  player.toggle()
})
Mousetrap.bind(['up', 'left'], () => {
  player.setMusic(player.playIndex === 0 ? maxIndex : player.playIndex - 1)
})
Mousetrap.bind(['down', 'right'], () => {
  player.setMusic(player.playIndex === maxIndex ? 0 : player.playIndex + 1)
})
