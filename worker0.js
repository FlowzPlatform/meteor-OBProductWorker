let mongoose = require('mongoose')
let ObjectId = require('mongoose').Types.ObjectId
let elasticsearch = require('elasticsearch')
let http = require('http')
let https = require('https')
let extend = require('extend')
const uuidV1 = require('uuid/v1');
let ESuserData = null
let Promise = require('es6-promise').Promise
let ObjSchema =  mongoose.Schema;

//let esUrl = 'http://elastic:changeme@localhost:9200/'
let esUrl = 'https://elastic:SwmLSQli9PvtUNsm63Ce7dpr@7e94c6196993fd6c3d570a3d40e100d1.us-east-1.aws.found.io:9243'
let collectionPrefix = 'uploader'

let ESClient = new elasticsearch.Client({
  host: esUrl,
  log: 'trace'
})

let fileTypes =
  [ { id: 'ProductInformation', name: 'Product Information', isDone: false, isActive: true }, // header: ProductInformationHeaders, collection: CollProductInformation },
    { id: 'ProductPrice', name: 'Product Pricing', isDone: false, isActive: false }, // header: ProductPriceHeaders, collection: CollProductPrice },
    { id: 'ProductImprintData', name: 'Imprint Data', isDone: false, isActive: false }, // header: ProductImprintDataHeaders, collection: CollProductImprintData },
    { id: 'ProductImage', name: 'Image', isDone: false, isActive: false }, // header: ProductImageHeaders, collection: CollProductImage },
    { id: 'ProductShipping', name: 'Shipping', isDone: false, isActive: false }, // header: ProductShippingHeaders, collection: CollProductShipping },
    { id: 'ProductAdditionalCharges', name: 'Additional Charges', isDone: false, isActive: false }, // header: ProductAdditionalChargeHeaders, collection: CollProductAdditionalCharges },
    { id: 'ProductVariationPrice', name: 'Variation Price', isDone: false, isActive: false } // header: ProductVariationPricingHeaders, collection: CollProductVariationPrice }
  ]

let doJob = function(objWorkJob)
{
  console.log("==============In Do Job==============")
  if(!objWorkJob._doc)
  {
    return false
  }
  //objWorkJob = objWorkJob.toObject();
  //console.log(objWorkJob.data)
  // check user created on ES
  isUserExistsES(objWorkJob)

}

function isUserExistsES (objWorkJob) {
  //console.log(objWorkJob);
  let jobData = objWorkJob._doc.data
  //console.log("======3333=========");
  let username = jobData.username
  // let options = {
  //   host: 'localhost',
  //   path: '_xpack/security/user/' + username,
  //   port: '9200',
  //   auth: 'elastic:changeme'
  //   // This is the only line that is new. `headers` is an object with the headers to request
  //   // headers: {'custom': 'Custom Header Demo works'}
  // }

  let options = {

    host: 'e128e59136400347637da727965922e5.us-east-1.aws.found.io:9243',
    path: '_xpack/security/user/' + username,
    port: '9243',
    auth: 'elastic:OHQ0CzscklU0ttV59JicgNyH'
    // This is the only line that is new. `headers` is an object with the headers to request
    // headers: {'custom': 'Custom Header Demo works'}
  }


  // make http request for user exist or not
  // makeHttpRequest(options, getUserRequestResponse, objWorkJob)
  makeHttpSRequest(options, getUserRequestResponse, objWorkJob)
}

let getUserRequestResponse = function getUserRequestResponse (responseData, objWorkJob) {
  // console.log('is User Exists', responseData)
  if (Object.keys(responseData).length > 0) {
    // User Exists
    //console.log('User Exists', objWorkJob)
    ESuserData = JSON.parse(responseData)
    userDataPrepared(objWorkJob)
  } else {
    // make new user with version
    console.log('make new user with version', params)
  }
}

function userDataPrepared (objWorkJob) {
  //console.log('ESuserData', ESuserData)
  // user data not set throws exception user not exists
  if (!ESuserData) {
    // throws exception
  } else {
    //console.log(ESuserData)
    // make product wise json object for one product document
    gatherAllData(objWorkJob)
  }
}

function gatherAllData (objWorkJob) {
  let queueData = objWorkJob._doc.data
  // console.log(queueData)
  // object for file list
  let listObjects = []

  // prepare for file obejct set in job Data like product price ,shipping etc.
  fileTypes.forEach(function (value, index) {
    if (queueData[value.id]) {
      listObjects[index] = queueData[value.id]
      listObjects[index]['indexKey'] = value.id
    }
  })

  // ProductSchema
  // console.log(listObjects)
  // make particular product wise json object
  makeJson(objWorkJob, listObjects)
}

let perPageDataUpload = 2

function makeJson (objWorkJob, listObjects, offset) {
  // paging set up
  offset = offset !== undefined && offset > 0 ? offset : 1
  let perPage = perPageDataUpload * offset
  let skip = perPageDataUpload * (offset - 1)
  let mainFileObj = listObjects[0]
  //console.log(mainFileObj)
  let mainFileData = makeDynamicCollectionObj(mainFileObj['indexKey'])
  mainFileData.find({'fileID': mainFileObj.id}, function (err, data) {
    if (!err) {
        //
      console.log(' Main File >>>> ')
      mergeOtherProductData(objWorkJob, data, listObjects)
    }
  })//.skip(0).limit(1)
}

function mergeOtherProductData (objWorkJob, data, listObjects) {

  let jobData = objWorkJob._doc.data

  //console.log(`console ${data.length}`, listObjects)
  let makeProductJsonObj = []
  let getUserNextVersion = getUserNewVersion(ESuserData[jobData.username])
  //console.log("========",getUserNextVersion)
  data.forEach(function (value, index) {
    value = value.toObject()
    //console.log('ID:' + data[index])
    // new ObjectId(data[index]._id)
    // console.log(query);

    // -----file objects
    // listObjects.slice(1).forEach(function (fValue, fIndex) {
    //   console.log("=====",fValue,fIndex);
    //   let fileObj = makeDynamicCollectionObj(fValue['indexKey']);
    // })

    makeProductJsonObj.push({
      index: {
        _index: productIndex,
        _type: productDataType,
        _id: uuidV1() // data[index]._id
      }
    })
    // delete _id form value object
    delete (value._id)
    delete (value.fileID)
    delete (value.sr_no)
    delete (value.owner)

    //console.log(value)

    value['categories'] = convertStringToArray(value['categories'], '|')
    value['search_keyword'] = convertStringToArray(value['search_keyword'], '|')
    //console.log("=======length====",value['attr_colors'].length)
    if(value['attr_colors'] && value['attr_colors'].length > 0) {
      value.attributes = {}
      value.attributes.Colors = convertStringToArray(value['attr_colors'], '|')
    //  console.log("===========",value['attributies'])
    }
    //value['attr_colors'] = convertStringToArray(value['attr_colors'], '|')

    value['supplier_id'] = ESuserData[jobData.username]['metadata']['id']
    value['supplier_info'] = {
                              'company': ESuserData[jobData.username]['metadata']['company'],
                              'username': jobData.username,
                              'ownerId': jobData.owner
                            }
    value['vid'] = Array(getUserNextVersion)
    // value['vid'] = Array('sub5-1')
    makeProductJsonObj.push(value)
     return true
  })

  console.log(ESuserData)

  // delete data in ES for current version
  deleteESData(getUserNextVersion)

  // dump data in ES
  dumpToES(makeProductJsonObj,objWorkJob)
}

function getUserNewVersion (ESUser) {
  //console.log("===========",ESUser)
  let versionNo = ESUser.metadata.user_version_history.length + 1
  return 'sup'+ ESUser.metadata.id + '_' + versionNo
}

function promiseAllOtherData (skuData, listObjects) {
  return new Promise(function (result, error) {
  })
}

function makeDynamicCollectionObj (collectionName) {
  collectionName = collectionName.charAt(0).toUpperCase() + collectionName.slice(1).toLowerCase()
  let ObjMain = new ObjSchema({_id: 'string'}, {strict: false, 'collection': collectionPrefix + collectionName})
  let modelName = 'mdl'+collectionName
  if (mongoose.models && mongoose.models[modelName]){
    return mongoose.models[modelName]
  } else {
    return mongoose.model('mdl'+collectionName, ObjMain)
  }
}

const productIndex = 'pdm'
const productDataType = 'product'

function deleteESData (versionNo) {
  ESClient.deleteByQuery({
  index: productIndex,
  type: productDataType,
  body: {
    query: {
        term: { vid: versionNo }
      }
    }
  }, function (error, response) {
      //console.log(error)
      //console.log(response)
  })
}

function dumpToES (makeProductJsonObj, objWorkJob) {
  let bulkRowsString = makeProductJsonObj.map(function (row) {
    return JSON.stringify(row)
  }).join('\n') + '\n'

  //console.log(makeProductJsonObj);
  ESClient.bulk ({body : makeProductJsonObj}, function (err, resp) {
    if(!err) {
      console.log('Inserted');
      objWorkJob.done()
      updateJobQueueStatus(objWorkJob)
    } else {
      console.log('Insert faild')
      console.log(err)
    }
  })
}

function convertStringToArray (str, seprater) {
  return str.toString().split(seprater)
}

// to update user job queue process status to import_completed
function updateJobQueueStatus (objWorkJob) {
  let objJobMaster = new ObjSchema({_id:String}, {strict: false, 'collection': 'uploaderJobMaster'})
  let mdlobjJobMaster = null
  if (mongoose.models && mongoose.models.objJobMaster){
    mdlobjJobMaster = mongoose.models.objJobMaster
  } else {
    mdlobjJobMaster = mongoose.model('objJobMaster', objJobMaster)
  }

  let jobData = objWorkJob._doc.data
  //console.log("=====job data status======",jobData._id)
  let query = {'_id': jobData._id}
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
}



function makeHttpRequest (httpOptions, httpCallback, returnParameter) {
  let objHttpCallBack = httpCallback
  // ================================================================================
  // let options = {
  //   host: 'localhost',
  //   path: '_xpack/security/user/elastic',
  //   port: '9200',
  //   auth: 'elastic:changeme'
  //   // This is the only line that is new. `headers` is an object with the headers to request
  //   // headers: {'custom': 'Custom Header Demo works'}
  // }
  //
  let objOptions = null
  // console.log(options)
  // console.log(httpOptions)
  // extend(objOptions, httpOptions, options)
  // console.log(objOptions, httpOptions, options)

  objOptions = httpOptions

  let str = ''
  let callback = function (response) {
    response.on('data', function (chunk) {
      str += chunk
    })
    response.on('end', function () {
      // return to call back function which provide with Request
      objHttpCallBack(str, returnParameter)
    })
  }

  var req = http.request(objOptions, callback)
  req.end()
  // ================================================================================
}

function makeHttpSRequest (httpOptions, httpCallback, returnParameter) {
  let objHttpCallBack = httpCallback
  // ================================================================================
  // let options = {
  //   host: 'localhost',
  //   path: '_xpack/security/user/elastic',
  //   port: '9200',
  //   auth: 'elastic:changeme'
  //   // This is the only line that is new. `headers` is an object with the headers to request
  //   // headers: {'custom': 'Custom Header Demo works'}
  // }
  //
  let objOptions = null
  // console.log(options)
  // console.log(httpOptions)
  // extend(objOptions, httpOptions, options)
  // console.log(objOptions, httpOptions, options)

  objOptions = httpOptions

  // let str = ''
  // let callback = function (response) {
  //   response.on('data', function (chunk) {
  //     str += chunk
  //   })
  //   response.on('end', function () {
  //     // return to call back function which provide with Request
  //
  //   })
  // }
  //
  // var req = https.request(objOptions, callback)
  // req.end()

  var request = require('request');
  request('https://'+objOptions.auth+'@'+objOptions.host+':'+objOptions.port+'/'+objOptions.path, function (error, response, body) {
    console.log('error:', error); // Print the error if one occurred
    console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
    console.log('body:', body); // Print the HTML for the Google homepage.
    objHttpCallBack(body, returnParameter)
  })

  // ================================================================================
}


module.exports = doJob
