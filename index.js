let DDP = require('ddp');
let DDPlogin = require('ddp-login');
let Job = require('meteor-job');
let mongoose = require('mongoose');

let doJob = require("./worker.js");

// `Job` here has essentially the same API as JobCollection on Meteor.
// In fact, job-collection is built on top of the 'meteor-job' npm package!
mongoose.Promise = global.Promise;
// Connect to the beerlocker MongoDB
// mongoose.connect('mongodb://localhost:3001/meteor');
mongoose.connect('mongodb://139.59.35.45:27017/closeoutpromo',{ keepAlive: 800000, connectTimeoutMS: 800000}, function(err, db) {
  if(err){
    console.log("error.........",err)
  }
});
//mongoose.connect('mongodb://obdev:123456@ds133311.mlab.com:33311/closeoutpromo');
let ObjSchema = mongoose.Schema

/*
// Setup the DDP connection
let ddp = new DDP({
  host: "localhost",
  port: 3000,
  use_ejson: true
});
*/
// Setup the DDP connection
let ddp = new DDP({
  host: "localhost",
  port: 3000,
  use_ejson: true
});

function startImportToPDM(job) {
  console.log("======startImportToPDM======");
  console.log(job);
  doJob(job);
  console.log("======startImportToPDM======");
  //job.done();
}

/*

function callTempJobQueueCall()
{
  let ObjMain = new ObjSchema({_id: 'string'}, {strict: false, 'collection': 'OBImportJobQueue.jobs'})
  let modelOBImportJobQueue = mongoose.model('modelOBImportJobQueue', ObjMain)
  modelOBImportJobQueue.find({'_id': 'Ems9vAQw5rzxh5wrN'}, function (err, data) {
    if (!err) {
        //
      console.log(' Main File >>>> ',data)
      doJob(data[0])
    }
  })

  //console.log(jQueue);
  //startImportToPDM(jQueue[0]);
}
callTempJobQueueCall()

/*/

// Connect Job with this DDP session
Job.setDDP(ddp);

// Open the DDP connection
ddp.connect(function (err) {
  if (err) throw err;
  console.log("Connected")
  setInterval(function() {
    Job.getWork('OBImportJobQueue', 'ImportToPDM', function (err, job) {
      console.log("error.....................",err)
    if (job) {
       // You got a job!!!  Better work on it!
       // At this point the jobCollection has changed the job status to
       // 'running' so you are now responsible to eventually call either

       //console.log(job);
       startImportToPDM(job);
    }
  });
},1000);
  //});
});
//*/
module.exports = mongoose;
module.exports = ObjSchema;
