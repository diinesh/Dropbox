let trycatch = require('trycatch')
let main = require('./main')

// These will help us with troubleshooting
trycatch.configure({'long-stack-traces': true})
process.on('uncaughtException',function handleErrorAndExit(err){
	console.log('handleErrorAndExit: \n\n', err.stack)
    // IMPORTANT: Exit the process (optionally, soft exit)
})
process.on('unhandledRejection',function handleError(err){
	console.log('handleError: \n\n', err.stack)
    // IMPORTANT: Exit the process (optionally, soft exit)
})

console.log(main)
main.initialize(8000).catch(e => console.log(e.stack))

