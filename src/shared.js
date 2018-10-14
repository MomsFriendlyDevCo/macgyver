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
* @returns {$macgyver} This chainable object
* @deprecated Use flatten() instead
*/
$macgyver.forEach = function(spec, cb) {
	var forEachScanner = (root, path) => {
		if (_.isObject(root)) {
			var rootPath = (path ? path + '.' : '') + (root && root.id ? root.id : '');
			cb(root, rootPath);
			if (_.isArray(root.items)) root.items.forEach(i => forEachScanner(i, rootPath));
		}
	};
	forEachScanner(spec);

	return $macgyver;
};


/**
* Flatten a spec tree and return a key/val object of all fields
* NOTE: This is really just a shorthand of the $macgyver.forEach() function
* @param {Object} spec The specification Object to flatten
* @returns {Object} A key/val flattened object where the keys are the dotted notation path of the ID's and the values are the pointer to the object
* @see $macgyver.forEach()
* @deprecated Use flatten() instead
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
* Flatten the a spec into an object lookup where each key is the dotted notation of the key
* NOTE: Specifying {want:'array'} will add the extra property 'path' onto the output collection
* @param {Object} root The data or spec object to examine
* @param {Object} [options] Optional settings to use
* @param {number} [options.maxDepth=0] How far down the tree to recurse, set to falsy to infinitely recurse
* @param {Object|function} [options.filter] Either a Lodash match expression or a function to run on each widget - only truthy values are appended to the output. Function is called as `(widget, path, depth)`
* @param {Object|function} [options.filterChildren] Either a Lodash match expression or a function to run on each widget - only truthy values are recursed into
* @param {stirng} [type="auto"] How to recurse into items. ENUM: 'auto' (try to determine how to recurse from root element), 'spec', 'data'
* @param {string} [want="object"] How to return the output. ENUM: 'object' (an object where each key is the path and the value is the object), 'array' (a flattened version of an object)
* @param {boolean} [wantPath=false] Whether to mutate the output widget with a dotted notation string indicating where to look in a data object for the value of the widget
* @param {boolean} [wantSpec=false] Whether to mutate the output widget with the widget specification as an object for each item
* @param {boolean} [wantSpecPath=false] Whether to mutate the output widget with a dotted notation path on where to find the widget within a spec object
*/
$macgyver.flatten = function(root, options) {
	var settings = _.defaults(options, {
		maxDepth: 0,
		filter: undefined,
		filterChildren: undefined,
		type: 'auto',
		want: 'object',
		wantPath: false,
		wantSpec: false,
		wantSpecPath: false,
	});

	if (settings.filter && !_.isFunction(settings.filter) && _.isObject(settings.filter)) settings.filter = _.matches(settings.filter);
	if (settings.want != 'object' && settings.want != 'array') throw new Error('$macgyver.flatten({want}) can only be "object" or "array"');
	if (settings.type == 'auto') {
		if (root.items) {
			settings.type = 'spec';
		} else if (_.every(root, (k, v) => !v.items)) {
			settings.type = 'data';
		} else {
			throw new Error('Cannot determine type of input object to $macgyver.flatten(), specify it explicitly with {type=spec|data}');
		}
	}

	var found = {};
	var foundAll = {}; // Unfiltered version of 'found' for use if we are gluing the path to the items later

	var depthScanner = (root, path, depth = 0) => {
		if (!_.isObject(root)) return;

		var rootPath = (path ? path + '.' : '') + (root && root.id ? root.id : '');

		if (settings.wantPath) foundAll[root.id] = root; // Store all objects reguardless of filtering as we need them to compute the path later

		// Add to bucket of found objects?
		if (
			!settings.filter // No filter
			|| settings.filter.call(root, root, path, depth) // OR we pass the filter
		) {
			found[root.id] = root;
		}

		// Recurse into children?
		var recursionSubject = settings.type == 'spec' ? root.items : root;

		if (
			_.isArray(recursionSubject)
			&& (
				!settings.filterChildren // No filter
				|| settings.filterChildren.call(root, root, path, depth) // ...or we pass the filter
			)
			&& (!settings.maxDepth || depth <= settings.maxDepth)
		) {
			recursionSubject.forEach(i => depthScanner(i, rootPath, depth + 1));
		}
	};
	depthScanner(root);

	if (settings.wantPath || settings.wantSpec || settings.wantSpecPath)
		found = _.mapValues(found, (v, k) => {
			if (settings.wantSpec) v.spec = $macgyver.widgets[v.type];
			if (settings.wantSpecPath) v.specPath = k;
			if (settings.wantPath) { // Calculate the storage path by walking down the parent tree, filtering parents that don't yield a scope
				v.path = k
					.split('.')
					.filter(parent => ! foundAll[parent].ignoreScope) // Remove items that tell us to ignore their scope
					.join('.')
			}

			return v;
		});

	return (settings.want == 'object')
		? found // Return as is - an object
		: _.map(found); // Rewrite into an array
};


/**
* Attempt to neaten up a 'rough' MacGyver spec into a pristine one
* This function performs various sanity checks on nested elements e.g. checking each item has a valid ID and if not adding one
* @param {boolean} [checkRootNoId=true] Root node should never have an ID
* @param {boolean} [checkRootShowTitle=true] Verify that the root element has showTitle disabled
* @param {boolean} [checkWidgetType=true] If the widget type is not registered change it to `mgText`
* @param {boolean} [checkWidgetIds=true] Verify that each widget has an ID, if no ID is found - generate one
* @param {boolean} [checkWidgetContainerIgnoreScope=true] Check that all mgContainers have ignoreScope enabled if its not specified
* @param {function|null} [reporter] Reporter used when logging errors, defaults to using console.log
* @returns {Object} The original spec with alerations
*/
$macgyver.neatenSpec = function(spec, options) {
	var settings = _.defaults(options, {
		checkRootNoId: true,
		checkRootShowTitle: true,
		checkWidgetType: true,
		checkWidgetIds: true,
		checkWidgetContainerIgnoreScope: true,
		reporter: msg => console.log(msg),
	});

	if (!settings.reporter) settings.reporter = ()=> {}; // Make sure settings.reporter always exists, even if its a NoOp

	// Force showTitle to be false on the root element if its not already set {{{
	if (settings.checkRootNoId && spec.id) {
		delete spec.id;
		settings.reporter('Root node should not have an ID - removed');
	}

	if (settings.checkRootShowTitle && _.isUndefined(spec.showTitle)) {
		spec.showTitle = false;
		settings.reporter('Root node should not have showTitle enabled');
	}
	// }}}

	var flatSpec = $macgyver.flattenSpec(spec);
	$macgyver.forEach(spec, (widget, path) => {
		if (path == '') return; // Don't examine root elements

		if (settings.checkWidgetType) {
			// Check that the widget is valid {{{
			if (!$macgyver.widgets[widget.type]) {
				settings.reporter(`Invalid or unregistered MacGyver widget ${widget.type} - transforming into a mgText`);
				widget.type = 'mgText';
			}
		}
		// }}}

		// Force all elements to have an ID {{{
		if (
			settings.checkWidgetIds
			&&
			(
				!widget.id
				// BUGFIX: Rename all widgets beginning with $ROOT / ROOT to a randomly selected name {{{
				// This patch is required to retroactively fix issues with the previous path-based fix, it can be removed after 2018-07-01 - MC
				|| /^\$*ROOT/.test(widget.id)
				// }}}
			)
		) {
			// Make an ID based on the widget type + some junk {{{
			var oldId = widget.id;
			var tryId;
			do {
				tryId = widget.type + '-' + _.times(5, i => _.sample('abcdefghijklmnopqrstuvwxyz').split('')).join('');
			} while (flatSpec[tryId]);
			widget.id = tryId;
			settings.reporter(
				(oldId ? `Invalid widget ID ${oldId}` : `Non-existant ID for widget ${widget.type}`)
				+ `generated new ID as ${widget.id}`
			);
			// }}}

			if (settings.checkWidgetContainerIgnoreScope && widget.type == 'mgContainer' && _.isUndefined(widget.ignoreScope)) {
				widget.ignoreScope = true; // Containers - enable ignoreScope also
				settings.reporter('Forced mgContainer to ignoreScope');
			}
		}
		// }}}
	});

	return spec;
};


/**
* Create a prototype data object
* This will create empty objects whenever it encounters a mgContainer, arrays for iterative objects and so on
* @return {Object} A prototype data object
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
