const vscode = require('vscode')
const WebSocket = require('ws')

// 创建WebSocket服务器

/**
 * 消息格式
 * @typedef {{
 *      id: string|number,
 *      event: string,
 *      targetEvent?: string,
 *      description: string,
 *      data: any,
 *  }} SendParam
 */

/**
 * 事件列表：服务端->客户端
 * callback: 消息回调
 * openPage: 打开页面
 */

/**
 * 事件列表：客户端->服务端
 * openFile: vscode打开文件
 * relay-broadcast: 中转广播给其他客户端
 */

// 配置的项目列表
const config = vscode.workspace.getConfiguration('dawn').get('projectList') || {}

// 项目根目录地址列表
const rootUrlList = vscode.workspace.workspaceFolders.map(item => item.uri.path)

// 项目下有package.json文件的列表
const projectList = new Promise(done => {
    Promise.all(
        rootUrlList.map(
            item => new Promise(resolve => {
                vscode.workspace.openTextDocument(item + '/package.json').then(doc => {
                    try {
                        resolve(JSON.parse(doc.getText()))
                    } catch (error) {
                        resolve()
                    }
                }, err => {
                    resolve()
                })
            })
        )
    ).then(res => {
        done(res.reduce((prev, cur, index) => {
            cur && prev.push({
                name: cur.name,
                description: cur.description,
                path: rootUrlList[index],
            })
            return prev
        }, []))
    })
})

// 创建WebSocket服务器列表
projectList.then(res => {
    const wsList = []
    res.forEach(item => {
        if (!config.hasOwnProperty(item.name)) return
        const ws = new WebSocket.WebSocketServer({
            port: config[item.name],
        })
        wsList.push({
            ...item,
            ws,
            clientList: [],
        })
    })
    wsList.forEach(item => {
        item.ws.on('connection', client => {
            item.clientList = item.clientList.filter(e => e.readyState === WebSocket.OPEN)
            item.clientList.push(client)
            addListening(client, item)
        })
    })
})

// 添加事件监听
function addListening(...args) {
    addListening_openFile(...args)
    addListening_relayBroadcast(...args)
}

// 添加事件监听：openFile
function addListening_openFile(client, server) {
    client.on('message', e => {
        const { id, event, data } = JSON.parse(e.toString())
        if (event !== 'openFile') return
        const fullPath = /^[a-zA-z]:/.test(data)
            ? data
            : server.path + data
        vscode.window.showTextDocument(
            vscode.Uri.file(fullPath)
        ).then(
            () => client.send(JSON.stringify({
                id,
                event: 'callback',
                description: '打开文件成功',
                data: true,
            })),
            () => client.send(JSON.stringify({
                id,
                event: 'callback',
                description: '打开文件失败',
                data: false,
            })),
        )
    })
}

// 添加事件监听：relay-broadcast
function addListening_relayBroadcast(client, server) {
    client.on('message', e => {
        const { event, targetEvent, data } = JSON.parse(e.toString())
        if (event !== 'relay-broadcast') return
        server.clientList.forEach(_client => {
            if (_client === client) return
            _client.send(JSON.stringify({
                event: targetEvent,
                description: '中转广播给其他客户端',
                data,
            }))
        })
    })
}
