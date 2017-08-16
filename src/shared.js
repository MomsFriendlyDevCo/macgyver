/**
* MacGyver functions that are shared between client and server
*/
// @ifndef angular
var $macgyver = module.exports = {};

var _ = require('lodash');
// @endif

/**
* Executes a callback on each item in a spec tree
* @param {Object} spec The spec tree to operate on
* @param {function} cb The callback to trigger as ({node, path})
*/
$macgyver.forEach = function(spec, cb) {
	var forEachScanner = (root, path) => {
		var rootPath = (path ? path + '.' : '') + (root.id || '');
		cb(root, rootPath);
		if (_.isArray(root.items)) root.items.forEach(i => forEachScanner(i, rootPath));
	};
	forEachScanner(spec);
},

/**
* Flatten a spec tree and return a key/val object of all fields
* NOTE: This is really just a shorthand of the $macgyver.forEach() function
* @param {Object} spec The specification Object to flatten
* @returns {Object} A key/val flattened object where the keys are the dotted notation path of the ID's and the values are the pointer to the object
* @see $macgyver.forEach()
*
* @example
* var spec = $macgyver.flattenSpec(mySpec);
* spec['foo.bar.baz'].value = '123'; // Set {foo: {bar: {baz: {value: '123'}}}}
*/
$macgyver.flattenSpec = function(spec) {
	var res = {};
	$macgyver.forEach(spec, (widget, path) => res[path] = widget);
	return res;
};
