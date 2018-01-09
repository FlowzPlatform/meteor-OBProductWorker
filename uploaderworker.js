const rfqQueue = require('rethinkdb-job-queue')
let mongoose = require('mongoose')
mongoose.connect('mongodb://139.59.35.45:27017/closeoutpromo',{ keepAlive: 800000, connectTimeoutMS: 800000, useMongoClient: true}, function(err, db) {
  if(err){
    console.log("error.........",err)
  }
});
let ObjSchema =  mongoose.Schema;
let doJob = require('./uploader.js')

let connctionOption = {
  host: '47.254.27.134',
  port: 28015,
  db: 'uploader'
}

let queueOption = {
  name: 'uploaderJobQue'
}

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection reason:', reason);
  // application specific logging, throwing an error, or other logic here
});

const objQ = new rfqQueue(connctionOption, queueOption)

function getJobQueue () {
  objQ.process(async (job, next) => {
    try {
      // Send email using job.recipient as the destination address
      console.log('======startImportToPDM======')
      // console.log(job)
      await doJob(job, next)
      console.log('======startImportToPDM=end=====')
    } catch (err) {
      return next(err)
    }
  })

  objQ.on('completed', (queueId, jobId, isRepeating) => {
    // console.log('Processing Queue: ' + queueId)
    // console.log('Job completed: ' + jobId)
    // console.log('Is job repeating: ' + isRepeating)
    let objJobMaster = new ObjSchema({_id: String}, {strict: false, 'collection': 'uploaderJobMaster'})
    let mdlobjJobMaster = null
    if (mongoose.models && mongoose.models.objJobMaster) {
      mdlobjJobMaster = mongoose.models.objJobMaster
    } else {
      mdlobjJobMaster = mongoose.model('objJobMaster', objJobMaster)
    }
    let objWorkJob = objQ.getJob(jobId)
    let jobData = objWorkJob.data
    //console.log("=====job data status======",jobData.id)
    let query = {'_id': jobData.id}
    let dataObj = {}
    dataObj.stepStatus = 'import_to_confirm'
    //{'$set': {'stepStatus': 'import_to_confirm'} },

      mdlobjJobMaster.findOne(query, function (err, data) {
        if (err) {
        //  console.log('===master job queue=====failed=========')
        } else {
          //data = data[0].toString()
          //data.stepStatus = 'import_to_confirm'
          let newObj = new mdlobjJobMaster(data)
          newObj.stepStatus = 'import_to_confirm'
          mdlobjJobMaster.update(data, newObj, function (err,resData) {
              //console.log('===master job queue=====succesfully saved=========')
          })
        }
      })
  })

}
getJobQueue()
