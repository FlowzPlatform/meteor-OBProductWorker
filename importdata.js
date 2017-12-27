let DDP = require('ddp');
let DDPlogin = require('ddp-login');
let Job = require('meteor-job');

// `Job` here has essentially the same API as JobCollection on Meteor.
// In fact, job-collection is built on top of the 'meteor-job' npm package!

// Setup the DDP connection
let ddp = new DDP({
  host: "localhost",
  port: 3000,
  use_ejson: true
});

function startImportToPDM(job) {
  consloe.log("======startImportToPDM======");
  consloe.log(job._doc.data);
  //job.done();
}


// Connect Job with this DDP session
Job.setDDP(ddp);

// Open the DDP connection
ddp.connect(function (err) {
  if (err) throw err;
  console.log("Connected")
  setInterval(function() {
    Job.getWork('OBImportJobQueue', 'ImportToPDM', function (err, job) {
      console.log(err)
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
