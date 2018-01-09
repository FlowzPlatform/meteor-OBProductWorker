const rfqQueue = require('rethinkdb-job-queue')
let doJob = require('./uploader.js')

let connctionOption = {
  host: '47.254.27.134',
  port: 28015,
  db: 'uploader'
}

let queueOption = {
  name: 'uploaderJobQue'
}

const objQ = new rfqQueue(connctionOption, queueOption)

function getJobQueue () {
  objQ.process((job, next) => {
    // Send email using job.recipient as the destination address
    console.log('======startImportToPDM======')
    console.log(job)
    doJob(job, next)
    console.log('======startImportToPDM=end=====')
  })
}
getJobQueue()
