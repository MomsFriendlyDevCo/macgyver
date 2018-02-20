/**
* MacGyver functions that are shared between client and server
*/
// @ifndef angular
var $macgyver = module.exports = {};

// Load our offline copy of the widget spec if we're operating on the backend
$macgyver.widgets = require(`${__dirname}/../dist/widgets.json`);

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


/**
* Attempt to neaten up a 'rough' MacGyver spec into a pristine one
* This function performs various sanity checks on nested elements e.g. checking each item has a valid ID and if not adding one
*/
$macgyver.neatenSpec = function(spec) {
	// Force showTitle to be false on the root element if its not already set {{{
	if (_.isUndefined(spec.showTitle)) spec.showTitle = false;
	if (!spec.id) spec.id = '$ROOT'; // Force root element to have an ID
	// }}}

	var flatSpec = $macgyver.flattenSpec(spec);
	$macgyver.forEach(spec, (widget, path) => {
		// Check that the widget is valid {{{
		if (!$macgyver.widgets[widget.type]) {
			console.log("Invalid or unregistered MacGyver widget '" + widget.type + "' - transforming into a mgText for now");
			widget.type = 'mgText';
		}
		// }}}

		// Force all elements to have an ID {{{
		if (!widget.id) {
			// Make an ID based on the path {{{
			var tryNumber = 0;
			var tryId;
			do {
				tryId = '$' + path + '$' + tryNumber++;
			} while (flatSpec[tryId]);
			widget.id = tryId;
			// }}}

			if (widget.type == 'mgContainer') widget.ignoreScope = true; // Containers - enable ignoreScope also
		}
		// }}}
	});

	return spec;
};


/**
* Create a prototype data object
* This will create empty objects whenever it encounters a mgContainer, arrays for iterative objects and so on
*/
$macgyver.specDataPrototype = function(spec) {
	var tree = {};

	$macgyver.forEach(spec, (widget, path) => {
		if ($macgyver.widgets[widget.type].isContainer) {
			var widgetPath = path.split('.').slice(1);
			if (!widgetPath.length) return;
			_.set(tree, widgetPath, $macgyver.widgets[widget.type].isContainerArray ? [] : {});
		}
	});

	return tree;
};
