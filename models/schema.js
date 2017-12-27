// Load required packages
var mongoose = require('mongoose');
mongoose.set('debug', true);

var ProductSchema = new mongoose.Schema({}, { strict: false,collection: 'product_test' });
//var Thing = mongoose.model('Thing', thingSchema);
//var thing = new Thing({ iAmNotInTheSchema: true });
//thing.save()

// Export the Mongoose model
module.exports = mongoose.model('ProductSchema', ProductSchema);
