// Load required packages
var mongoose = require('mongoose');
mongoose.set('debug', false);

var objSchema = new mongoose.Schema({}, { strict: false });
//var Thing = mongoose.model('Thing', thingSchema);
//var thing = new Thing({ iAmNotInTheSchema: true });
//thing.save()

// Export the Mongoose model
module.exports = objSchema;
