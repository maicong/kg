const Path = require('path')
const Url = require('url')
const Axios = require('axios')
const { get, size, map } = require('lodash')
const { app, BrowserWindow } = require('electron')

const getIds = async (uid, page = 1, ids = []) => {
  const res = await Axios({
    method: 'get',
    url: 'https://kg.qq.com/cgi/kg_ugc_get_homepage',
    params: {
      format: 'json',
      inCharset: 'utf8',
      outCharset: 'utf-8',
      type: 'get_ugc',
      share_uid: uid,
      start: page,
      num: 15
    },
    timeout: 30000,
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      'Cookie': ''
    }
  })
  const ugclist = get(res, 'data.data.ugclist')
  if (size(ugclist)) {
    map(ugclist, v => ids.push(v.shareid))
    await getIds(uid, ++page, ids)
    return ids
  }
  return []
}

const getDetail = async id => {
  const res = await Axios({
    method: 'get',
    url: 'https://kg.qq.com/cgi/kg_ugc_getdetail',
    params: {
      format: 'json',
      inCharset: 'utf8',
      outCharset: 'utf-8',
      v: 4,
      shareid: id
    },
    timeout: 30000,
    headers: {
      'X-Requested-With': 'XMLHttpRequest'
    }
  })
  const data = get(res, 'data.data')
  return {
    title: data.song_name,
    author: data.nick,
    url: data.playurl,
    pic: data.cover
  }
}

const getData = async uid => {
  const ids = await getIds(uid, 1)
  const datas = []
  for (const id of ids) {
    const data = await getDetail(id)
    datas.push(data)
  }
  return datas
}

let mainWindow = null

app.once('ready', async () => {
  mainWindow = new BrowserWindow({
    width: 640,
    height: 360,
    resizable: false,
    maximizable: false,
    show: false,
    webPreferences: {
      devTools: true,
      nodeIntegration: true
    }
  })

  const uid = process.argv.slice(2)[0]

  if (!uid) {
    console.error('UID is undefined!')
    app.quit()
    return
  }

  const data = await getData(uid)

  if (!size(data)) {
    console.error('No songs!')
    app.quit()
    return
  }

  process.env.MUSIC_LIST = JSON.stringify(data)

  mainWindow.loadURL(Url.format({
    pathname: Path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.minimize()
  })
  mainWindow.on('closed', () => {
    mainWindow = null
  })
  mainWindow.on('error', err => {
    console.log(err)
    mainWindow = null
    app.quit()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})
