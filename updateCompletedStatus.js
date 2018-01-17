const rfqQueue = require('rethinkdb-job-queue')
const config = require('config')
let rethink = require('rethinkdb')
let rpRequest = require('request-promise')
let rethinkDBConnection = config.get('rethinkDBConnection')
let connctionOption = rethinkDBConnection
const ImportCompleted = 'import_completed'
const masterJobStatusCompleted = 'completed'


let ESConnection = config.get('ESConnection')

let queueOption = {
  name: 'uploaderJobQueConfirm'
}

let optionsES = {
  tls: 'https://',
  host: ESConnection.host,
  path: '_xpack/security/user/',
  port: ESConnection.port,
  auth: ESConnection.auth
  // This is the only line that is new. `headers` is an object with the headers to request
  // headers: {'custom': 'Custom Header Demo works'}
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
      console.log('======startImportToConfirm======')
      // console.log(job)
      await doJob(job, next).catch((err) => {
        console.log('===========doJob=err======', err)
      })
      console.log('======startImportToPDM=end=====')
    } catch (err) {
      return next(err)
    }
  })
}
getJobQueue()

let rethinkDbConnectionObj
let doJob = async function (objWorkJob, next) {
  rethinkDbConnectionObj = await connectRethinkDB (rethinkDBConnection)
  return new Promise(async (resolve, reject) => {
    console.log('==============In Do Job==============')
    if (!objWorkJob.data) {
      return next(new Error('no job data'), objWorkJob)
    }
    let importTrackerValue = await getImportTrackerDetails(objWorkJob)
    console.log('==============importTrackerValue=====', importTrackerValue)
    if (importTrackerValue!==undefined) {

      // check user created on ES
      await getUserRequestResponse(objWorkJob)
        .then(async (result) => {
          console.log('==========userDataPrepared=result=====', result)
          await updateImportTrackerStatus(objWorkJob.data.importTrackerId)
            .then((result) => {
              next(null, 'success')
              resolve('success')
            })
            .catch((err) => {
                next(err)
             })
        })
        .catch((err) =>{
            next(err)
         })

      console.log('==============In Do Job End==============')
    }
    else {
        console.log('==============In Do Job with no data End==============')
        return next({'err': "trial"}, 'fail')
        reject("fail")
    }
    // return next(null, 'success')
  });
    // updateJobQueueStatus(objWorkJob)
}

async function connectRethinkDB (cxnOptions) {
  return new Promise((resolve, reject) => {
    console.log("connction object", cxnOptions)
    rethink.connect(cxnOptions, function (err, conn) {
      if (err) {
        console.log("connection error", err)
        // connectRethinkDB(cxnOptions)
      } else {
        resolve(conn)
      }
    })
  })
}

function updateImportTrackerStatus (trackerId) {
  return new Promise(async (resolve, reject) => {
    //let rethinkDbConnectionObj = await connectRethinkDB (rethinkDBConnection)
    rethink.db(rethinkDBConnection.db).table(rethinkDBConnection.table)
    .filter({'id': trackerId})
    .update({stepStatus: ImportCompleted, masterJobStatus: masterJobStatusCompleted})
    .run(rethinkDbConnectionObj, function (err, cursor) {
      if (err) {
        reject(err)
      } else {
        resolve('import_to_confirm status updated')
      }
    })
  })
}

let getUserRequestResponse = async function (objWorkJob) {
  return new Promise(async(resolve, reject) => {
    let jobData = objWorkJob.data
    let username = jobData.userdetails.id
    console.log('*********username*********', username)
    let userData = await getESUser(username)
    if (userData && Object.keys(userData).length > 0) {
      // User Exists
      let ESuserData = JSON.parse(userData)
      let username = objWorkJob.data.userdetails.id
      let userObject = ESuserData[username]
      userObject.metadata.user_version_history.push(userObject.metadata.sid)
      userObject.metadata.sid = getUserNewVersion(userObject)
      await makeHttpsPostRequest(username, userObject)
      resolve('user updated')
    }
  })
}

async function getESUser (username) {
  // make http request for user exist or not
  // makeHttpRequest(options, getUserRequestResponse, objWorkJob)
  return await makeHttpSRequest(username)
}

async function makeHttpSRequest (username) {
  console.log("makeHttpSRequest",username)
  let objOptions = optionsES
  try {
    let response = await rpRequest( objOptions.tls + objOptions.auth + '@' + objOptions.host + ':' + objOptions.port + '/' + objOptions.path + username)
    console.log("rpRequest...........",response)
    return response
  } catch (error) {
    return {}
  }
}

function getUserNewVersion (ESUser) {
  // console.log("===========",ESUser)
  let versionNo = 1
  if (ESUser.metadata.user_version_history) {
    versionNo = ESUser.metadata.user_version_history.length + 1
  }
  return 'sup' + ESUser.metadata.id + '-' + versionNo
}

async function makeHttpsPostRequest (username, userData) {
  let objOptions = optionsES
  let reqOptions = {
    method: 'POST',
    uri: objOptions.tls + objOptions.auth + '@' + objOptions.host + ':' + objOptions.port + '/' + objOptions.path + username,
    body: userData,
    json: true
  }

  let response = await rpRequest(reqOptions)
  return response
}

async function getImportTrackerDetails (objWorkJob) {
  // make http request for user exist or not
  // makeHttpRequest(options, getUserRequestResponse, objWorkJob)
  return new Promise(async (resolve, reject) => {
    try {
      // console.log("===========getImportTrackerDetails============1", rethinkDBConnection)
      let rethinkDbConnectionObj = await connectRethinkDB (rethinkDBConnection)
      // console.log("===========rethink conn obj created============",objWorkJob.data)
      let importData = await findImportTrackerData(rethinkDbConnectionObj, rethinkDBConnection.db, rethinkDBConnection.table, objWorkJob.data.importTrackerId)
      // console.log("===========treaker Data============", importData)
      resolve(importData)
    } catch (err) {
      console.log("========getImportTrackerDetails=",err)
      reject(null)
    }
  })
}

async function findImportTrackerData (rconnObj, rdb, rtable, findVal) {
  return new Promise(async (resolve, reject) => {
    console.log('================findVal=========', findVal)
    rethink.db(rdb).table(rtable)
    .filter({'id': findVal})
    .run(rconnObj, function (err, cursor) {
      if (err) {
        reject(err)
      } else {
        cursor.toArray(function(err, result) {
            if (err) {
              reject(err)
            } else {
              resolve(result[0]);
            }
        });
        // resolve(JSON.stringify(result, null, 2))
      }
    })
  })
}
