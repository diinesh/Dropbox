let express = require('express')
let then = require('express-then')
let trycatch = require('trycatch')
let path = require('path')
let fs = require('pn/fs')
let rimraf = require('rimraf')

let morgan = require('morgan')
let nodify=require('bluebird-nodeify')
let mime = require('mime-types')
let mkdirp = require('mkdirp')
let nssocket = require('nssocket')
let argv = require('yargs')
    .argv
const ROOT_DIR = argv.dir || path.resolve(process.cwd())
require('songbird')
const TCP_PORT = 8002

let sockets=[]



async function initialize(port) {
    let app = express()

    // Morgan provides HTTP logging
    app.use(morgan('dev'))

    // Use trycatch to send 500s and log async errors from requests
    app.use((req, res, next) => {
        trycatch(next, e => {
            console.log(e.stack)
            res.writeHead(500)
            res.end(e.stack)
        })
    })
    await app.promise.listen(port)

    console.log('LISTENING @ http://127.0.0.1:${port}')

    var server = nssocket.createServer(
    function (socket) {
        console.log('inside socket')
        sockets.push(socket);
        socket.data('Connecting', function (data) {
            console.log("There are now", sockets.length);

            for(var i=0, l=sockets.length; i<l; i++) {
                sockets[i].send('Broadcasting', 'data');
            }
        });
    }
    ).listen(TCP_PORT);
    console.log('LISTENING ${TCP_PORT} for Dropbox Clients')


let chokidar = require('chokidar')
let watcher = chokidar.watch('.', {ignored: /[\/\\]\./,ignoreInitial: true})


// Add event listeners. 
watcher
  .on('add', path => broadCastData('write', false, path))
  .on('change', path => broadCastData('write', false, path))
  .on('unlink', path => broadCastData('delete', false, path));


    app.get('*', setFileMetaData, sendHeaders, then(read))
    app.head('*',setFileMetaData, then(head))
    app.put('*', setFileMetaData,setDirDetails, put)
    app.post('*', setFileMetaData,setDirDetails, post)
    app.delete('*',setFileMetaData, then(remove))
}
 
function setFileMetaData(req, res, next){

    
        console.log('meta data')
    req.filePath=path.resolve(path.join(ROOT_DIR, req.url))
    fs.promise.stat(req.filePath).then(stats => req.stat = stats, ()=>req.stat=null)
    .nodeify(next)

}

function setDirDetails(req, res, next){

     
    let filePath=req.filePath
    let endswithslash = filePath.charAt(filePath.length -2 )===path.sep
    let hasExt=path.extname(filePath) !==''
    req.isDir = endswithslash || !hasExt
    
    req.dirPath   =req.isDir ? filePath : path.dirname(filePath)
    
    next()

}


async function sendHeaders(req, res, next) {
    // send headers logic

    if(req.stat.isDirectory()){
       let files= await fs.readdir(req.filePath)
       res.body=JSON.stringify(files)
       res.setHeader('Content-Length', res.body.length)
        res.setHeader('Content-Type', 'application/JSON')
        next()
        return
    }
    let contentType = mime.contentType(path.extname(req.filePath))
    res.setHeader('Content-Length', req.stat.size)
    res.setHeader('Content-Type', 'application/JSON')
    // console.log('stats: ', stats)
    next()
}
async function head(req, res) {
        console.log('head')
        res.end()
}

async function read(req, res) {
    // Your code here
    if(res.body){
        res.json(res.body)
        return
    }
   let readStream = fs.createReadStream(req.filePath)
   readStream.pipe(res)
}

 function put(req, res,next) {
    async()=>{
        if(req.stat) 
        return res.send(500, 'File exits' )

        await mkdirp.promise(req.dirPath)
        console.log(req.isDir)
        if(!req.isDir) req.pipe(fs.createWriteStream(req.filePath))
        res.end()
    }().catch(next)
}


 function post(req, res, next) {
    async()=>{
         if(!req.stat) 
        return res.send(405, 'File Not Exists' )

    if(req.isDir) 
        return res.send(405, 'Directory not Allowed' )

    await fs.truncate(req.filePath)
    req.pipe(fs.createWriteStream(req.filePath))
    res.end()
    }().catch(next)
}


async function update(req, res) {
    
    let filePath = path.join(process.cwd(), req.url)
    let data =  fs.promise.writeFile(filePath, JSON.stringify(req.body))
    res.end()
}


 async function remove(req, res) {
    console.log(' remove this ')
   
 console.log(' remove this 1 ')
    if(!req.stat) 
        return res.send(405, 'Method Not Allowed' )
    if(req.stat.isDirectory()){
        await rimraf.promise(req.filePath)
    }else{
        await fs.unlink(req.filePath)
    }

     console.log('remove')
    res.end()
 
}

function broadCastData(action, dir, path)
{
    let jsonString = '{ "action": "' + action + '","path":'
    jsonString = jsonString +  '"' + path + '","type": "'
    jsonString = jsonString + dir + '"}'

    for(var i=0, l=sockets.length; i<l; i++) {
        sockets[i].send('Broadcasting', jsonString);

    }
}



module.exports = {initialize}