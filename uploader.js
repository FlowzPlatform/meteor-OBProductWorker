let mongoose = require('mongoose')
mongoose.set('debug', false);
let ObjectId = require('mongoose').Types.ObjectId

const config = require('config')

let elasticsearch = require('elasticsearch')
let rpRequest = require('request-promise')
let http = require('http')
let _ = require('underscore')
let https = require('https')
let extend = require('extend')
const uuidV1 = require('uuid/v1');
let ESuserData = null
let Promise = require('es6-promise').Promise
let ObjSchema =  mongoose.Schema;

let rethink = require('rethinkdb')
let rethinkDBConnection = config.get('rethinkDBConnection')

let attributeKeys = ['attr_colors','attr_imprint_color', 'attr_shape', 'attr_decimal']
let featureKeys = ['feature_1','feature_2','feature_3','feature_4','feature_5','feature_6','feature_7','feature_8','feature_9','feature_10','feature_11','feature_12','feature_13','feature_14','feature_15','feature_16','feature_17','feature_18','feature_19','feature_20','feature_21','feature_22','feature_23','feature_24','feature_25','feature_26','feature_27','feature_28','feature_29','feature_30','feature_31','feature_32','feature_33','feature_34']
// let esUrl = 'http://elastic:changeme@localhost:9200/'
let esUrl = 'https://elastic:qu4JFOrR1tU8doBqsFVPPlwc@269c1302a5a92a178fd5dd7b26759f32.us-east-1.aws.found.io:9243'
let collectionPrefix = 'uploader'
let activeSummary = []

let ESClient = new elasticsearch.Client({
  host: esUrl
//  log: 'trace'
})

let optionsES = {
  tls: 'https://',
  host: '269c1302a5a92a178fd5dd7b26759f32.us-east-1.aws.found.io',
  path: '_xpack/security/user/',
  port: '9243',
  auth: 'elastic:qu4JFOrR1tU8doBqsFVPPlwc'
  // This is the only line that is new. `headers` is an object with the headers to request
  // headers: {'custom': 'Custom Header Demo works'}
}

let fileTypes =
  [ { id: 'ProductInformation', name: 'Product Information', isDone: false, isActive: true, 'esKey': ''}, // header: ProductInformationHeaders, collection: CollProductInformation },
    { id: 'ProductPrice', name: 'Product Pricing', isDone: false, isActive: false, 'esKey': 'pricing' }, // header: ProductPriceHeaders, collection: CollProductPrice },
    { id: 'ProductImprintData', name: 'Imprint Data', isDone: false, isActive: false, 'esKey': 'imprint_data' }, // header: ProductImprintDataHeaders, collection: CollProductImprintData },
    { id: 'ProductImage', name: 'Image', isDone: false, isActive: false, 'esKey': 'images' }, // header: ProductImageHeaders, collection: CollProductImage },
    { id: 'ProductShipping', name: 'Shipping', isDone: false, isActive: false, 'esKey': 'shipping' }, // header: ProductShippingHeaders, collection: CollProductShipping },
    { id: 'ProductAdditionalCharges', name: 'Additional Charges', isDone: false, isActive: false, 'esKey': '1additional_charge' }, // header: ProductAdditionalChargeHeaders, collection: CollProductAdditionalCharges },
    { id: 'ProductVariationPrice', name: 'Variation Price', isDone: false, isActive: false, 'esKey': 'pricing' } // header: ProductVariationPricingHeaders, collection: CollProductVariationPrice }
  ]

let rethinkDbConnectionObj = null
let doJob = async function (objWorkJob, next) {
  rethinkDbConnectionObj = await connectRethinkDB (rethinkDBConnection)
  return new Promise(async (resolve, reject) => {
    console.log('==============In Do Job==============')
    if (!objWorkJob.data) {
      return next(new Error('no job data'), objWorkJob)
    }
    // check user created on ES
    let userData = await getUserRequestResponse(objWorkJob)

    console.log('========get user====', userData)
    let importTrackerValue = await getImportTrackerDetails(objWorkJob)
    console.log('==============importTrackerValue=====', importTrackerValue)
    if (importTrackerValue!==undefined) {

      objWorkJob.data = Object.assign({}, objWorkJob.data, importTrackerValue)
      console.log('==============New objWorkJob.data=', objWorkJob.data)

      await userDataPrepared(objWorkJob)
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

function updateImportTrackerStatus (trackerId) {
  return new Promise(async (resolve, reject) => {
    //let rethinkDbConnectionObj = await connectRethinkDB (rethinkDBConnection)
    rethink.db(rethinkDBConnection.db).table(rethinkDBConnection.table)
    .filter({'id': trackerId})
    .update({stepStatus: 'import_to_confirm'})
    .run(rethinkDbConnectionObj, function (err, cursor) {
      if (err) {
        reject(err)
      } else {
        resolve('import_to_confirm status updated')
      }
    })
  })
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

async function getESUser (username) {
  // make http request for user exist or not
  // makeHttpRequest(options, getUserRequestResponse, objWorkJob)
  return await makeHttpSRequest(username)
}

let getUserRequestResponse = async function (objWorkJob) {
  let jobData = objWorkJob.data
  let username = jobData.userdetails.id
  console.log('*********username*********', username)
  let userData = await getESUser(username)
  if (userData && Object.keys(userData).length > 0) {
    // User Exists
    ESuserData = JSON.parse(userData)
    let PreviewUserData = await makeNewPreviewUser(objWorkJob)
    return ESuserData
  } else {
    // make new user with version
    let userData = await makeNewUser(objWorkJob)
    let PreviewUserData = await makeNewPreviewUser(objWorkJob)
    return userData
  }
}

async function makeNewUser (objWorkJob) {
  let jobData = objWorkJob.data
  let username = jobData.userdetails.id
  console.log('username....', username)
  let userObject = {
    'password': '123456',
    'roles': ['read_write'],
    'full_name': jobData.userdetails.fullname!=='' && jobData.userdetails.fullname!==undefined?jobData.userdetails.fullname:'Supplier',
    'email': jobData.userdetails.email!=='' && jobData.userdetails.email!==undefined?jobData.userdetails.email:'',
    'metadata': {
      'id': username,
      'type': 'supplier',
      'company': jobData.userdetails.company!=='' && jobData.userdetails.company!==undefined?jobData.userdetails.company:''
    },
    'enabled': true
  }

  await makeHttpsPostRequest(username, userObject)

  let userData = await getESUser(username)
  console.log('==await response==', userData)
  if (userData && Object.keys(userData).length > 0) {
    // User Exists
    // console.log('User Exists', objWorkJob)
    ESuserData = JSON.parse(userData)
    return ESuserData
  }
}

async function makeNewPreviewUser (objWorkJob) {
  let jobData = objWorkJob.data
  let username = jobData.userdetails.id + '_demo'

  let userObject = {
    'password': '123456',
    'roles': ['read_write'],
    'full_name': jobData.userdetails.fullname!=='' && jobData.userdetails.fullname!==undefined?jobData.userdetails.fullname:'Supplier',
    'email': jobData.userdetails.email!=='' && jobData.userdetails.email!==undefined?jobData.userdetails.email:'',
    'metadata': {
      'id': username,
      'type': 'supplier',
      'company': jobData.userdetails.company!=='' && jobData.userdetails.company!==undefined?jobData.userdetails.company:'',
      'sid':getUserNewVersion(ESuserData[jobData.userdetails.id])
    },
    'enabled': true
  }


   makeHttpsPostRequest(username, userObject)

  // let userData = await getESUser(username)
  // console.log('==await response==', userData)
  // if (userData && Object.keys(userData).length > 0) {
  //   // User Exists
  //   // console.log('User Exists', objWorkJob)
  //   // ESuserData = JSON.parse(userData)
  //   return ESuserData
  // }
}


function getUserDataFromMongo(userid) {
  let ObjMain = new ObjSchema({_id: 'string'}, {strict: false, 'collection': 'users'})
  let modelOBUsers
  let modelName = 'mdlUsers'
  if (mongoose.models && mongoose.models[modelName]){
    modelOBUsers = mongoose.models[modelName]
  } else {
    modelOBUsers = mongoose.models[modelName] = mongoose.model(modelName, ObjMain)
  }
  let userDataa =  modelOBUsers.find({'_id': userid})
  return userDataa
}

async function userDataPrepared (objWorkJob) {
  //console.log('ESuserData', ESuserData)
  // user data not set throws exception user not exists
  return new Promise(async (resolve, reject) => {
    if (!ESuserData) {
      // throws exception
    } else {
      //console.log(ESuserData)
      // make product wise json object for one product document
      let listObjects = await gatherAllData(objWorkJob)
      // console.log("*********************** LIST OBJECTS",listObjects)
      let jobData = objWorkJob.data
      let currentProducts = []
      let futureProducts = []
      let makeProductUpdateJsonObj = []
      console.log("==================",objWorkJob.data.uploadType,"===============")
      if (objWorkJob.data.uploadType != 'replace') {
        currentProducts = await getCurrentProduct(ESuserData[jobData.userdetails.id]).catch(err => {
          console.log("getCurrentProduct err",err)
        })

        futureProducts = await getFutureProduct(listObjects).catch(err => {
          console.log("getFutureProduct err",err)
        })

        makeProductUpdateJsonObj = await getUpdateRecords(objWorkJob, currentProducts, futureProducts).catch(err => {
          console.log("getFutureProduct err",err)
        })

      }
      // console.log()
      await makeBatch(objWorkJob, listObjects, currentProducts, makeProductUpdateJsonObj)
      .then((result) => {
        console.log('=================================makeBatch=========result=====', result)
        resolve(result)
      })
      .catch((err) => {
        reject(err)
      })
    }
  })
}
let finalSKU = []
async function getUpdateRecords (objWorkJob, currentProducts, futureProducts) {
  let uploadType = objWorkJob.data.uploadType
  let jobData = objWorkJob.data
  // console.log("Current products...................",currentProducts)

  // if(currentProducts != undefined){

  let currntSKU = (Object.keys(currentProducts))
  let commonSKU = _.intersection(currntSKU, futureProducts)

  let finalUpdateSKU = []
  if(uploadType == 'append') {
    finalUpdateSKU = currntSKU
  } else {
    finalUpdateSKU = _.difference(currntSKU, commonSKU)
  }
  let makeProductUpdateJsonObj = []
  let getUserNextVersion1 = await getUserNewVersion(ESuserData[jobData.userdetails.id])

  finalUpdateSKU.forEach(async function (value, index) {
    finalSKU.push(value)
      makeProductUpdateJsonObj.push({
        update: {
          _index: productIndex,
          _type: productDataType,
          _id: currentProducts[value]._id // data[index]._id
        }
      })
      let updatedVId = currentProducts[value]._source.vid
      updatedVId.push(getUserNextVersion1)
      updatedVId = _.uniq(updatedVId)
      makeProductUpdateJsonObj.push({'doc': {'vid': updatedVId}})
  })
  return makeProductUpdateJsonObj;
// }
}

async function getCurrentProduct (usernameObj) {
  let currentProductsData = []
  let currentProducts = []
  if(usernameObj.metadata.sid) {
    currentProductsData = await getProductDataByESData(usernameObj, '').catch(err =>{
      console.log(err)
    })
  }
  else {
    return currentProducts
  }
  //  console.log("current ProductsData.......................",currentProductsData)
  //  console.log("current ProductsData hits.......................",currentProductsData.hits)
  //  console.log("current ProductsData hits hits.......................",currentProductsData.hits.hits)
  if(currentProductsData != undefined){
  currentProductsData = currentProductsData.hits.hits
  currentProducts = []
  currentProductsData.forEach(function (val, idx) {
    currentProducts[val._source.sku] = val
  })
  return currentProducts
 }
}

async function getFutureProduct (listObjects) {
return new Promise((resolve, reject) => {
    let mainFileObj = listObjects[0]
    //console.log(mainFileObj)
    let mainFileData = makeDynamicCollectionObj(mainFileObj['indexKey'])
     mainFileData.aggregate([
      {$match : {fileID : mainFileObj.id}},
      { $group : { _id : "$sku" } }
    ], function (err, data) {
      if(err){
        console.log("getFutureproduct",err)
        reject(err)
      }
      if (!err) {
        let arrSKU = data.map(function (a) { return a._id })
        resolve(arrSKU)
      }
    })
  })
}

function gatherAllData (objWorkJob) {
  let queueData = objWorkJob.data
  // console.log(queueData)
  // object for file list
  let listObjects = []
  // prepare for file obejct set in job Data like product price ,shipping etc.
  fileTypes.forEach(function (value, index) {
    if (queueData[value.id]) {
      listObjects[index] = queueData[value.id]
      listObjects[index]['indexKey'] = value.id
      listObjects[index]['esKey'] = value.esKey
      listObjects[index]['oldFlag'] = false
    } else {
      listObjects[index] = {}
      listObjects[index]['indexKey'] = value.id
      listObjects[index]['esKey'] = value.esKey
      listObjects[index]['oldFlag'] = true
    }
  })
  // ProductSchema
  // console.log(listObjects)
  // make particular product wise json object
  return listObjects
}

let perPageDataUpload = 10
let batchPromise = []
// to make batch for data upload
async function makeBatch (objWorkJob, listObjects, currentProductsData, makeProductUpdateJsonObj) {
  return new Promise(async (resolve, reject) => {
    console.log("============================IN MAKE BATCH============================");
    let jobData = objWorkJob.data
    let getUserNextVersion = await getUserNewVersion(ESuserData[jobData.userdetails.id])
    // delete data in ES for current version
    await deleteESData(getUserNextVersion, ESuserData[jobData.userdetails.id]).catch(err =>{
      console.log(err)
    })

    let mainFileObj = listObjects[0]
    //console.log(mainFileObj)
    let mainFileData = makeDynamicCollectionObj(mainFileObj['indexKey'])
    mainFileData.count({'fileID': mainFileObj.id,
                'sku':{$nin:finalSKU}},
      async function (err, total) {
      if (!err) {
          //
        console.log(' total data >>>> ', total)
        let totalBatch = 1
        if (total > perPageDataUpload) {
            totalBatch = Math.ceil(total / perPageDataUpload)
        }

        console.log('========', totalBatch)
        let batchPromiseObj
        for (let offset = 1; offset <= totalBatch; offset++) {

          batchPromiseObj = makeJson(objWorkJob, listObjects, offset, currentProductsData, makeProductUpdateJsonObj).catch(err => {
            console.log("Makebatch err", err)
          })
          //console.log('===============', batchPromiseObj)
          batchPromise.push(batchPromiseObj)
        }
        // mergeOtherProductData(objWorkJob, data, listObjects)

        batchPromiseObj.then((result) => {
          console.log("===========================batchPromiseObj=result======", result)
          resolve(result)
        })

        // setAllPromiseResolved(resolve, reject, batchPromise)
      }
    })
  })
}

function setAllPromiseResolved (resolve, reject, batchPromise1) {
  let allPromise = Promise.all(batchPromise)
  .then(values => {
    console.log('===========Promise==All=Done=========', values)
    resolve("From all Batch Import Done")
  }, reason => {
    console.log("===========Promise==All=error=========", reason)
    console.log(reason)
  })
  .catch(err => console.log('Catch', err));
}

let makeJson = function (objWorkJob, listObjects, offset, currentProductsData, makeProductUpdateJsonObj) {
  return new Promise(function (resolve) {
    // paging set up
    offset = offset !== undefined && offset > 0 ? offset : 1
    let skip = perPageDataUpload * (offset - 1)
    let mainFileObj = listObjects[0]
    //console.log(mainFileObj)
      let mainFileData = makeDynamicCollectionObj(mainFileObj['indexKey'])
      mainFileData.find({'fileID': mainFileObj.id,
                  'sku': {$nin: finalSKU}}, function (err, data) {
        if (!err) {
          //
          console.log(' Main File >>>> ')
          // console.log("Data:-----------",data)
          mergeOtherProductData(objWorkJob, data, listObjects, currentProductsData, makeProductUpdateJsonObj)
          .then((result) => {
            console.log('==========mergeOtherProductData=result=====', result)
            resolve(result)
          })
          .catch((err) => {
            reject(err)
          })
        }
      }).skip(skip).limit(perPageDataUpload)
  })
}

async function mergeOtherProductData (objWorkJob, data, listObjects, currentProductsData, makeProductUpdateJsonObj) {
return new Promise(async (resolve, reject) => {
    let jobData = objWorkJob.data

    //console.log(`console ${data.length}`, listObjects)
    let makeProductJsonObj = makeProductUpdateJsonObj
    let activeSummaryObj
    let getUserNextVersion = await getUserNewVersion(ESuserData[jobData.userdetails.id])

    //console.log("========",getUserNextVersion)
    let currentProductData = []

    data.forEach(async function (value, index) {

      value = value.toObject()
      // console.log("*************VALUE***********",value);

      activeSummary.length = 0;
      // console.log("**************************",activeSummary,"*******************");

      if(jobData.uploadType == 'update') {
        if(currentProductsData[value.sku] == undefined) {
          return true
        }
      }
      //console.log('ID:' + data[index])
      // new ObjectId(data[index]._id)
      // console.log(query);
      //let currentProductData = await getProductDataByESData(ESuserData[jobData.userdetails.id], value.sku)
      if(currentProductsData[value.sku]) {
          currentProductData = currentProductsData[value.sku]._source
      } else {
          currentProductData = undefined
      }

      // -----file objects
     let otherValue = null
     listObjects.slice(1).forEach(function (fValue, fIndex) {
      //  console.log("_________________fvalue___________",fValue);
      //  console.log("_________________findex___________",fIndex);
      //  console.log(".............Calling getProductSpecificOtherValues...............")
         getProductSpecificOtherValues(fValue, value, currentProductData)
     })

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
      // let available_regions =  value['available_regions'].toString();
      // console.log("*********************",  available_regions)
      // let available_regions_data = {}
      // available_regions_data.push(available_regions)
      // value['available_regions'] = available_regions.split(",")
      // console.log("*********************",  value['available_regions'])
       if(value['available_regions']){
         value['available_regions'] = convertStringToArray(value['available_regions'], ',')
       }
       else{
         value['available_regions'] = []
       }

       if(value['non-available_regions']){
         value['non-available_regions'] = convertStringToArray(value['non-available_regions'], ',')
       }
       else{
         value['non-available_regions'] = []
       }

      value['available_currencies'] = convertStringToArray(value['available_currencies'], '|')
      if(value['categories']){
      value['categories'] = convertStringToArray(value['categories'], '|')
      }
      if(value['search_keyword']){
      value['search_keyword'] = convertStringToArray(value['search_keyword'], '|')
      }
      // value['available_regions'] = convertStringToArray(value['available_regions'], ',')
      // value['nonavailable_regions'] = convertStringToArray(value['nonavailable_regions'], ',')



      attributeKeys.forEach(function (aIndex, aValue) {
        if(value[aIndex] && value[aIndex].length > 0) {
            if(!value.attributes) {
              value.attributes = {}
            }
            let keyValue = aIndex.replace('attr_', '')
            value.attributes[keyValue] = convertStringToArray(value[aIndex], '|')
            let attributes = value.attributes[keyValue].join();
            activeSummary.push(attributes);
            // console.log("ACTIVE SUMMARY.............",activeSummary);

            delete(value[aIndex])
        }
      })

       let featuresArray = [];
      featureKeys.forEach(function (fIndex, fValue) {
        // console.log("---------------findex---------------",fIndex);
        // console.log("---------------fValue---------------",fValue);
        // console.log("---------------value[fIndex]---------------",value[fIndex]);
        if(value[fIndex] && value[fIndex].length > 0) {
            if(!value.features) {
              value.features = {}
            }
            let keyValue = fIndex.replace('feature_', '')


            // let key = "key"
            // let value = "value"
            // console.log("***************************",keyValue,"**************************");
            let featuresArr = convertStringToArray(value[fIndex], '|')
            featuresArray.push({"key":featuresArr[0],"value":featuresArr[1]})
            let features = featuresArr.join();
            activeSummary.push(features);
            delete(value[fIndex])
        }
      })
      value.features = featuresArray
      // console.log("^^^^^^^^^^^^^^^^^^^^^^^value['features']^^^^^^^^^^^^^^^^^^^^^",value.features);





      value['activeSummary'] = activeSummary.join()
      // console.log("++++++++++++++++++++++++++",value['activeSummary'])

      //value['attr_colors'] = convertStringToArray(value['attr_colors'], '|')
      // console.log("---------------------------------------->",ESuserData[jobData.userdetails.id]['metadata']['company'])
      // value['supplier_id'] = ESuserData[jobData.userdetails.id]['metadata']['id']
      value['supplier_id'] = ESuserData[jobData.userdetails.id]['metadata']['id']
      value['supplier_info'] = {
                                'company': ESuserData[jobData.userdetails.id]['metadata']['company'],
                                'username': jobData.userdetails.id,
                                'supplier_name': jobData.userdetails.fullname,
                                'email': jobData.userdetails.email
                              }
      value['vid'] = Array(getUserNextVersion)

      // console.log("Active Summary in the end......",activeSummary);
      // activeSummaryObj = toObject(activeSummary);
      // activeSummaryObj =activeSummary.reduce(function(acc, cur, i) {
      //   acc[i] = cur;
      //   return acc;
      // }, {});
      // console.log("Active Summary Object.................",activeSummaryObj)
      // value['vid'] = Array('sub5-1')
      // console.log("---------------Value For ES--------",value)
      makeProductJsonObj.push(value)
      // makeProductJsonObj.push({activeSummary:activeSummaryObj})
      // console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",JSON.stringify(makeProductJsonObj))
    //  return true
    })

    //console.log(ESuserData)

    // dump data in ES
    //  await PushToES(activeSummary)
    await dumpToES(makeProductJsonObj)
    .then((result) => {
      console.log('==========dumpToES=result=====', result)
      resolve(result)
    })
    .catch(err => {
      console.log(err)
      reject(err)
    })

  })
}

// for (var i = 0; i < activeSummary.length; i++ ) {
//     ESClient.create({
//       index: productIndex,
//       type: productDataType,
//       body: activeSummary[i]
//     }, function(error, response){
//       if(!err){
//         console.log("active summary inserted.....");
//       }
//     });
// }

async function getProductSpecificOtherValues (fValue, value, currentVal) {
  // console.log(".............In getProductSpecificOtherValues................. ")
  let currency_key = ""
  let min_price = ""
  let max_price = ""
  if(fValue['oldFlag'] === true) {
    if(currentVal && currentVal[fValue['esKey']]) {
      if(value[fValue['esKey']]) {
          value[fValue['esKey']] = {}
      }
      value[fValue['esKey']] = currentVal[fValue['esKey']]
    }
  } else {
    let collObject = makeDynamicCollectionObj(fValue['indexKey'])
    let available_currencies = convertStringToArray(value['available_currencies'], '|')
    let baseCurrency =   available_currencies[0]
    // console.log("************* baseCurrency",baseCurrency,"****************")

    await collObject.find({'sku': value.sku, 'fileID': fValue['id']}, function (err, result) {
      if(!err) {
        if(result.length > 0) {
          let pricingArr = {}
          result.forEach(function (value, index) {
            result[index] = result[index].toObject()
            delete result[index].fileID
            delete result[index].owner
            delete result[index].username
            delete result[index].sr_no

            if(fValue['indexKey'] == 'ProductShipping'){
              result[index].shipping_range = formatShippingRange(result[index])
              // console.log("**************  result[index].shipping_range***************",result[index].shipping_range)
            }

            if(fValue['indexKey'] == 'ProductImage'){
              result[index].images = formatImages(result[index])
              console.log("###########",result[index])
            }

            if(fValue['indexKey'] == 'ProductPrice') {
              if(result[index].currency != baseCurrency){

                currency_key = '_' + result[index].currency;

              }
              else {
                currency_key = ''
              }

                result[index].price_range = formatPriceRange(result[index])
                // console.log("result[index]..........",result[index])
                // console.log("result[index][price_type]..........",result[index]["price_type"])
                if(result[index]["price_type"]== "regular" && (result[index]["type"]== "decorative" || result[index]["type"]== "") && result[index]["global_price_type"] == "global"){
                min_price = result[index]["price_range"][0]["price"]

                let price_range = result[index]["price_range"]
                // console.log("price_range",price_range)
                for(i=0;i<price_range.length;i++){
                  let length = price_range.length
                  // console.log("length...",length)
                  if(length > 1){
                    // console.log("called........")
                  max_price = price_range[length-1]["price"]
                  // console.log("max_price",max_price)
                  }
                }
              }


              attributeKeys.forEach(function (aIndex, aValue) {
                if(result[index][aIndex] && result[index][aIndex].length > 0) {
                    if(!result[index].attributes) {
                      result[index].attributes = {}
                    }
                    let keyValue = aIndex.replace('attr_', '')
                    result[index].attributes[keyValue] = convertStringToArray(result[index][aIndex], '|')
                    // let attributes =  result[index].attributes[keyValue].join();
                    // activeSummary.push(attributes);
                    // console.log("*************ACTIVE SUMMARY************",activeSummary);
                    delete(result[index][aIndex])
                }
              })

              if(pricingArr[fValue['esKey']+currency_key] == undefined) {
                pricingArr[fValue['esKey']+currency_key] = []
              }
              pricingArr[fValue['esKey']+currency_key].push(result[index])
            }
          })

          if(fValue['indexKey'] == 'ProductPrice') {
            // console.log("==================================pricingArr=",pricingArr)
            value["min_price"] = min_price
            value["max_price"] = max_price
            // console.log("min_price................",value["min_price"],value["max_price"])
              for (var property in pricingArr) {
                if (pricingArr.hasOwnProperty(property)) {
                    value[property]=pricingArr[property]
                    // console.log("value[property]",value[property])
                    // console.log("value",value) // do stuff
                }
              }
          } else {
              value[fValue['esKey']] = result
              // console.log("value[fValue['esKey']]",value[fValue['esKey']])
          }
        }
      }
    }).catch(err => {
      console.log("getProductSpecificOtherValues err",err)
    })
  }
}


function formatPriceRange (result) {
  // console.log("FormatPricerange...................")
  let priceRange = []
  for(let i = 1; i <= 10; i++) {
    if(result['qty_' + i + '_min']) {
      if(result['qty_' + i + '_max'] > 0) {
        priceRange.push({'qty': {'gte': result['qty_' + i + '_min'],
          'lte': result['qty_' + i + '_max'] > 0 ? result['qty_' + i + '_max'] : 0 },
          'price': result['price_' + i],
          'code': result['code_' + i]})
        } else {
          priceRange.push({'qty': {'gte': result['qty_' + i + '_min'] },
            'price': result['price_' + i],
            'code': result['code_' + i]})
        }
        delete result['qty_' + i + '_min']
        delete result['qty_' + i + '_max']
        delete result['price_' + i]
        delete result['code_' + i]
    }
  }
  return (priceRange);
}

// function minPrice (result) {
//     if(result['qty_1_min']) {
//       if(result['qty_1_max'] > 0) {
//         priceRange.push({'qty': {'gte': result['qty_' + i + '_min'],
//           'lte': result['qty_' + i + '_max'] > 0 ? result['qty_' + i + '_max'] : 0 },
//           'price': result['price_' + i],
//           'code': result['code_' + i]})
//         } else {
//           priceRange.push({'qty': {'gte': result['qty_' + i + '_min'] },
//             'price': result['price_' + i],
//             'code': result['code_' + i]})
//         }
//         delete result['qty_' + i + '_min']
//         delete result['qty_' + i + '_max']
//         delete result['price_' + i]
//         delete result['code_' + i]
//     }
//   }
//   return (priceRange);
// }

function formatShippingRange (result) {
  let shippingRange = []
  for(let i = 1; i <= 10; i++) {
    if(result['qty_' + i + '_min']) {
      if(result['qty_' + i + '_max'] > 0) {
        shippingRange.push({'qty': {'gte': result['qty_' + i + '_min'],
          'lte': result['qty_' + i + '_max'] > 0 ? result['qty_' + i + '_max'] : 0 }
          })
        } else {
          shippingRange.push({'qty': {'gte': result['qty_' + i + '_min'] },
          })
        }
        delete result['qty_' + i + '_min']
        delete result['qty_' + i + '_max']
        delete result['price_' + i]
        delete result['code_' + i]
    }
  }
  return (shippingRange);
}

function formatImages (result) {
  console.log("+++++++++++++++++++ result",result)
  let images = []
  for(let i = 1; i <= 50; i++) {
    if(result['web_image_' + i] != null) {
      console.log("inside..............................................................................")
        images.push({'web_image': result['web_image_' + i], 'color': result['color_' + i]
          })
        }
        delete result['web_image_' + i]
        delete result['color_' + i]
    }
  return (images);
}

function getUserNewVersion (ESUser) {
  //console.log("===========",ESUser)
  let versionNo = 1;
  if (ESUser.metadata.user_version_history) {
      versionNo = ESUser.metadata.user_version_history.length + 1
  }
  return 'sup'+ ESUser.metadata.id + '-' + versionNo
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

function makeDynamicCollectionObjWithoutPrefix (collectionName) {
  // collectionName = collectionName.charAt(0).toUpperCase() + collectionName.slice(1).toLowerCase()
  let ObjMain = new ObjSchema({_id: 'string'}, {strict: false, 'collection': collectionName})
  let modelName = 'mdl'+collectionName
  if (mongoose.models && mongoose.models[modelName]){
    return mongoose.models[modelName]
  } else {
    return mongoose.model('mdl'+collectionName, ObjMain)
  }
}

const productIndex = 'pdm1'
const productDataType = 'product'

async function deleteESData (versionNo, EsUser) {
  return new Promise(async function (resolve, reject) {
    let bodyData = {
      "query": {
          "bool": {
              "must": [
                 {"match_phrase": { "vid": versionNo }}
              ]
          }
      },
      "size":10000
    }
    await ESClient.search({
    index: productIndex,
    type: productDataType,
    body: bodyData
    }, function (error, response) {
      // console.log("***************",response)
      if(response != undefined &&  response.hits.hits.length > 0) {
        let productData = response.hits.hits
        let makeProductUpdateJsonObj1 = []
        productData.forEach(function (value, index) {
          if(value._source.vid.length > 1) {
            makeProductUpdateJsonObj1.push({
              update: {
                _index: productIndex,
                _type: productDataType,
                _id: value._id // data[index]._id
              }
            })
            let updatedVId = []
            updatedVId.push(versionNo)
            updatedVId = _.difference(value._source.vid, updatedVId)
            makeProductUpdateJsonObj1.push({'doc': {'vid': updatedVId}})
          } else if(value._source.vid.length == 1) {
            makeProductUpdateJsonObj1.push({
              delete: {
                _index: productIndex,
                _type: productDataType,
                _id: value._id // data[index]._id
              }
            })
          }
        })
        if(makeProductUpdateJsonObj1.length > 0) {
          dumpToES(makeProductUpdateJsonObj1)
        }
      }
      return resolve('remove new version = ' + versionNo)
    })
  })
}

async function getProductDataByESData (EsUser, sku) {
  return new Promise(async function (resolve, reject) {
    let bodyData = {
      "query": {
          "bool": {
              "must": [
                 {"match_phrase": { "supplier_id": EsUser.metadata.id }},
                 {"match_phrase": { "vid": EsUser.metadata.sid }}
              ]
          }
      },
      "size":10000
    }
    if(sku != undefined && sku != '') {
      bodyData.query.bool.must.push( {"match_phrase": { "sku": sku }})
    }

    try {
      await ESClient.search({
      index: productIndex,
      type: productDataType,
      body: bodyData
      }, function (error, response) {
        // console.log(response)
        return resolve(response)
      })
    } catch (e) {
      return reject({'hits':{'hits':[]}})
    }

  })
}

async function dumpToES (makeProductJsonObj) {
  let bulkRowsString = makeProductJsonObj.map(function (row) {
    // console.log("-------------------------",row,"----------------------------");
    return JSON.stringify(row)
  }).join('\n') + '\n'
  // bulkRowsString += '\n'
  // console.log(makeProductJsonObj);
  return new Promise(function (resolve) {
    ESClient.bulk({body: makeProductJsonObj}, function (err, resp) {
      if (!err) {
        resolve('Inserted')
        console.log("makeProductJsonObj inserted.....")
      }
    })
  })
}


function convertStringToArray (str, seprater) {
  return str.toString().split(seprater)
}

// to update user job queue process status to import_completed
function updateJobQueueStatus (objWorkJob) {
  let objJobMaster = new ObjSchema({_id: String}, {strict: false, 'collection': 'uploaderJobMaster'})
  let mdlobjJobMaster = null
  if (mongoose.models && mongoose.models.objJobMaster) {
    mdlobjJobMaster = mongoose.models.objJobMaster
  } else {
    mdlobjJobMaster = mongoose.model('objJobMaster', objJobMaster)
  }

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

module.exports = doJob
