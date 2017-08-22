'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

angular.module('macgyver', ['ngSanitize', 'ngTreeTools', 'ui.select']).provider('$macgyver', function () {
	var $macgyver = this;
	$macgyver.widgets = {};

	// Settings {{{
	$macgyver.settings = {
		urlResolver: undefined // Used by mgFile and other uploaders to determine its URL
	};
	// }}}

	/**
 * Add a known widget to the widgets lookup object
 * @param {string} id The unique ID of the widget to add
 * @param {Object} [properties] Optional properties of the widget to add
 * @param {boolean} [properties.isContainer] Indicates that the widget can contain other widgets (under the `items` array)
 * @param {boolean} [properties.isContainerArray] Addition to `isContainer` that indicates the widget will contain an array of rows (like a table)
 * @param {string} [properties.title=id] Optional human readable title of the widget
 * @param {string} [properties.template] Rendering template to be used to draw the element (`w` is the currently rendering widget within the template i.e. `w.id` is the widget ID)
 * @param {string} [properties.icon] Optional icon to display in the form editor
 * @param {Object} [properties.config] Optional list of configuration the widget takes, this is in the form of a MacGyver item collection
 * @param {boolean} [properties.userPlaceable=true] Whether this component should be listed as placeable by the user (if false, its hidden in the mgFormEditor UI)
 * @param {string} [properties.category="Misc"] Which category this widget fits into when displaying the 'Add widget' dialog in mgFormEditor
 */
	$macgyver.register = function (id, properties) {
		$macgyver.widgets[id] = properties || {};
		$macgyver.widgets[id].id = id;

		var domName = _.kebabCase(id);
		_.defaults($macgyver.widgets[id], {
			template: '<' + domName + ' config="w" data="$ctrl.data[w.id]"></' + domName + '>',
			title: _.startCase(id),
			userPlaceable: true,
			category: 'Misc'
		});

		return $macgyver;
	};

	/**
 * Generate an empty prototype tree from a form layout
 * @params {array} layout The root node to generate from
 * @params {boolean} [useDefaults] Whether to adopt control defaults when generating the tree
 */
	$macgyver.getDataTree = function (root, useDefaults) {
		if (!root) {
			console.warn('Empty MacGyver form tree');
		} else if (!$macgyver.widgets[root.type]) {
			console.warn('Unknown widget type "' + root.type + '" for item ID "' + root.id + '" - assuming is not a container');
			return useDefaults ? root.default : null;
		} else if ($macgyver.widgets[root.type].isContainer && !$macgyver.widgets[root.type].isContainerArray) {
			return _(root.items).mapKeys('id').mapValues(function (i) {
				return $macgyver.getDataTree(i);
			}).value();
		} else if ($macgyver.widgets[root.type].isContainer && $macgyver.widgets[root.type].isContainerArray) {
			return [_(root.items).mapKeys('id').mapValues(function (i) {
				return $macgyver.getDataTree(i);
			}).value()];
		} else {
			return useDefaults ? root.default : null;
		}
	};

	/**
 * Returns the first found form in the search direction
 * @param {Object} $scope The scope of the calling component
 * @param {string} [direction="downwards"] What direction to search for the form element in. ENUM: 'upwards', 'downwards'
 * @param {string} [want="$ctrl"] What aspect of the form is sought. ENUM: '$ctrl', '$scope'
 * @example
 * // In a controller / component
 * $macgyver.getForm($scope);
 * // => The scope instance of the form (i.e. the inside of the mg-form component)
 */
	$macgyver.getForm = function ($scope) {
		var direction = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'downwards';
		var want = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '$ctrl';

		// Make an empty object, broadcast and expect the first reciever to populate the `form` key which we can then use to reference the form
		var form = {};

		if (direction == 'downwards') {
			$scope.$broadcast('mg.getForm', form);
		} else if (direction == 'upwards') {
			$scope.$emit('mg.getForm', form);
		} else {
			throw new Error('Unknown form search direction: ' + direction);
		}

		return form[want];
	};

	/**
 * Returns an object where each key is the ID of the MacGyver component with the value being the component controller
 * @param {Object} $scope The scope of the calling component
 * // In a controller / component
 * $macgyver.getAll($scope);
 * // => {foo: <fooController>, bar: <barController>, ...}
 */
	$macgyver.getAll = function ($scope) {
		var components = {};
		$scope.$broadcast('mg.get', components);
		return components;
	};

	/**
 * Get the array path of a component
 * This is calculated as:
 * 1. If the $ctrl.config.mgPath value is set (strings will automatically be transformed into arrays) OR
 * 2. Using all parents IDs as an array
 * @return {array} The path segments as an array of strings
 */
	$macgyver.getPath = function ($scope) {
		var overridePath = _.get($scope, ['$ctrl', 'config', 'mgPath']);

		if (overridePath && _.isArray(overridePath)) {
			return overridePath;
		} else if (_.isString(overridePath)) {
			return overridePath.split('.');
		} else {
			// Determine from parent segments
			var stack = [];
			$scope.$emit('mg.getStack', stack);
			return stack.map(function (i) {
				return i.id;
			}) // Return only the ID segment
			.filter(function (i) {
				return !!i;
			}); // Remove empty items
		}
	};

	/**
 * Inject various life-cycle hooks into a component that doesnt want to have to manage them itself
 * This really just takes care of the unit responding to the 'mg.get' event at present
 * @example
 * // In a controller / component
 * $macgyver.inject($scope, $ctrl);
 */
	$macgyver.inject = function ($scope, $ctrl) {
		$scope.$on('mg.get', function (e, c) {
			if (!$ctrl.config) return;
			c[$ctrl.config.id] = $ctrl;
		});
		$scope.$on('mg.getStack', function (e, c) {
			c.push({
				id: $ctrl.config.id,
				$ctrl: $ctrl,
				$scope: $scope
			});
			return c;
		});
	};

	/**
 * Broadcast a message to all MacGyver components under the first form found as the parent of the given scope
 * Messages should always begin with the 'mg.' prefix
 * @param {Object} $scope The scope of the widget to search from
 * @param {*} message,... The message to broadcast
 * @returns {*} The return value of the broadcast event
 */
	$macgyver.broadcast = function ($scope) {
		var mgForm = $macgyver.getForm($scope, 'upwards', '$scope');

		for (var _len = arguments.length, message = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
			message[_key - 1] = arguments[_key];
		}

		return mgForm ? mgForm.$broadcast.apply(mgForm, message) : undefined;
	};

	/**
 * MacGyver functions that are shared between client and server
 */

	/**
 * Executes a callback on each item in a spec tree
 * @param {Object} spec The spec tree to operate on
 * @param {function} cb The callback to trigger as ({node, path})
 */
	$macgyver.forEach = function (spec, cb) {
		var forEachScanner = function forEachScanner(root, path) {
			var rootPath = (path ? path + '.' : '') + (root.id || '');
			cb(root, rootPath);
			if (_.isArray(root.items)) root.items.forEach(function (i) {
				return forEachScanner(i, rootPath);
			});
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
	$macgyver.flattenSpec = function (spec) {
		var res = {};
		$macgyver.forEach(spec, function (widget, path) {
			return res[path] = widget;
		});
		return res;
	};

	/**
 * Angular nonsense function to get this instance
 */
	$macgyver.$get = function () {
		return $macgyver;
	};
}).filter('filesize', function () {
	return filesize;
}).filter('mgFilterObject', function () {
	return function (value, filter) {
		return _.pickBy(value, function (i) {
			return _.isMatch(i, filter);
		});
	};
});

/**
* MacGyver alert box
* @param {Object} config The config specification
* @param {string} [config.text] The text to display in the alert if data is falsy
* @param {string} [config.style='alert-info'] The style of alert box to display. Enum of 'info', 'success', 'warning', 'danger'
* @param {*} data The state data
*/
angular.module('macgyver').config(['$macgyverProvider', function ($macgyverProvider) {
	return $macgyverProvider.register('mgAlert', {
		title: 'Alert Box',
		icon: 'fa fa-exclamation-triangle',
		category: 'General Decoration',
		config: {
			text: { type: 'mgText', default: 'This is an alert!' },
			style: {
				type: 'mgChoiceButtons',
				default: 'alert-info',
				iconSelected: 'fa fa-fw fa-check',
				iconDefault: 'fa fa-fw',
				enum: [{ id: 'alert-success', class: 'btn-success' }, { id: 'alert-info', class: 'btn-info' }, { id: 'alert-warning', class: 'btn-warning' }, { id: 'alert-danger', class: 'btn-danger' }]
			}
		}
	});
}]).component('mgAlert', {
	bindings: {
		config: '<'
	},
	controller: ['$macgyver', '$scope', function controller($macgyver, $scope) {
		var $ctrl = this;
		$macgyver.inject($scope, $ctrl);
	}],
	template: '\n\t\t\t<div class="alert" ng-class="$ctrl.config.style">{{$ctrl.config.text || $scope.data}}</div>\n\t\t'
});

/**
* MacGyver toggle
* @param {Object} config The config specification
* @param {boolean} data The state of the checkbox
*/
angular.module('macgyver').config(['$macgyverProvider', function ($macgyverProvider) {
	return $macgyverProvider.register('mgCheckBox', {
		title: 'Check Box',
		icon: 'fa fa-check-square-o',
		category: 'Simple Inputs',
		config: {}
	});
}]).component('mgCheckBox', {
	bindings: {
		config: '<',
		data: '='
	},
	controller: ['$macgyver', '$scope', function controller($macgyver, $scope) {
		var $ctrl = this;
		$macgyver.inject($scope, $ctrl);

		// Adopt default if no data value is given {{{
		$scope.$watch('$ctrl.data', function () {
			if (_.isUndefined($ctrl.data) && _.has($ctrl, 'config.default')) $ctrl.data = $ctrl.config.default;
		});
		// }}}
	}],
	template: '<div class="text-center">\n\t\t\t<input ng-model="$ctrl.data" type="checkbox"/>\n\t\t</div>'
});

/**
* MacGyver selector of an item from a list of enums
* @param {Object} config The config specification
* @param {array} [config.enum] A collection of items to choose from, each must be an object with at least an 'id'. If this is an array of strings it will be traslated into a collection automatically
* @param {string} [config.url] A URL to a collection. This replaces config.enum if specified.
* @param {string} [config.textPrompt] The prompt to display in the select box
* @param {string} [config.textInnerPrompt] The prompt to display when searching
* @param {string} [config.displayPrimaryField] The main field data to display, mapped from the collection provided in config.enum
* @param {*} data The state data
*/
angular.module('macgyver').config(['$macgyverProvider', function ($macgyverProvider) {
	return $macgyverProvider.register('mgChoiceDropdown', {
		title: 'Dropdown multiple-choice',
		icon: 'fa fa-chevron-circle-down',
		category: 'Choice Selectors',
		config: {
			url: { type: 'mgUrl', help: 'Data feed URL' },
			enum: {
				type: 'mgList',
				title: 'The list of items to display',
				default: ['Foo', 'Bar', 'Baz']
			},
			textPrompt: { type: 'mgText', default: 'Choose an item...' },
			textInnerPrompt: { type: 'mgText', default: 'Select an item...' },
			displayPrimaryField: { type: 'mgText', default: 'title', help: 'The field of each enum item to display as the primary selection text' },
			displaySecondaryField: { type: 'mgText', help: 'The field of each enum to display as a secondary item' }
		}
	});
}]).component('mgChoiceDropdown', {
	bindings: {
		config: '<',
		data: '='
	},
	controller: ['$http', '$macgyver', '$scope', function controller($http, $macgyver, $scope) {
		var $ctrl = this;
		$macgyver.inject($scope, $ctrl);

		// Translate $ctrl.enum -> $ctrl.enumIter (convert arrays of strings for example) {{{
		$ctrl.enumIter = []; // Cleaned up version of enum
		$scope.$watch('$ctrl.config.enum', function () {
			if (!$ctrl.config.enum) return; // No data yet
			if (_.isArray($ctrl.config.enum) && _.isString($ctrl.config.enum[0])) {
				// Array of strings
				$ctrl.enumIter = $ctrl.config.enum.map(function (i) {
					return {
						id: _.camelCase(i),
						title: i
					};
				});
			} else if (_.isArray($ctrl.config.enum) && _.isObject($ctrl.config.enum[0])) {
				// Collection
				$ctrl.enumIter = $ctrl.config.enum;
			}
		});
		// }}}
		// Go fetch the URL contents if $ctrl.config.url is set {{{
		$scope.$watch('$ctrl.url', function () {
			if (!$ctrl.config.url) return; // No URL to pull
			$http.get($ctrl.config.url).then(function (res) {
				return $ctrl.enumIter = res.data.map(function (i) {
					if (i._id) {
						// Remap _id => id
						i.id = i._id;
						delete i._id;
					}
					return i;
				});
			});
		});
		// }}}
		// Adopt default if no data value is given {{{
		$scope.$watch('$ctrl.data', function () {
			if (_.isUndefined($ctrl.data) && _.has($ctrl, 'config.default')) $ctrl.data = $ctrl.config.default;
		});
		// }}}
	}],
	template: '\n\t\t\t<ui-select ng-model="$ctrl.data" title="{{$ctrl.config.textPrompt || \'Choose an item...\'}}">\n\t\t\t\t<ui-select-match placeholder="{{$ctrl.config.textInnerPrompt || \'Select an item...\'}}">{{$select.selected[$ctrl.config.displayPrimaryField || \'title\']}}</ui-select-match>\n\t\t\t\t<ui-select-choices repeat="item.id as item in $ctrl.enumIter | filter:$select.search track by item.id" group-by="$ctrl.config.groupBy">\n\t\t\t\t\t<div ng-bind-html="item[$ctrl.config.displayPrimaryField || \'title\'] | highlight:$select.search"></div>\n\t\t\t\t\t<small ng-if="$ctrl.config.displaySecondaryField" ng-bind-html="item[$ctrl.config.displaySecondaryField] | highlight:$select.search"></small>\n\t\t\t\t</ui-select-choices>\n\t\t\t</ui-select>\n\t\t'
});

/**
* MacGyver selector of an item from a small list of enums
* @param {Object} config The config specification
* @param {array} config.enum A collection of items to choose from, each must be an object with at least an 'id'. If this is an array of strings it will be traslated into a collection automaitcally
* @param {string} [config.enum[].class] Optional class to display per item, if omitted the item ID is used
* @param {string} [config.enum[].classSelected] Optional class to display per item when selected
* @param {string} [config.enum[].icon] Optional icon to display for each item
* @param {string} [config.enum[].iconSelected] Icon to display for each item when item is selected
* @param {string} [config.enum[].title] Optional title to display within each element
* @param {string} [config.itemIconDefault='fa fa-fw'] Default item to use per item (unless an override is present in the item object)
* @param {string} [config.itemIconSelected='fa fa-check fa-lg'] Icon to use when item is selected
* @param {string} [config.itemClassDefault='btn-default'] Default item class to use per item (unless an override is present in the item object)
* @param {string} [config.itemClassSelected='btn-primary'] Item class to use when item is selected
* @param {string} [config.classWrapper='btn-group'] The class definition of the outer widget element
* @param {string} [config.classItem='btn'] The class definition of each item (as well as each items id
* @param {*} data The state data
*/
angular.module('macgyver').config(['$macgyverProvider', function ($macgyverProvider) {
	return $macgyverProvider.register('mgChoiceButtons', {
		title: 'Button multiple-choice',
		icon: 'fa fa-check-square',
		category: 'Choice Selectors',
		config: {
			enum: {
				type: 'mgList',
				title: 'The list of items to display',
				default: ['Foo', 'Bar', 'Baz']
			},
			classWrapper: { type: 'mgText', default: 'btn-group', title: 'Group CSS class' },
			classItem: { type: 'mgText', default: 'btn', title: 'Item CSS class' },
			itemIconDefault: { type: 'mgText' },
			itemIconSelected: { type: 'mgText' },
			itemClassDefault: { type: 'mgText', default: 'btn-default' },
			itemClassSelected: { type: 'mgText', default: 'btn-primary' }
		}
	});
}]).component('mgChoiceButtons', {
	bindings: {
		config: '<',
		data: '='
	},
	controller: ['$macgyver', '$scope', function controller($macgyver, $scope) {
		var $ctrl = this;
		$macgyver.inject($scope, $ctrl);

		// Translate $ctrl.enum -> $ctrl.enumIter (convert arrays of strings for example) {{{
		$ctrl.enumIter = []; // Cleaned up version of enum
		$scope.$watch('$ctrl.config.enum', function () {
			if (!$ctrl.config.enum) return; // No data yet
			if (_.isArray($ctrl.config.enum) && _.isString($ctrl.config.enum[0])) {
				// Array of strings
				$ctrl.enumIter = $ctrl.config.enum.map(function (i) {
					return {
						id: _.camelCase(i),
						title: i
					};
				});
			} else if (_.isArray($ctrl.config.enum) && _.isObject($ctrl.config.enum[0])) {
				// Collection
				$ctrl.enumIter = $ctrl.config.enum;
			}
		});
		// }}}
		// Adopt default if no data value is given {{{
		$scope.$watch('$ctrl.data', function () {
			if (_.isUndefined($ctrl.data) && _.has($ctrl, 'config.default')) $ctrl.data = $ctrl.config.default;
		});
		// }}}
	}],
	template: '\n\t\t\t<div ng-class="$ctrl.config.classWrapper || \'btn-group\'">\n\t\t\t\t<a ng-repeat="item in $ctrl.enumIter track by item.id" ng-class="[$ctrl.config.classItem || \'btn\',\n\t\t\t\t\t$ctrl.data == item.id\n\t\t\t\t\t? item.classSelected || $ctrl.config.itemClassSelected || \'btn-primary\'\n\t\t\t\t\t: item.class || $ctrl.config.itemClassDefault || \'btn-default\'\n\t\t\t\t]" ng-click="$ctrl.data = item.id">\n\t\t\t\t\t<i ng-class="$ctrl.data == item.id ? (item.iconSelected || $ctrl.config.iconSelected) : (item.icon || $ctrl.config.iconDefault)"></i>\n\t\t\t\t\t{{item.title}}\n\t\t\t\t</a>\n\t\t\t</div>\n\t\t'
});

/**
* MacGyver selector of an item from a small list of enums
* @param {Object} config The config specification
* @param {array} config.enum A collection of items to choose from, each must be an object with at least an 'id'. If this is an array of strings it will be traslated into a collection automaitcally
* @param {string} [config.enum[].class] Optional class to display per item, if omitted the item ID is used
* @param {string} [config.enum[].icon] Optional icon to display for each item
* @param {string} [config.enum[].iconSelected] Icon to display for each item when item is selected
* @param {string} [config.enum[].title] Optional title to display within each element
* @param {*} data The state data
*/
angular.module('macgyver').config(['$macgyverProvider', function ($macgyverProvider) {
	return $macgyverProvider.register('mgChoiceRadio', {
		title: 'Radio multiple-choice',
		icon: 'fa fa-list-ul',
		category: 'Choice Selectors',
		config: {
			enum: {
				type: 'mgList',
				title: 'The list of items to display',
				default: ['Foo', 'Bar', 'Baz']
			}
		}
	});
}]).component('mgChoiceRadio', {
	bindings: {
		config: '<',
		data: '='
	},
	controller: ['$macgyver', '$scope', function controller($macgyver, $scope) {
		var $ctrl = this;
		$macgyver.inject($scope, $ctrl);

		// Translate $ctrl.enum -> $ctrl.enumIter (convert arrays of strings for example) {{{
		$ctrl.enumIter = []; // Cleaned up version of enum
		$scope.$watch('$ctrl.config.enum', function () {
			if (!$ctrl.config.enum) return; // No data yet
			if (_.isArray($ctrl.config.enum) && _.isString($ctrl.config.enum[0])) {
				// Array of strings
				$ctrl.enumIter = $ctrl.config.enum.map(function (i) {
					return {
						id: _.camelCase(i),
						title: i
					};
				});
			} else if (_.isArray($ctrl.config.enum) && _.isObject($ctrl.config.enum[0])) {
				// Collection
				$ctrl.enumIter = $ctrl.config.enum;
			}
		});
		// }}}
		// Adopt default if no data value is given {{{
		$scope.$watch('$ctrl.data', function () {
			if (_.isUndefined($ctrl.data) && _.has($ctrl, 'config.default')) $ctrl.data = $ctrl.config.default;
		});
		// }}}
	}],
	template: '\n\t\t\t<div class="radio" ng-repeat="item in $ctrl.enumIter track by item.id">\n\t\t\t\t<label>\n\t\t\t\t\t<input ng-model="$ctrl.data" type="radio" name="{{$ctrl.config.id}}" value="{{item.id}}"/>\n\t\t\t\t\t{{item.title}}\n\t\t\t\t</label>\n\t\t\t</div>\n\t\t'
});

/**
* MacGyver component loader
* This is a meta component that loads other dynamic components as an array
* @param {Object} config The config specification
* @param {array} config.items A collection of sub-item objects to display
* @param {boolean} [config.ignoreScope=false] If true any child item storage paths will not be prefixed by this items ID (e.g. a child item with the ID 'foo' will normally be set to '(whatever this ID is).foo' unless this option is true)
* @param {boolean} [config.items[].help] Optional help text to show under the element
* @param {boolean} [config.items[].ignoreScope=false] Whether this container effects the lexical path of the item being set - i.e. if enabled (the default) the saved item will use this containers ID in the path of the item to set, if disabled this container is effectively invisible
* @param {boolean} [config.items[].showTitle=true] Whether to show the left-hand-side form title for the item
* @param {string} [config.items[].title] Optional title to display for the widget
* @param {string} config.items[].type The type of the object to render. This corresponds to a `mg*` component
* @param {*} data The state data
*/
angular.module('macgyver').config(['$macgyverProvider', function ($macgyverProvider) {
	return $macgyverProvider.register('mgContainer', {
		title: 'Container layout',
		icon: 'fa fa-dropbox',
		category: 'Layout',
		isContainer: true,
		template: '<mg-container config="w" data="w.ignoreScope ? $ctrl.data : $ctrl.data[w.id]"></mg-container>', // Special template for containers to bypass scoping if ignoreScope is true
		config: {
			// items: undefined, // Intentionally hidden - mgFormEditor provides functionality to edit this
			ignoreScope: { type: 'mgToggle', default: false, title: 'Ignore Scope', help: 'Flatten the data scope with the parent level - i.e. dont nest any child element inside an object when saving data' }
		},
		configChildren: {
			help: { type: 'mgText', title: 'Help text', help: 'Optional help text for the item - just like what you are reading now' },
			showTitle: { type: 'mgToggle', default: true, title: 'Show Title', help: 'Whether to show the side title for this element' },
			title: { type: 'mgText', title: 'Title' }
		}
	});
}]).component('mgContainer', {
	bindings: {
		config: '<',
		data: '='
	},
	controller: ['$element', '$macgyver', '$scope', function controller($element, $macgyver, $scope) {
		var $ctrl = this;
		$macgyver.inject($scope, $ctrl);
		$ctrl.isEditing = !!$element.closest('mg-form-editor').length;

		$ctrl.widgetAddChild = function () {
			return $scope.$emit('mg.mgFormEditor.widgetAdd', 'inside', $ctrl.config.id);
		};
	}],
	template: ['$macgyver', function template($macgyver) {
		return '\n\t\t\t<div ng-click="$ctrl.widgetAddChild()" ng-if="$ctrl.isEditing && !$ctrl.config.items.length" class="text-center">\n\t\t\t\t<a class="btn btn-sm btn-success"><i class="fa fa-plus"></i> Add widget</a>\n\t\t\t</div>\n\t\t\t<div ng-repeat="w in $ctrl.config.items track by w.id" ng-switch="w.type" data-path="{{w.id}}" class="form-group row" ng-class="w.mgValidation == \'error\' && \'has-error\'">\n\t\t\t\t<label ng-if="w.showTitle || w.showTitle===undefined" class="col-sm-3 col-form-label control-label">{{w.title}}</label>\n\t\t\t\t<div ng-class="w.showTitle || w.showTitle===undefined ? \'col-sm-9\' : \'col-sm-12\'">\n\t\t\t' + _.map($macgyver.widgets, function (w) {
			return '<div ng-switch-when="' + w.id + '">' + w.template + '</div>';
		}).join('\n') + '\n\t\t\t\t\t<div ng-switch-default class="alert alert-danger">Unknown MacGyver widget type : "{{w.type}}"</div>\n\t\t\t\t\t<div ng-if="w.help" class="help-block">{{w.help}}</div>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t';
	}]
});

/**
* MacGyver date input
* @param {Object} config The config specification
* @param {boolean} [config.required=false] Whether this field is required
* @param {Date} [config.min] The minimum allowable date
* @param {Date} [config.max] The maximum allowable date
* @param {*} data The state data
*/
angular.module('macgyver').config(['$macgyverProvider', function ($macgyverProvider) {
	return $macgyverProvider.register('mgDate', {
		title: 'Date selection',
		icon: 'fa fa-calendar',
		category: 'Simple Inputs',
		config: {
			min: { type: 'mgDate', title: 'Earliest date' },
			max: { type: 'mgDate', title: 'Latest date' },
			required: { type: 'mgToggle', default: false }
		}
	});
}]).component('mgDate', {
	bindings: {
		config: '<',
		data: '='
	},
	controller: ['$macgyver', '$scope', function controller($macgyver, $scope) {
		var $ctrl = this;
		$macgyver.inject($scope, $ctrl);

		$ctrl.validate = function () {
			return [$ctrl.config.required && !$ctrl.data && $ctrl.config.title + ' is required', $ctrl.config.min && _.isString($ctrl.data) && $ctrl.data < $ctrl.config.min && $ctrl.config.title + ' is too early (earliest date is ' + $ctrl.config.min + ')', $ctrl.config.max && _.isString($ctrl.data) && $ctrl.data > $ctrl.config.max && $ctrl.config.title + ' is too late (latest date is ' + $ctrl.config.max + ')'];
		};

		// Adopt default  if no data value is given {{{
		$scope.$watch('$ctrl.data', function () {
			if (_.isUndefined($ctrl.data) && _.has($ctrl, 'config.default')) $ctrl.data = $ctrl.config.default;
		});
		// }}}
	}],
	template: '\n\t\t\t<input ng-model="$ctrl.data" type="date" class="form-control"/>\n\t\t'
});

/**
* MacGyver text input
* @param {Object} config The config specification
* @param {boolean} [config.required=false] Whether this field is required
* @param {string} [config.placeholder] Placeholder text when the textbox is empty
* @param {*} data The state data
*/
angular.module('macgyver').config(['$macgyverProvider', function ($macgyverProvider) {
	return $macgyverProvider.register('mgEmail', {
		title: 'Email address',
		icon: 'fa fa-envelope-o',
		category: 'Simple Inputs',
		config: {
			placeholder: { type: 'mgText', help: 'Ghost text to display when the text box has no value' },
			required: { type: 'mgToggle', default: false }
		}
	});
}]).component('mgEmail', {
	bindings: {
		config: '<',
		data: '='
	},
	controller: ['$macgyver', '$scope', function controller($macgyver, $scope) {
		var $ctrl = this;
		$macgyver.inject($scope, $ctrl);

		$ctrl.validate = function () {
			return [$ctrl.config.required && !$ctrl.data && $ctrl.config.title + ' is required'];
		};

		// Adopt default  if no data value is given {{{
		$scope.$watch('$ctrl.data', function () {
			if (_.isUndefined($ctrl.data) && _.has($ctrl, 'config.default')) $ctrl.data = $ctrl.config.default;
		});
		// }}}
	}],
	template: '\n\t\t\t<input ng-model="$ctrl.data" type="email" class="form-control" placeholder="{{$ctrl.config.placeholder}}"/>\n\t\t'
});

/**
* MacGyver file list display
* This is an optional component inside mgFileList - if you just want a simple uploader you should see that component instead
* @param {Object} config The config specification
* @param {boolean} [config.allowDelete=true] Whether to allow file deletion
* @param {string,function} [config.urlQuery] The URL to query for files. If unset $macgyver.settings.urlResolver is used
* @param {string,function} [config.urlDelete] The URL to delete files from. If unset $macgyver.settings.urlResolver is used
* @param {string} [config.listMode='list'] The list method to use
* @param {function} [config.onDelete] Optional callback to fire when a file has been deleted
* @param {Array} [data] Optional array of files, if this is not set data will be populated via config.urlQuery instead
*/
angular.module('macgyver').config(['$macgyverProvider', function ($macgyverProvider) {
	return $macgyverProvider.register('mgFileList', {
		title: 'File list',
		icon: 'fa fa-files-o',
		category: 'Files and uploads',
		config: {
			allowDelete: { type: 'mgToggle', default: true },
			listMode: { type: 'mgChoiceButtons', enum: ['list', 'thumbnails'], default: 'list' }
		}
	});
}]).component('mgFileList', {
	bindings: {
		config: '<',
		data: '='
	},
	controller: ['$element', '$http', '$macgyver', '$scope', '$timeout', function controller($element, $http, $macgyver, $scope, $timeout) {
		var $ctrl = this;
		$macgyver.inject($scope, $ctrl);

		$ctrl.thumbnailAble = ['png', 'jpg', 'jpeg', 'gif', 'webm', 'svg'];

		// URL storage {{{
		$ctrl.urls = {}; // These all get their defaults in $onInit

		$ctrl.getUrl = function (type, context) {
			if (_.isString($ctrl.urls[type])) {
				return $ctrl.urls[type]; // Already a string - just return
			} else if (_.isFunction($ctrl.urls[type])) {
				// Resolve it using a context
				return $ctrl.urls[type](Object.assign({}, {
					type: type,
					widget: 'mgFileList',
					path: $macgyver.getPath($scope)
				}, context));
			} else {
				throw new Error('Unknown URL type: ' + type);
			}
		};
		// }}}

		// Init {{{
		$ctrl.$onInit = function () {
			$ctrl.urls.query = $ctrl.config.urlQuery || $macgyver.settings.urlResolver || '/api/widgets';
			$ctrl.urls.delete = $ctrl.config.urlDelete || $macgyver.settings.urlResolver || function (o) {
				return '/api/widgets/' + o.path;
			};

			$ctrl.refresh();
		};
		// }}}

		// Fetch data from server {{{
		$ctrl.refresh = function () {
			if (!_.isEmpty($ctrl.data)) {
				// Use data
				$ctrl.data = $ctrl.data;
			} else {
				// Fetch data via URL
				$http.get($ctrl.getUrl('query')).then(function (data) {
					return $ctrl.data = data.data.map(function (file) {
						if (!_.isString(file.thumbnail)) file.thumbnail = $ctrl.thumbnailAble.includes(file.ext);
						return file;
					});
				});
			}
		};
		// }}}

		// External events {{{
		$scope.$on('mg.refreshUploads', function () {
			return $ctrl.refresh();
		});
		// }}}

		// Deal with deletes {{{
		$ctrl.delete = function (file) {
			return $http.delete($ctrl.getUrl('delete', { file: file.name })).then($ctrl.refresh, $ctrl.refresh) // Whatever happens - refresh
			.then(function () {
				if (_.isFunction($ctrl.config.onDelete)) $ctrl.config.onDelete(file);
			});
		};
		// }}}
	}],
	template: '\n\t\t\t<ul ng-if="!$ctrl.config.listMode || $ctrl.config.listMode == \'list\'" class="list-group">\n\t\t\t\t<a ng-repeat="file in $ctrl.data track by file.name" class="list-group-item" href="{{file.url}}" target="_blank">\n\t\t\t\t\t<span class="badge">{{file.size | filesize}}</span>\n\t\t\t\t\t<button ng-if="$ctrl.config.allowDelete === undefined || $ctrl.config.allowDelete" ng-click="$ctrl.delete(file); $event.preventDefault()" type="button" class="btn btn-danger btn-sm visible-parent-hover pull-right m-t--5 m-r-5"><i class="fa fa-trash"></i></button>\n\t\t\t\t\t<i ng-class="file.icon"></i>\n\t\t\t\t\t{{file.name}}\n\t\t\t\t</a>\n\t\t\t\t<li ng-repeat="file in $ctrl.uploading" class="list-group-item">\n\t\t\t\t\t<i class="fa fa-spinner fa-spin"></i>\n\t\t\t\t\t{{file.name}}\n\t\t\t\t</li>\n\t\t\t</ul>\n\t\t\t<div ng-if="$ctrl.config.listMode == \'thumbnails\'" class="row" style="display:flex; flex-wrap: wrap">\n\t\t\t\t<div ng-repeat="file in $ctrl.data track by file.name" class="col-xs-6 col-md-3 m-b-10 visible-parent-hover-target">\n\t\t\t\t\t<a class="thumbnail" href="{{file.url}}" target="_blank" style="height: 100%; display: flex; align-items: center; justify-content: center">\n\t\t\t\t\t\t<img ng-if="file.thumbnail" src="{{file.url}}"/>\n\t\t\t\t\t\t<div ng-if="!file.thumbnail" class="text-center"><i ng-class="file.icon" class="fa-5x"></i></div>\n\t\t\t\t\t</a>\n\t\t\t\t\t<a ng-if="$ctrl.config.allowDelete === undefined || $ctrl.config.allowDelete" ng-click="$ctrl.delete(file)" class="btn btn-circle btn-danger visible-parent-hover" style="position: absolute; bottom: 15px; right: 20px">\n\t\t\t\t\t\t<i class="fa fa-fw fa-lg fa-trash"></i>\n\t\t\t\t\t</a>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t'
});

/**
* MacGyver file upload
* NOTE: This module optionally uses mgFileList by default. You can override this if needed to only display an uploader.
* @param {Object} config The config specification
* @param {string} [config.icon="fa fa-file"] The icon class to display in the file selection button
* @param {string} [config.placeholder="Upload file..."] Placeholder text to display when no file is selected
* @param {string} [config.showList=true] Whether to automatically display a file list
* @param {string} [config.listMode='files'] The list mode display to use
* @param {string} [config.showUploading=true] Whether to display uploading files
* @param {boolean} [config.allowDelete=true] Whether to allow file deletion
* @param {string|function} [config.urlQuery] The URL to query for files. If unset $macgyver.settings.urlResolver is used
* @param {string|function} [config.urlUpload] The URL to upload files to. If unset $macgyver.settings.urlResolver is used
* @param {string|function} [config.urlDelete] The URL to delete files from. If unset $macgyver.settings.urlResolver is used
* @param {function} [config.onUpload] Callback to fire when a file is uploaded (as well as firing a `$broadcast('mg.refreshUploads')`)
* @param {*} data The state data
* @emits mg.refreshUploads Fired when all upload lists should refresh their contents as a file upload has just taken place
*/
angular.module('macgyver').config(['$macgyverProvider', function ($macgyverProvider) {
	return $macgyverProvider.register('mgFileUpload', {
		title: 'File upload',
		icon: 'fa fa-file-o',
		category: 'Files and uploads',
		config: {
			icon: { type: 'mgText', default: 'fa fa-file-text' },
			placeholder: { type: 'mgText', default: 'Upload file...', help: 'Ghost text to display when no file is present' },
			allowDelete: { type: 'mgToggle', default: true },
			showList: { type: 'mgToggle', default: true, help: 'Show a list of files already uploaded' },
			listMode: { type: 'mgChoiceButtons', enum: ['list', 'thumbnails'], default: 'list' }, // NOTE: This is really just inherited by the mgFileList child element
			showUploading: { type: 'mgToggle', default: true }
		}
	});
}]).component('mgFileUpload', {
	bindings: {
		config: '<',
		data: '=?'
	},
	controller: ['$element', '$http', '$macgyver', '$scope', '$timeout', function controller($element, $http, $macgyver, $scope, $timeout) {
		var $ctrl = this;
		$macgyver.inject($scope, $ctrl);

		// URL storage {{{
		$ctrl.urls = {}; // These all get their defaults in $onInit

		$ctrl.getUrl = function (type, context) {
			if (_.isString($ctrl.urls[type])) {
				return url[type]; // Already a string - just return
			} else if (_.isFunction($ctrl.urls[type])) {
				// Resolve it using a context
				return $ctrl.urls[type](Object.assign({}, {
					type: type,
					widget: 'mgFileUpload',
					path: $macgyver.getPath($scope)
				}, context));
			} else {
				throw new Error('Unknown URL type: ' + type);
			}
		};
		// }}}

		// Init {{{
		$ctrl.$onInit = function () {
			$ctrl.urls.upload = $ctrl.config.urlUpload || $macgyver.settings.urlResolver || function (o) {
				return '/api/widgets/' + o.path;
			};

			// Setup the child list widget with the same path as this object
			$ctrl.listConfig = angular.extend({}, $ctrl.config, { mgPath: $macgyver.getPath($scope) });
		};
		// }}}

		// Deal with new uploads {{{
		$ctrl.selectedFile;
		$ctrl.uploading = [];

		$ctrl.click = function () {
			return $element.find('input[type=file]').trigger('click');
		};

		$element.find('input[type=file]').on('change', function () {
			var _this = this;

			$timeout(function () {
				// Attach to file widget and listen for change events so we can update the text
				var filename = $(_this).val().replace(/\\/g, '/').replace(/.*\//, ''); // Tidy up the file name

				var formData = new FormData();
				formData.append('file', _this.files[0]);

				$ctrl.uploading.push({
					name: filename,
					$promise: $http.post($ctrl.getUrl('upload', { file: filename }), formData, {
						headers: { 'Content-Type': undefined }, // Need to override the headers so that angular changes them over into multipart/mime
						transformRequest: angular.identity
					}).then(function () {
						$ctrl.uploading = $ctrl.uploading.filter(function (i) {
							return i.name != filename;
						}); // Remove this item from the upload list
						if (_.isFunction($ctrl.config.onUpload)) $ctrl.config.onUpload();
						$macgyver.broadcast($scope, 'mg.refreshUploads'); // Tell all file displays to refresh their contents
					})
				});
			});
		});

		// }}}
	}],
	template: '\n\t\t\t<a ng-click="$ctrl.click()" class="btn btn-primary hidden-print" style="margin-bottom:10px">\n\t\t\t\t<i ng-class="$ctrl.icon || \'fa fa-file\'"></i>\n\t\t\t\t{{$ctrl.selectedFile || $ctrl.placeholder || \'Upload file...\'}}\n\t\t\t</a>\n\t\t\t<div ng-if="$ctrl.config.showList === undefined || $ctrl.config.showList">\n\t\t\t\t<mg-file-list config="$ctrl.listConfig" data="$ctrl.data"></mg-file-list>\n\t\t\t</div>\n\t\t\t<ul ng-if="$ctrl.config.showUploading === undefined || $ctrl.config.showUploading" class="list-group">\n\t\t\t\t<li ng-repeat="file in $ctrl.uploading" class="list-group-item">\n\t\t\t\t\t<i class="fa fa-spinner fa-spin"></i>\n\t\t\t\t\t{{file.name}}\n\t\t\t\t</li>\n\t\t\t</ul>\n\t\t\t<div style="display: none"><input type="file" name="file"/></div>\n\t\t'
});

/**
* MacGyver form editor
* Meta component to edit a form
* @param {Object} [$macgyver.settings.mgFormEditor.maskPosition] Optional object containing left, top, width, height relative positions (e.g. left=1 will use the position + 1px)
*/
angular.module('macgyver').component('mgFormEditor', {
	template: '\n\t\t\t<!-- Widget Add modal {{{ -->\n\t\t\t<div id="modal-mgFormEditor-add" class="modal fade">\n\t\t\t\t<div class="modal-dialog" style="width: 50%">\n\t\t\t\t\t<div class="modal-content">\n\t\t\t\t\t\t<div class="modal-header">\n\t\t\t\t\t\t\t<a class="close" data-dismiss="modal"><i class="fa fa-times"></i></a>\n\t\t\t\t\t\t\t<h4 class="modal-title">Add Widget</h4>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t\t<div class="modal-body">\n\t\t\t\t\t\t\t<div class="row">\n\t\t\t\t\t\t\t\t<div class="col-md-3">\n\t\t\t\t\t\t\t\t\t<ul class="nav nav-pills nav-stacked">\n\t\t\t\t\t\t\t\t\t\t<li ng-repeat="cat in $ctrl.categories" ng-class="cat == $ctrl.category && \'active\'" ng-click="$ctrl.category = cat">\n\t\t\t\t\t\t\t\t\t\t\t<a>{{cat}}</a>\n\t\t\t\t\t\t\t\t\t\t</li>\n\t\t\t\t\t\t\t\t\t</ul>\n\t\t\t\t\t\t\t\t</div>\n\t\t\t\t\t\t\t\t<div class="col-md-9">\n\t\t\t\t\t\t\t\t\t<a ng-click="$ctrl.widgetAddSubmit({type: widget.id})" ng-repeat="widget in $ctrl.$macgyver.widgets | mgFilterObject:{userPlaceable:true, category: $ctrl.category} track by widget.id" class="col-md-4 pad-top-sm">\n\t\t\t\t\t\t\t\t\t\t<div class="btn btn-default btn-xlg btn-block text-center">\n\t\t\t\t\t\t\t\t\t\t\t<div><i ng-class="widget.icon" class="fa-4x"></i></div>\n\t\t\t\t\t\t\t\t\t\t\t<div class="pad-top-sm">{{widget.title}}</div>\n\t\t\t\t\t\t\t\t\t\t</div>\n\t\t\t\t\t\t\t\t\t</a>\n\t\t\t\t\t\t\t\t</div>\n\t\t\t\t\t\t\t</div>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t\t<!-- }}} -->\n\t\t\t\n\t\t\t<!-- Widget Edit modal {{{ -->\n\t\t\t<div id="modal-mgFormEditor-edit" class="modal fade">\n\t\t\t\t<div class="modal-dialog">\n\t\t\t\t\t<div class="modal-content">\n\t\t\t\t\t\t<div class="modal-header">\n\t\t\t\t\t\t\t<a class="close" data-dismiss="modal"><i class="fa fa-times"></i></a>\n\t\t\t\t\t\t\t<h4 class="modal-title">Edit Widget {{$ctrl.widgetName}}</h4>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t\t<div class="modal-body form-horizontal">\n\t\t\t\t\t\t\t<mg-form config="$ctrl.selectedWidgetForm" data="$ctrl.selectedWidgetData"></mg-form>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t\t<div class="modal-footer">\n\t\t\t\t\t\t\t<div class="pull-left">\n\t\t\t\t\t\t\t\t<a ng-click="$ctrl.widgetDelete()" type="button" class="btn btn-danger" data-dismiss="modal"><i class="fa fa-trash"></i> Delete</a>\n\t\t\t\t\t\t\t</div>\n\t\t\t\t\t\t\t<div class="pull-right">\n\t\t\t\t\t\t\t\t<a type="button" class="btn btn-primary" data-dismiss="modal"><i class="fa fa-check"></i> Save &amp; Close</a>\n\t\t\t\t\t\t\t</div>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t\t<!-- }}} -->\n\t\t\t\n\t\t\t<!-- Form editing hover mask {{{ -->\n\t\t\t<div class="mgFormEditor-mask-background">\n\t\t\t\t<a ng-click="$ctrl.widgetAdd(\'above\')" class="mgFormEditor-mask-add-above"><i class="fa fa-2x fa-arrow-up"></i></a>\n\t\t\t\t<a ng-click="$ctrl.widgetAdd(\'below\')" class="mgFormEditor-mask-add-below"><i class="fa fa-2x fa-arrow-down"></i></a>\n\t\t\t</div>\n\t\t\t<div class="mgFormEditor-mask-verbs">\n\t\t\t\t<div class="pull-right">\n\t\t\t\t\t<a ng-show="$ctrl.$macgyver.widgets[$ctrl.selectedWidget.type].isContainer" ng-click="$ctrl.widgetAdd(\'inside\'); $event.stopPropagation()" class="btn btn-success btn-sm" tooltip="Insert new widget inside this container" tooltip-container="body"><i class="fa fa-fw fa-indent"></i></a>\n\t\t\t\t\t<a ng-click="$ctrl.widgetToggle(\'showTitle\', true)" class="btn btn-default btn-sm" tooltip="Toggle the title visibility of this element" tooltip-container="body"><i class="fa fa-fw fa-arrows-h"></i></a>\n\t\t\t\t\t<a ng-click="$ctrl.widgetDelete(); $event.stopPropagation()" class="btn btn-danger btn-sm" tooltip="Delete this widget" tooltip-container="body"><i class="fa fa-fw fa-trash"></i></a>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t\t<!-- }}} -->\n\t\t\t\n\t\t\t<!-- Widget context menu {{{ -->\n\t\t\t<ul id="mgFormEditor-dropdown-widget" class="dropdown-menu">\n\t\t\t\t<li><a ng-click="$ctrl.widgetEdit()"><i class="fa fa-fw fa-pencil"></i> Edit</a></li>\n\t\t\t\t<li class="dropdown-submenu">\n\t\t\t\t\t<a tabindex="-1"><i class="fa fa-fw fa-plus"></i> Add widget...</a>\n\t\t\t\t\t<ul class="dropdown-menu">\n\t\t\t\t\t\t<li><a ng-click="$ctrl.widgetAdd(\'above\')"><i class="fa fa-fw fa-arrow-up"></i> Above</a></li>\n\t\t\t\t\t\t<li><a ng-click="$ctrl.widgetAdd(\'below\')"><i class="fa fa-fw fa-arrow-down"></i> Below</a></li>\n\t\t\t\t\t</ul>\n\t\t\t\t</li>\n\t\t\t\t<li class="divider"></li>\n\t\t\t\t<li><a ng-click="$ctrl.widgetDelete()"><i class="fa fa-fw fa-trash"></i> Delete</a></li>\n\t\t\t</ul>\n\t\t\t<!-- }}} -->\n\t\t\t\n\t\t\t<mg-form config="$ctrl.config" data="$ctrl.data"></mg-form>\n\t\t\t\n\t\t',
	bindings: {
		config: '<',
		data: '='
	},
	controller: ['$element', '$macgyver', '$scope', 'TreeTools', function controller($element, $macgyver, $scope, TreeTools) {
		var $ctrl = this;
		$ctrl.$macgyver = $macgyver;

		// .editing mode {{{
		// This variable (as well as the partner CSS: `mg-form-editor.editing` dictates whether mg-form-editor should react to events like clicking form elements
		$ctrl.editing = false;
		$ctrl.setEditing = function (editing) {
			$ctrl.editing = editing;
			$element.toggleClass('editing', $ctrl.editing);
		};

		$scope.$evalAsync(function () {
			return $ctrl.setEditing(true);
		}); // Kickoff initial editing mode when everything settles
		// }}}

		// Widget Creation {{{
		$ctrl.categories = _($macgyver.widgets).filter(function (w) {
			return w.userPlaceable;
		}).map('category').sort().uniq().value();

		$ctrl.category = $ctrl.categories[0];

		/**
  * Container for the element we're going to create
  * @var {Object}
  * @var {string} Object.id The ID of the element to add around
  * @var {string} Object.direction The direction to add the new item within. ENUM: 'above', 'below'
  * @var {string} Object.type The type of widget to add
  */
		$ctrl.widgetAddDetails = {}; // Container for the eventually created new widget

		/**
  * Add a new widget
  * @param {string} direction The direction relative to the currently selected DOM element to add from. ENUM: 'above', 'below'
  * @param {Object|string} [widget] Optional widget or widget id to add relative to, if omitted the currently selected DOM element is used
  */
		$ctrl.widgetAdd = function (direction, widget) {
			var node;
			if (_.isString(widget)) {
				debugger;
				node = TreeTools.find($ctrl.config, { id: widget }, { childNode: 'items' });
			} else if (_.isObject(widget)) {
				node = widget;
			} else {
				// Work out what item we are currently hovering over
				node = TreeTools.find($ctrl.config, { id: $ctrl.selectedWidget.id }, { childNode: 'items' });
			}
			if (!node) return; // Didn't find anything - do nothing

			$ctrl.widgetAddDetails = {
				id: node.id,
				direction: direction
			};

			$('#modal-mgFormEditor-add').modal('show');
		};

		// Also listen for broadcasts from child controls such as the 'Add widget' button on empty containers
		$scope.$on('mg.mgFormEditor.widgetAdd', function (e, direction, widget) {
			return $ctrl.widgetAdd(direction, widget);
		});

		/**
  * Finalize the state of $ctrl.widgetAddDetails and make the object
  * @param {Object} props props to merge with $ctrl.widgetAddDetails before submission
  */
		$ctrl.widgetAddSubmit = function (props) {
			angular.merge($ctrl.widgetAddDetails, props);
			$('#modal-mgFormEditor-add').modal('hide');

			// Locate node we are adding above / below
			var node = TreeTools.find($ctrl.config, { id: $ctrl.widgetAddDetails.id }, { childNode: 'items' });
			if (!node) return console.error('Asked to create a widget around non-existant ID', $ctrl.widgetAddDetails); // Can't find element anyway
			var nodeParent = TreeTools.parents($ctrl.config, { id: $ctrl.widgetAddDetails.id }, { childNode: 'items' }).slice(-2).slice(0, 1)[0];
			var nodeIndex = nodeParent.items.findIndex(function (i) {
				return i.id == node.id;
			});

			// Insert new widget into parents items collection
			var prototypeWidget = {
				id: $ctrl.widgetAddDetails.type + '-' + _.times(5, function (i) {
					return _.sample('abcdefghijklmnopqrstuvwxyz').split('');
				}).join(''), // Generate a random ID
				type: $ctrl.widgetAddDetails.type
			};

			switch ($ctrl.widgetAddDetails.direction) {
				case 'above':
					//if inserting above an index 0, need to ensure index is not -ve
					var insertedIndex = nodeIndex - 1 < 0 ? 0 : nodeIndex - 1;
					//actually insert the prototypeWidget
					nodeParent.items.splice(insertedIndex, 0, prototypeWidget);
					$ctrl.widgetEdit(nodeParent.items[insertedIndex]);
					break;
				case 'below':
					//Insert below the current widget (increment by 1)
					var insertedIndex = nodeIndex + 1;
					//actually insert the prototypeWidget
					nodeParent.items.splice(insertedIndex, 0, prototypeWidget);
					$ctrl.widgetEdit(nodeParent.items[insertedIndex]);
					break;
				case 'inside':
					node.items.push(prototypeWidget);
					$ctrl.widgetEdit(node.items[node.items.length - 1]);
					break;
			}

			$scope.$broadcast('mg.mgFormEditor.change');
		};
		// }}}

		// Widget Editing {{{
		$ctrl.selectedWidget; // The currently selected widget (determined by mouseover)
		$ctrl.selectedWidgetData;
		$ctrl.selectedWidgetForm;
		$ctrl.widgetName;

		/**
  * Begin editing a widget
  * @param {Object} [widget] An optional widget to edit, if omitted the widget is calculated from the currently selected DOM element
  */
		$ctrl.widgetEdit = function (widget) {
			var node;
			if (_.isObject(widget)) {
				node = widget;
			} else if ($ctrl.selectedWidget) {
				// Try to determine from currently selected widget if we have one
				node = TreeTools.find($ctrl.config, { id: $ctrl.selectedWidget.id }, { childNode: 'items' });
			} else {
				// Can't do anything - cancel action
				return;
			}

			if (!node) return; // Didn't find anything - do nothing

			// Get Human Readable Name for the edit widget. If error jsut use vanilla display
			if (node.type && typeof node.type == 'string') {
				$ctrl.widgetName = ' - ' + node.type.replace(/^mg+/i, '').replace(/([A-Z])/g, ' $1').trim();
			}

			// Select the Angular data element
			$ctrl.selectedWidgetData = node;

			// Setup a form definition from the defined properties of the config element
			$ctrl.selectedWidgetForm = {
				type: 'mgContainer',
				items: [
				// Options applicable to all types {{{
				{
					id: 'globalConfig',
					type: 'mgContainer',
					ignoreScope: true,
					showTitle: false,
					items: [{ id: 'id', type: 'mgText', title: 'ID' }]
				},
				// }}}
				{ id: 'sepGlobal', type: 'mgSeperator', showTitle: false },
				// Options for this specific type {{{
				{
					id: 'typeConfig',
					type: 'mgContainer',
					ignoreScope: true,
					showTitle: false,
					items: _($macgyver.widgets[$ctrl.selectedWidgetData.type].config).map(function (v, k) {
						v.id = k;
						if (!v.title) v.title = _.startCase(k);
						return v;
					}).filter(function (i) {
						return i.id != 'items';
					}) // Sub-items are managed by the UI
					.value()
				},
				// }}}
				// Options inherited from parents (via configChildren) {{{
				{
					id: 'parentConfig',
					type: 'mgContainer',
					ignoreScope: true,
					showTitle: false,
					items:
					// Partially horrifying method of scoping upwards though a tree to determine parent config
					_(
					// Step 1 - extract all the parent items configChildren and merge it into an object (oldest config first so children overwrite)
					_(TreeTools.parents($ctrl.config, node, { childNode: 'items' })).slice(0, -1) // Remove this node from the list
					.reverse() // We're interested in the oldest first (so younger parents overwrite the config)
					.map(function (p) {
						return _.get($macgyver, ['widgets', p.type, 'configChildren']);
					}).filter() // Remove all blank items
					.reduce(function (obj, p) {
						return _.assign(obj, p);
					}, {}))
					// Step 2 - transform output into a form
					.map(function (p, k) {
						p.id = k;
						if (!p.title) p.title = _.startCase(k);
						return p;
					}).value()
				}]
			};

			$ctrl.setEditing(false);
			$('#modal-mgFormEditor-edit').modal('show').one('hidden.bs.modal', function () {
				$ctrl.setEditing(true); // Restore editing ability to editor (i.e. click will open the edit page)
			});
		};

		// Clicking on any widget when the mask is enabled should open an editor {{{
		$element.on('mousedown', 'mg-container > div', function (event) {
			var elem = angular.element(this);
			if (elem.closest('.modal').length) return; // Don't react when the element is inside a modal

			if (event.button == 0) {
				event.stopPropagation();
				$scope.$apply(function () {
					$ctrl.widgetEdit();
				});
			}
		});

		// Open a context menu on RMB
		$element.on('contextmenu', 'mg-container > div', function (event) {
			var elem = angular.element(this);
			if (elem.closest('.modal').length) return; // Don't react when the element is inside a modal
			event.stopPropagation();
			event.preventDefault();

			// Close the dropdown if the user clicks off it {{{
			angular.element(document).one('mousedown', function (e) {
				if (!angular.element(e.target).closest('.dropdown-menu').length) e.stopPropagation(); // Only prevent the click if the user wasn't clicking the dropdown menu
				// Hide the menu in 100ms (Angular gets upset if we trigger an ng-click on an invisible <a> tag)
				setTimeout(function () {
					return angular.element('#mgFormEditor-dropdown-widget').css('display', 'none');
				}, 100);
			});
			// }}}

			// Position a dropdown under the mouse {{{
			var pos = this.getBoundingClientRect();
			angular.element('#mgFormEditor-dropdown-widget').css({
				left: pos.left + _.get($macgyver.settings, 'mgFormEditor.menuPosition.left', 0),
				top: pos.top + _.get($macgyver.settings, 'mgFormEditor.menuPosition.top', 0)
			});
			// }}}
		});
		// }}}

		/**
  * Toggle a single property associated with the active widget
  * @param {string} prop The property to toggle
  * @param {boolean} [startValue=false] The starting value of the property if undefined
  */
		$ctrl.widgetToggle = function (prop, startValue) {
			var node = TreeTools.find($ctrl.config, { id: $ctrl.selectedWidget.id }, { childNode: 'items' });
			if (!node) return; // Didn't find anything - do nothing

			if (!_.has(node, prop)) {
				// Not yet set - assume its starting value is 'startValue'
				node[prop] = !startValue;
			} else {
				// Just invert
				node[prop] = !node[prop];
			}
		};

		// }}}

		// Widget Deletion {{{
		/**
  * Delete a widget
  * @params {Object} [widget] Optional widget to delete, if omitted the currently active DOM element will be used
  */
		$ctrl.widgetDelete = function (widget) {
			// Work out what item we are currently hovering over
			var node = widget || TreeTools.find($ctrl.config, { id: $ctrl.selectedWidget.id }, { childNode: 'items' });
			if (!node) return; // Didn't find anything - do nothing

			var nodeParent = TreeTools.parents($ctrl.config, { id: node.id }, { childNode: 'items' }).slice(-2).slice(0, 1)[0];
			if (!nodeParent) throw new Error('Cannot find widget parent for ID: ' + node.id);
			var nodeIndex = nodeParent.items.findIndex(function (i) {
				return i.id == node.id;
			});

			nodeParent.items.splice(nodeIndex, 1);
		};
		// }}}

		// Setup a mask over any widget when the user moves their mouse over them {{{
		$element.on('mouseover', 'mg-container > div', function (event) {
			event.stopPropagation();
			var elem = angular.element(this);
			if (elem.closest('.modal').length) return; // Don't react when the element is inside a modal

			var pos = this.getBoundingClientRect();
			var setCSS = {
				left: pos.left + _.get($macgyver.settings, 'mgFormEditor.maskPosition.left', 0),
				top: pos.top + _.get($macgyver.settings, 'mgFormEditor.maskPosition.top', 0),
				width: elem.width() + _.get($macgyver.settings, 'mgFormEditor.maskPosition.width', 0),
				height: elem.height() + _.get($macgyver.settings, 'mgFormEditor.maskPosition.height', 0)
			};
			$element.children('.mgFormEditor-mask-background').css(setCSS);

			var verbWidth = 250;
			$element.children('.mgFormEditor-mask-verbs').css({
				left: setCSS.left + setCSS.width - verbWidth - 5,
				top: setCSS.top,
				width: verbWidth
			});
			$scope.$apply(function () {
				$ctrl.selectedWidget = TreeTools.find($ctrl.config, { id: elem.attr('data-path') }, { childNode: 'items' });
			});
		});
		// }}}
	}]
});

/**
* MacGyver form
* This should be the topmost item within a MacGyver form. It loads the actual form display and the data associated with it
*/
angular.module('macgyver').component('mgForm', {
	bindings: {
		config: '<',
		data: '='
	},
	controller: ['$macgyver', '$q', '$scope', function controller($macgyver, $q, $scope) {
		var $ctrl = this;
		$ctrl.errors;

		// MacGyver integration {{{
		$scope.$on('mg.getForm', function (e, f) {
			f.$ctrl = $ctrl;
			f.$scope = $scope;
		});
		// }}}

		/**
  * Broadcasts 'mgValidate' to all child controls and collections responses
  * Each child control can respond by decorating the 'response' object with its
  * The resolution of this promise will be a collection where each element will be of the form {id: <component ID>, err: <string>}
  * @return {Promise} A promise which will resolve if everything validates, a collection of errors if not
  */
		$ctrl.validate = function () {
			return $q(function (resolve, reject) {
				$q.all( // Compose into promises then wait for them to resolve
				_($macgyver.getAll($scope)) // Get all MacGyver components
				.pickBy(function (c, k) {
					return _.isFunction(c.validate);
				}) // Filter by components with a validate method
				.mapValues(function (c, k) {
					return c.validate();
				}).value()).then(function (res) {
					var errs = _.reduce(res, function (errs, err, id) {
						// Convert compound errors into a simple collection
						if (!err) {// Undefined - assume all ok
							// Do nothing
						} else if (_.isArray(err)) {
							// Multiple errors
							err.filter(function (e) {
								return !!e;
							}) // Remove all falsy elements
							.forEach(function (e) {
								return errs.push({ id: id, err: e });
							});
						} else if (_.isString(err)) {
							// Single error
							errs.push({ id: id, err: err });
						} else if (v === false) {
							// Generic error
							errs.push({ id: id, err: 'is not valid' });
						}

						return errs;
					}, []);

					// Populate the 'mgValidation' variable
					_.forEach($macgyver.getAll($scope), function (component, id) {
						return component.config.mgValidation = errs.some(function (e) {
							return e.id == id;
						}) ? 'error' : 'success';
					});

					if (_.isEmpty(errs)) {
						$ctrl.errors = undefined;
						resolve();
					} else {
						$ctrl.errors = errs;
						reject(errs);
					}
				}).catch(function (e) {
					return reject(e);
				});
			});
		};

		$scope.$watch('$ctrl.config', function () {
			if (!$ctrl.config) return; // Form not loaded yet
			// Force showTitle to be false on the root element if its not already set
			if (_.isUndefined($ctrl.config.showTitle)) $ctrl.config.showTitle = false;
		});
	}],
	template: '\n\t\t\t<form submit="$ctrl.submit" class="form-horizontal">\n\t\t\t\t<div ng-show="$ctrl.errors" class="alert alert-warning animate fadeInDown">\n\t\t\t\t\t<ul>\n\t\t\t\t\t\t<li ng-repeat="err in $ctrl.errors">{{err.err}}</li>\n\t\t\t\t\t</ul>\n\t\t\t\t</div>\n\n\t\t\t\t<mg-container config="$ctrl.config" data="$ctrl.data"></mg-container>\n\t\t\t</form>\n\t\t'
});

/**
* MacGyver component layout for grids
* This container displays an array (rows) or arrays (columns) of widgets (items)
* @param {Object} config The config specification
* @param {array} config.items A collection of sub-item objects to display
* @param {array} config.items[] A column definition
* @param {string} config.items[][].type The type of the object to render. This corresponds to a `mg*` component
* @param {*} data The state data
*/
angular.module('macgyver').config(['$macgyverProvider', function ($macgyverProvider) {
	return $macgyverProvider.register('mgGrid', {
		title: 'Grid layout',
		icon: 'fa fa-dropbox',
		category: 'Layout',
		isContainer: true,
		config: {
			rows: { type: 'mgNumber', default: 1, min: 1, max: 100 },
			cols: { type: 'mgNumber', default: 1, min: 1, max: 100 }
		}
	});
}]).component('mgGrid', {
	bindings: {
		config: '<',
		data: '='
	},
	controller: ['$macgyver', '$scope', function controller($macgyver, $scope) {
		var $ctrl = this;
		$macgyver.inject($scope, $ctrl);

		$ctrl.$onInit = function () {
			// Populate rows + cols when we boot
			$ctrl.config.rows = $ctrl.config.items.length;
			$ctrl.config.cols = Math.max.apply(Math, _toConsumableArray($ctrl.config.items.map(function (i) {
				return i.items.length;
			})));
		};

		$scope.$watchGroup(['$ctrl.config.rows', '$ctrl.config.cols'], function () {
			if (_.has($ctrl, 'config.rows')) {
				// Rows has been set - probably by the user editing the widget properties
				if ($ctrl.config.rows < $ctrl.config.items.length) {
					// Removing some items
					debugger;
					$ctrl.config.items = $ctrl.config.items.slice(0, $ctrl.config.rows);
				} else if ($ctrl.config.rows > $ctrl.config.items.length) {
					// Adding some rows
					_.range($ctrl.config.items.length, $ctrl.config.rows).forEach(function (i) {
						$ctrl.config.items.push({
							id: $ctrl.config.id + '-row-' + i,
							type: 'mgGridRow',
							items: []
						});
					});
				}
			}

			if (_.has($ctrl, 'config.cols')) {
				// Verify that all rows have the correct number of row blocks
				$ctrl.config.items.forEach(function (row, r) {
					if (row.items.length < $ctrl.config.cols) {
						// Not enough blocks
						_.range(row.items.length, $ctrl.config.cols).forEach(function (c) {
							row.items.push({
								id: $ctrl.config.id + '-row-' + r + '-col-' + c,
								type: 'mgContainer',
								items: []
							});
						});
					} else if (row.items.length > $ctrl.config.cols) {
						// Too many blocks
						row.items = row.items.slice(0, $ctrl.config.cols);
					}
				});
			}
		});
	}],
	template: ['$macgyver', function template($macgyver) {
		return '\n\t\t\t<table class="table table-striped table-bordered">\n\t\t\t\t<tr ng-repeat="row in $ctrl.config.items">\n\t\t\t\t\t<td ng-repeat="w in row.items" ng-switch="w.type">\n\t\t\t\t\t\t' + _.map($macgyver.widgets, function (w) {
			return '<div ng-switch-when="' + w.id + '">' + w.template + '</div>';
		}).join('\n') + '\n\t\t\t\t\t</td>\n\t\t\t\t</tr>\n\t\t\t</table>\n\t\t';
	}]
});

/**
* MacGyver static header
* This is simple display of heading level text. The text content is loaded either from the data feed or the `config.text` property in that order
* @param {Object} config The config specification
* @param {string} [config.text] The text to display if the data feed does not provide it
* @param {*} data The state data
*/
angular.module('macgyver').config(['$macgyverProvider', function ($macgyverProvider) {
	return $macgyverProvider.register('mgHeading', {
		title: 'Heading',
		icon: 'fa fa-header',
		category: 'General Decoration',
		config: {
			text: { type: 'mgText' }
		}
	});
}]).component('mgHeading', {
	bindings: {
		config: '<',
		data: '='
	},
	controller: ['$macgyver', '$scope', function controller($macgyver, $scope) {
		var $ctrl = this;
		$macgyver.inject($scope, $ctrl);
	}],
	template: '\n\t\t\t<legend class="form-control-static">{{$ctrl.data || $ctrl.config.text}}</legend>\n\t\t'
});

/**
* MacGyver static HTML
* This is simple display of HTML content
* @param {Object} config The config specification
* @param {string} [config.text] The HTML content to display if the data feed does not provide it
* @param {*} data The state data
*/
angular.module('macgyver').config(['$macgyverProvider', function ($macgyverProvider) {
	return $macgyverProvider.register('mgHtml', {
		title: 'Read-only HTML',
		icon: 'fa fa-html5',
		category: 'General Decoration',
		config: {
			text: { type: 'mgHtml' }
		}
	});
}]).component('mgHtml', {
	bindings: {
		config: '<',
		data: '='
	},
	controller: ['$macgyver', '$scope', function controller($macgyver, $scope) {
		var $ctrl = this;
		$macgyver.inject($scope, $ctrl);
	}],
	template: '\n\t\t\t<div class="form-control-static" ng-bind-html="$ctrl.data || $ctrl.config.text"></div>\n\t\t'
});

/**
* MacGyver Image directive
* @require angular-ui-scribble
* @param {Object} config The config specification
* @param {string} [config.showList=true] Whether to automatically display a file list
* @param {string} [config.listMode='thumbnails'] The list mode display to use
* @param {*} data The state data
*/
angular.module('macgyver').config(['$macgyverProvider', function ($macgyverProvider) {
	return $macgyverProvider.register('mgImage', {
		title: 'Image',
		icon: 'fa fa-pencil-square',
		category: 'Files and uploads',
		config: {
			title: { type: 'mgText', default: 'Attach image' },
			allowDelete: { type: 'mgToggle', default: true },
			showList: { type: 'mgToggle', default: true, help: 'Show a list of images already uploaded' },
			listMode: { type: 'mgChoiceButtons', enum: ['list', 'thumbnails'], default: 'thumbnails' } // NOTE: This is really just inherited by the mgFileList child element
		}
	});
}]).component('mgImage', {
	bindings: {
		config: '<',
		data: '='
	},
	controller: ['$http', '$macgyver', '$scope', function controller($http, $macgyver, $scope) {
		var $ctrl = this;
		$macgyver.inject($scope, $ctrl);

		// URL storage {{{
		$ctrl.urls = {}; // These all get their defaults in $onInit

		$ctrl.getUrl = function (type, context) {
			if (_.isString($ctrl.urls[type])) {
				return url[type]; // Already a string - just return
			} else if (_.isFunction($ctrl.urls[type])) {
				// Resolve it using a context
				return $ctrl.urls[type](Object.assign({}, {
					type: type,
					widget: 'mgImage',
					path: $macgyver.getPath($scope)
				}, context));
			} else {
				throw new Error('Unknown URL type: ' + type);
			}
		};
		// }}}

		// Init {{{
		$ctrl.$onInit = function () {
			$ctrl.urls.upload = $ctrl.config.urlUpload || $macgyver.settings.urlResolver || function (o) {
				return '/api/widgets/' + o.path;
			};

			// Setup the child list widget with the same path as this object
			$ctrl.listConfig = angular.extend({ listMode: 'thumbnails' }, $ctrl.config, { mgPath: $macgyver.getPath($scope) });
		};
		// }}}

		// Deal with uploads {{{
		$ctrl.isUploading = false;
		$ctrl.getImage = function (dataURI, blob) {
			var sigBlob = new Blob([blob], { type: 'image/png' });
			var formData = new FormData();
			formData.append('file', sigBlob);

			$http.post($ctrl.getUrl('upload', { file: new Date().toISOString() + '.png' }), formData, {
				headers: { 'Content-Type': undefined }, // Need to override the headers so that angular changes them over into multipart/mime
				transformRequest: angular.identity
			}).then(function () {
				$ctrl.isUploading = false;
				$macgyver.broadcast($scope, 'mg.refreshUploads'); // Tell all file displays to refresh their contents
			});

			$ctrl.showModal(false);
			$ctrl.isUploading = true;
		};
		// }}}

		// Deal with modal {{{
		$ctrl.modalShown = false;
		$ctrl.showModal = function (show) {
			if (show) {
				angular.element('#modal-mgImage-' + $ctrl.config.id).on('shown.bs.modal', function () {
					return $scope.$apply(function () {
						return $ctrl.modalShown = true;
					});
				}).on('hidden.bs.modal', function () {
					return $scope.$apply(function () {
						return $ctrl.modalShown = false;
					});
				}).modal('show');
			} else {
				angular.element('#modal-mgImage-' + $ctrl.config.id).modal('hide');
			}
		};
		// }}}
	}],
	template: '\n\t\t\t<div id="modal-mgImage-{{$ctrl.config.id}}" class="modal fade">\n\t\t\t\t<div class="modal-dialog" style="width: 830px">\n\t\t\t\t\t<div class="modal-content">\n\t\t\t\t\t\t<div class="modal-header">\n\t\t\t\t\t\t\t<a class="close" data-dismiss="modal"><i class="fa fa-times"></i></a>\n\t\t\t\t\t\t\t<h4 class="modal-title">{{$ctrl.config.title || \'Attach image\'}}</h4>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t\t<div class="modal-body">\n\t\t\t\t\t\t\t<div ng-if="$ctrl.modalShown">\n\t\t\t\t\t\t\t\t<ui-scribble editable="true" callback="$ctrl.getImage(dataURI, blob)" width="800" height="600"></ui-scribble>\n\t\t\t\t\t\t\t</div>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t\t<div class="modal-footer">\n\t\t\t\t\t\t\t<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t\t<div ng-if="$ctrl.config.showList === undefined || $ctrl.config.showList">\n\t\t\t\t<mg-file-list config="$ctrl.listConfig" data="$ctrl.data"></mg-file-list>\n\t\t\t</div>\n\t\t\t<div ng-if="!$ctrl.files || !$ctrl.files.length" class="hidden-print">\n\t\t\t\t<div ng-if="$ctrl.isUploading" class="alert alert-info font-lg">\n\t\t\t\t\t<i class="fa fa-spinner fa-spin"></i>\n\t\t\t\t\tUploading signature...\n\t\t\t\t</div>\n\t\t\t\t<a ng-click="$ctrl.showModal(true)" class="btn btn-success">\n\t\t\t\t\t<i class="fa fa-plus"></i>\n\t\t\t\t\tAdd image\n\t\t\t\t</a>\n\t\t\t</div>\n\t\t'
});

/**
* MacGyver static label
* This is simple display of read-only text. The text content is loaded either from the data feed or the `config.text` property in that order
* @param {Object} config The config specification
* @param {string} [config.text] The text to display if the data feed does not provide it
* @param {*} data The state data
*/
angular.module('macgyver').config(['$macgyverProvider', function ($macgyverProvider) {
	return $macgyverProvider.register('mgLabel', {
		title: 'Read-only label',
		icon: 'fa fa-font',
		category: 'General Decoration',
		config: {
			text: { type: 'mgText' }
		}
	});
}]).component('mgLabel', {
	bindings: {
		config: '<',
		data: '='
	},
	controller: ['$macgyver', '$scope', function controller($macgyver, $scope) {
		var $ctrl = this;
		$macgyver.inject($scope, $ctrl);
	}],
	template: '\n\t\t\t<div class="form-control-static">{{$ctrl.data || $ctrl.config.text}}</div>\n\t\t'
});

/**
* MacGyver list input
* @param {Object} config The config specification
* @param {boolean} [config.required=false] Whether this field is required
* @param {Date} [config.min] The minimum allowable number of items
* @param {Date} [config.max] The maximum allowable number of items
* @param {*} data The state data
*/
angular.module('macgyver').config(['$macgyverProvider', function ($macgyverProvider) {
	return $macgyverProvider.register('mgList', {
		title: 'List',
		icon: 'fa fa-list-ol',
		category: 'Simple Inputs',
		config: {
			allowDelete: { type: 'mgToggle', default: true },
			min: { type: 'mgNumber', title: 'Minimum number of items' },
			max: { type: 'mgNumber', title: 'Maximum number of items' },
			required: { type: 'mgToggle', default: false },
			numbered: { type: 'mgToggle', default: true }
		}
	});
}]).component('mgList', {
	bindings: {
		config: '<',
		data: '='
	},
	controller: ['$macgyver', '$scope', function controller($macgyver, $scope) {
		var $ctrl = this;
		$macgyver.inject($scope, $ctrl);

		$ctrl.validate = function () {
			return [$ctrl.config.required && (!$ctrl.data || $ctrl.data.length) && $ctrl.config.title + ' is required', $ctrl.config.min && $ctrl.data.length < $ctrl.config.min && $ctrl.config.title + ' has too few items (minimum is ' + $ctrl.config.min + ')', $ctrl.config.max && $ctrl.data.length > $ctrl.config.max && $ctrl.config.title + ' has too many items (maximum is ' + $ctrl.config.max + ')'];
		};

		// Adopt default  if no data value is given {{{
		$scope.$watch('$ctrl.data', function () {
			if (_.isUndefined($ctrl.data) && _.has($ctrl, 'config.default')) $ctrl.data = $ctrl.config.default;
		});
		// }}}

		// Appending {{{
		$ctrl.listNewItem = {
			text: ''
		};

		$ctrl.addItem = function () {
			if (!_.isArray($ctrl.data)) $ctrl.data = [];
			$ctrl.data.push($ctrl.listNewItem.text);
			$ctrl.listNewItem.text = '';
		};
		// }}}

		// Delete {{{
		$ctrl.removeItem = function (index) {
			$ctrl.data = $ctrl.data.filter(function (x, i) {
				return i != index;
			});
		};
		// }}}
	}],
	template: '\n\t\t\t<form ng-submit="$ctrl.addItem()">\n\t\t\t\t<table class="table table-bordered table-hover">\n\t\t\t\t\t<tbody>\n\t\t\t\t\t\t<tr ng-repeat="row in $ctrl.data track by $index">\n\t\t\t\t\t\t\t<td ng-if="$ctrl.config.numbered == undefined || $ctrl.config.numbered" class="text-center font-md">{{$index + 1 | number}}</td>\n\t\t\t\t\t\t\t<td>\n\t\t\t\t\t\t\t\t<input ng-model="row" type="text" class="form-control"/>\n\t\t\t\t\t\t\t</td>\n\t\t\t\t\t\t\t<td ng-if="$ctrl.config.allowDelete == undefined || $ctrl.config.allowDelete">\n\t\t\t\t\t\t\t\t<a ng-click="$ctrl.removeItem($index)" class="btn btn-danger btn-sm visible-parent-hover"><i class="fa fa-trash-o"></i></a>\n\t\t\t\t\t\t\t</td>\n\t\t\t\t\t\t</tr>\n\t\t\t\t\t</tbody>\n\t\t\t\t\t<tfoot class="hidden-print">\n\t\t\t\t\t\t<tr>\n\t\t\t\t\t\t\t<td ng-if="$ctrl.config.numbered == undefined || $ctrl.config.numbered" class="text-center" width="30px">\n\t\t\t\t\t\t\t\t<button type="submit" class="btn btn-ellipsis" ng-class="$ctrl.listNewItem.text ? \'btn-success\' : \'btn-disabled\'">\n\t\t\t\t\t\t\t\t\t<i class="fa fa-plus"></i>\n\t\t\t\t\t\t\t\t</button>\n\t\t\t\t\t\t\t</td>\n\t\t\t\t\t\t\t<td>\n\t\t\t\t\t\t\t\t<input ng-model="$ctrl.listNewItem.text" type="text" class="form-control"/>\n\t\t\t\t\t\t\t</td>\n\t\t\t\t\t\t\t<td width="35px">&nbsp;</td>\n\t\t\t\t\t\t</tr>\n\t\t\t\t\t</tfoot>\n\t\t\t\t</table>\n\t\t\t</form>\n\t\t'
});

/**
* MacGyver text input
* @param {Object} config The config specification
* @param {boolean} [config.required=false] Whether this field is required
* @param {string} [config.placeholder] Placeholder text to display when the widget is empty
* @param {Date} [config.min] The minimum allowable value
* @param {Date} [config.max] The maximum allowable value
* @param {number} [config.step] The number to increment / decrement by
* @param {boolean} [config.slider=false] Display the widget as a slider rather than free-text input (requires min/max to work properly)
* @param {*} data The state data
*/
angular.module('macgyver').config(['$macgyverProvider', function ($macgyverProvider) {
	return $macgyverProvider.register('mgNumber', {
		title: 'Number',
		icon: 'fa fa-sort-numeric-asc',
		category: 'Simple Inputs',
		config: {
			min: { type: 'mgNumber', title: 'Minimum value' },
			max: { type: 'mgNumber', title: 'Maximum value' },
			step: { type: 'mgNumber', title: 'Value to increment / decrement by' },
			slider: { type: 'mgToggle', title: 'Display slider', default: false, help: 'Whether to display a fixed slider rather than a free form text input box' },
			placeholder: { type: 'mgNumber', help: 'Ghost text to display when there is no value' },
			required: { type: 'mgToggle', default: false }
		}
	});
}]).component('mgNumber', {
	bindings: {
		config: '<',
		data: '='
	},
	controller: ['$macgyver', '$scope', function controller($macgyver, $scope) {
		var $ctrl = this;
		$macgyver.inject($scope, $ctrl);

		$ctrl.validate = function () {
			return [$ctrl.config.required && !$ctrl.data && $ctrl.config.title + ' is required', $ctrl.config.min && $ctrl.data < $ctrl.config.min && $ctrl.config.title + ' is too small (minimum value is ' + $ctrl.config.min + ')', $ctrl.config.max && $ctrl.data > $ctrl.config.max && $ctrl.config.title + ' is too large (maximum value is ' + $ctrl.config.max + ')'];
		};

		$ctrl.add = function (steps) {
			return $ctrl.data += steps * ($ctrl.step || 1);
		};

		// Adopt default  if no data value is given {{{
		$scope.$watch('$ctrl.data', function () {
			if (_.isUndefined($ctrl.data) && _.has($ctrl, 'config.default')) $ctrl.data = $ctrl.config.default;
		});
		// }}}
	}],
	template: '\n\t\t\t<div ng-if="$ctrl.config.slider">\n\t\t\t\t<input ng-model="$ctrl.data" type="range" class="form-control" placeholder="{{$ctrl.config.placeholder}}" min="{{$ctrl.config.min}}" max="{{$ctrl.config.max}}" step="{{$ctrl.config.step}}"/>\n\t\t\t</div>\n\t\t\t<div ng-if="!$ctrl.config.slider" class="input-group">\n\t\t\t\t<a ng-click="$ctrl.add(-1)" class="btn btn-default input-group-addon hidden-print"><i class="fa fa-arrow-down"></i></a>\n\t\t\t\t<input ng-model="$ctrl.data" type="number" class="form-control" placeholder="{{$ctrl.config.placeholder}}" min="{{$ctrl.config.min}}" max="{{$ctrl.config.max}}" step="{{$ctrl.config.step}}"/>\n\t\t\t\t<a ng-click="$ctrl.add(1)" class="btn btn-default input-group-addon hidden-print"><i class="fa fa-arrow-up"></i></a>\n\t\t\t</div>\n\t\t'
});

/**
* MacGyver horizontal seperator
* @param {Object} config The config specification
* @param {*} data The state data
*/
angular.module('macgyver').config(['$macgyverProvider', function ($macgyverProvider) {
	return $macgyverProvider.register('mgSeperator', {
		title: 'Seperator',
		icon: 'fa fa-minus',
		category: 'General Decoration'
	});
}]).component('mgSeperator', {
	bindings: {
		config: '<',
		data: '='
	},
	controller: ['$macgyver', '$scope', function controller($macgyver, $scope) {
		var $ctrl = this;
		$macgyver.inject($scope, $ctrl);
	}],
	template: '\n\t\t\t<hr/>\n\t\t'
});

/**
* MacGyver Signature directive
* @require angular-ui-scribble
* @param {Object} config The config specification
* @param {*} data The state data
*/
angular.module('macgyver').config(['$macgyverProvider', function ($macgyverProvider) {
	return $macgyverProvider.register('mgSignature', {
		title: 'Signature input',
		icon: 'fa fa-picture-o',
		category: 'Files and uploads',
		config: {
			allowDelete: { type: 'mgToggle', default: true, help: 'Allow the user to delete the signature and re-sign' }
		}
	});
}]).component('mgSignature', {
	bindings: {
		config: '<',
		data: '='
	},
	controller: ['$http', '$macgyver', '$scope', function controller($http, $macgyver, $scope) {
		var $ctrl = this;
		$macgyver.inject($scope, $ctrl);

		// URL storage {{{
		$ctrl.urls = {}; // These all get their defaults in $onInit

		$ctrl.getUrl = function (type, context) {
			if (_.isString($ctrl.urls[type])) {
				return $ctrl.urls[type]; // Already a string - just return
			} else if (_.isFunction($ctrl.urls[type])) {
				// Resolve it using a context
				return $ctrl.urls[type](Object.assign({}, {
					type: type,
					widget: 'mgSignature',
					path: $macgyver.getPath($scope)
				}, context));
			} else {
				throw new Error('Unknown URL type: ' + type);
			}
		};
		// }}}

		// Init {{{
		$ctrl.$onInit = function () {
			$ctrl.urls.query = $ctrl.config.urlQuery || $macgyver.settings.urlResolver || '/api/widgets';
			$ctrl.urls.upload = $ctrl.config.urlUpload || $macgyver.settings.urlResolver || function (o) {
				return '/api/widgets/' + o.path;
			};
			$ctrl.urls.delete = $ctrl.config.urlDelete || $macgyver.settings.urlResolver || function (o) {
				return '/api/widgets/' + o.path;
			};

			$ctrl.refresh();
		};
		// }}}

		// Fetch data from server {{{
		$ctrl.files;
		$ctrl.refresh = function () {
			return $http.get($ctrl.getUrl('query')).then(function (data) {
				return $ctrl.files = data.data;
			});
		};
		// }}}

		// Deal with uploads {{{
		$ctrl.isUploading = false;
		$ctrl.getSignature = function (dataURI, blob) {
			var sigBlob = new Blob([blob], { type: 'image/png' });
			var formData = new FormData();
			formData.append('file', sigBlob);

			$http.post($ctrl.getUrl('upload', { file: 'signature.png' }), formData, {
				headers: { 'Content-Type': undefined }, // Need to override the headers so that angular changes them over into multipart/mime
				transformRequest: angular.identity
			}).then(function () {
				$ctrl.isUploading = false;
				$ctrl.refresh();
			});

			$ctrl.isUploading = true;
		};
		// }}}

		// Deletion {{{
		$ctrl.delete = function (file) {
			return $http.delete($ctrl.getUrl('delete', { file: 'signature.png' })).then($ctrl.refresh, $ctrl.refresh);
		}; // Whatever happens - refresh
		// }}}
	}],
	template: '\n\t\t\t<div ng-if="$ctrl.files && $ctrl.files.length" class="visible-parent-hover-target">\n\t\t\t\t<img ng-src="{{$ctrl.files[0].url}}" class="img-responsive"/>\n\t\t\t\t<a ng-click="$ctrl.delete()" class="btn btn-danger btn-circle btn-lg btn-fab visible-parent-hover" tooltip="Delete the signature" tooltip-tether="true"><i class="fa fa-fw fa-trash"></i></a>\n\t\t\t</div>\n\t\t\t<div ng-if="!$ctrl.files || !$ctrl.files.length">\n\t\t\t\t<div ng-if="$ctrl.isUploading" class="alert alert-info font-lg">\n\t\t\t\t\t<i class="fa fa-spinner fa-spin"></i>\n\t\t\t\t\tUploading signature...\n\t\t\t\t</div>\n\t\t\t\t<div ng-if="!$ctrl.isUploading">\n\t\t\t\t\t<ui-scribble editable="false" callback="$ctrl.getSignature(dataURI, blob)"></ui-scribble>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t'
});

/**
* MacGyver table
* This component displays a nested tree of sub-items across rows and columns
* @param {Object} config The config specification
* @param {array} config.items An collection of definitions for each column
* @param {string} config.items[].id The unique ID of each column - this conforms to the data field
* @param {string} config.items[].title The title of the column to display
* @param {number} [config.items[].width] The width (as a CSS measurement) of the column (e.g. '30px', '10%')
* @param {string} [config.items[].class] Class to apply to each <td> wrapping element
* @param {boolean} [config.allowAdd=true] Whether the form filler is allowed to add rows
* @param {boolean} [config.allowDelete=true] Whether the form filler is allowed to remove existing rows
* @param {boolean} [config.rowNumbers=true] Whether to show row numbers as the first column
* @param {array} [config.data] The default data to display in the table
* @param {*} data The state data
*/
angular.module('macgyver').config(['$macgyverProvider', function ($macgyverProvider) {
	return $macgyverProvider.register('mgTable', {
		title: 'Table layout',
		icon: 'fa fa-table',
		category: 'Layout',
		isContainer: true,
		isContainerArray: true,
		config: {
			allowAdd: { type: 'mgToggle', title: 'Allow Row Addition', default: true },
			allowDelete: { type: 'mgToggle', title: 'Allow Row Deletion', default: true },
			textEmpty: { type: 'mgText', title: 'No data message', default: 'No data' },
			items: {
				type: 'mgTableEditor',
				default: [{ id: 'col1', type: 'mgText' }, { id: 'col2', title: 'mgText' }, { id: 'col3', title: 'mgText' }]
			}
		},
		configChildren: {
			showTitle: { type: 'mgToggle', default: false, title: 'Show Title' }
		}
	});
}]).component('mgTable', {
	bindings: {
		config: '<',
		data: '='
	},
	controller: ['$element', '$macgyver', '$scope', function controller($element, $macgyver, $scope) {
		var $ctrl = this;
		$macgyver.inject($scope, $ctrl);
		$ctrl.isEditing = !!$element.closest('mg-form-editor').length;

		// Adopt default data (if provided) / fake data (when editing) {{{
		$scope.$watchGroup(['$ctrl.isEditing', '$ctrl.config.items', '$ctrl.config.default'], function () {
			if (!$ctrl.isEmpty()) return; // Already has data

			if (!_.isEmpty($ctrl.config.default)) {
				// Adopt defaults?
				$ctrl.data = $ctrl.config.default;
				if ($ctrl.isEditing) $ctrl.fakeData = $ctrl.data; // If we're editing also set the fake data to the same static data
			} else if ($ctrl.isEditing) {
				// When we're editing compose some fake data for the table when we have the column config
				$ctrl.fakeData = [// Make a single row of all defaults
				_($ctrl.config.items).mapKeys('id').mapValues(function (col) {
					return col.default;
				}).value()];
			}
		});
		// }}}

		// Ensure .data is always an array {{{
		$scope.$watch('$ctrl.data', function () {
			if (!_.isArray($ctrl.data)) $ctrl.data = [];
		});
		// }}}

		// Row addition {{{
		// .allowAdd {{{
		$ctrl.allowAdd = false;
		$scope.$watch('$ctrl.config.allowAdd', function () {
			$ctrl.allowAdd = $ctrl.config.allowAdd === undefined ? true : $ctrl.config.allowAdd;
		});
		// }}}

		$ctrl.isAdding = false; // Whether the user is actively entering information into $ctrl.newRow (set when $ctrl.newRow is non empty)
		$ctrl.newRow = {};
		$scope.$watch('$ctrl.newRow', function () {
			$ctrl.isAdding = !_.isEmpty($ctrl.newRow);
		}, true);

		$ctrl.createRow = function () {
			$ctrl.data.push($ctrl.newRow);
			$ctrl.newRow = {};
			$element.find('.mgTable-append > td input').first().focus(); // Reselect first input element found in new row
		};

		$element.on('keypress', function (e) {
			return $scope.$apply(function () {
				if (e.which == 13) {
					// User pressed enter - accept this as a call to $ctrl.createRow and cancel the event
					e.stopPropagation();
					e.preventDefault();
					$ctrl.createRow();
				}
			});
		});
		// }}}

		// Row deletion {{{
		// .allowDelete {{{
		$ctrl.allowDelete = false;
		$scope.$watch('$ctrl.config.allowDelete', function () {
			$ctrl.allowDelete = $ctrl.config.allowDelete === undefined ? true : $ctrl.config.allowDelete;
		});
		// }}}

		$ctrl.deleteRow = function (index) {
			return $ctrl.data.splice(index, 1);
		};
		// }}}

		// Utility function: isEmpty {{{
		/**
  * Return if the table is empty
  * Since the table will ALWAYS have a data object and that will (via Angular) default to having empty key values we need to do extra checks to see if the table is really empty
  * @returns {boolean} True if the table appears to be empty
  */
		$ctrl.isEmpty = function () {
			return _.isEmpty($ctrl.data) || $ctrl.data.length == 1 && _.every($ctrl.data[0], function (v) {
				return !v;
			}) // All values are falsy
			;
		};
		// }}}
	}],
	template: '\n\t\t\t<table class="table table-bordered table-hover">\n\t\t\t\t<thead>\n\t\t\t\t\t<tr>\n\t\t\t\t\t\t<th ng-if="$ctrl.config.rowNumbers === undefined || $ctrl.config.rowNumbers" width="30px" class="text-center font-md">#</th>\n\t\t\t\t\t\t<th ng-repeat="col in $ctrl.config.items track by col.id" style="{{(col.width ? \'width: \' + col.width + \'; \' : \'\') + col.class}}">\n\t\t\t\t\t\t\t{{col.title}}\n\t\t\t\t\t\t</th>\n\t\t\t\t\t</tr>\n\t\t\t\t</thead>\n\t\t\t\t<tbody ng-if="$ctrl.isEditing">\n\t\t\t\t\t<tr ng-repeat="row in $ctrl.fakeData">\n\t\t\t\t\t\t<td ng-if="$ctrl.config.rowNumbers === undefined || $ctrl.config.rowNumbers" class="text-center font-md">{{$index + 1 | number}}</td>\n\t\t\t\t\t\t<td ng-repeat="col in $ctrl.config.items track by col.id" class="{{col.class}}">\n\t\t\t\t\t\t\t<mg-container config="{items: [col]}" data="row"></mg-container>\n\t\t\t\t\t\t</td>\n\t\t\t\t\t</tr>\n\t\t\t\t</tbody>\n\t\t\t\t<tbody ng-if="!$ctrl.isEditing" class="hidden-print">\n\t\t\t\t\t<tr ng-if="!$ctrl.data">\n\t\t\t\t\t\t<td colspan="{{$ctrl.config.items.length + ($ctrl.config.rowNumbers === undefined || $ctrl.config.rowNumbers ? 1 : 0}}">\n\t\t\t\t\t\t\t<div class="alert alert-warning m-10">{{$ctrl.config.textEmpty || \'No data\'}}</div>\n\t\t\t\t\t\t</td>\n\t\t\t\t\t</tr>\n\t\t\t\t\t<tr ng-repeat="row in $ctrl.data">\n\t\t\t\t\t\t<td ng-if="$ctrl.config.rowNumbers === undefined || $ctrl.config.rowNumbers" class="text-center">\n\t\t\t\t\t\t\t<div class="btn-group btn-block">\n\t\t\t\t\t\t\t\t<a class="btn btn-block btn-ellipsis btn-ellipsis-sm dropdown-toggle" data-toggle="dropdown">{{$index + 1 | number}}</a>\n\t\t\t\t\t\t\t\t<ul class="dropdown-menu">\n\t\t\t\t\t\t\t\t\t<li ng-if="$ctrl.allowDelete"><a ng-click="$ctrl.deleteRow($index)"><i class="fa fa-trash-o"></i> Delete</a></li>\n\t\t\t\t\t\t\t\t</ul>\n\t\t\t\t\t\t\t</div>\n\t\t\t\t\t\t</td>\n\t\t\t\t\t\t<td ng-repeat="col in $ctrl.config.items track by col.id" class="{{col.class}}">\n\t\t\t\t\t\t\t<mg-container config="{items: [col]}" data="row"></mg-container>\n\t\t\t\t\t\t</td>\n\t\t\t\t\t</tr>\n\t\t\t\t\t<tr class="mgTable-append" ng-if="$ctrl.allowAdd">\n\t\t\t\t\t\t<td class="text-center">\n\t\t\t\t\t\t\t<button ng-click="$ctrl.createRow()" type="button" class="btn btn-block" ng-class="$ctrl.isAdding ? \'btn-success\' : \'btn-disabled\'">\n\t\t\t\t\t\t\t\t<i class="fa fa-plus"></i>\n\t\t\t\t\t\t\t</button>\n\t\t\t\t\t\t</td>\n\t\t\t\t\t\t<td ng-repeat="col in $ctrl.config.items track by col.id">\n\t\t\t\t\t\t\t<mg-container config="{items: [col]}" data="$ctrl.newRow"></mg-container>\n\t\t\t\t\t\t</td>\n\t\t\t\t\t</tr>\n\t\t\t\t</tbody>\n\t\t\t</table>\n\t\t'
});

/**
* MacGyver table editor meta control
* This control provides very basic functionality to edit the properties of a mgTable by allowing each column to have width, type, title etc.
* For more complex functionality (e.g. table columns that are nested containers) its probably best to use a JSON editor
* @param {Object} config The config specification
* @param {*} data The state data
*/
angular.module('macgyver').config(['$macgyverProvider', function ($macgyverProvider) {
	return $macgyverProvider.register('mgTableEditor', {
		title: 'Table Editor',
		icon: 'fa fa-pencil-square-o',
		config: {},
		userPlaceable: false
	});
}]).component('mgTableEditor', {
	bindings: {
		config: '<',
		data: '='
	},
	controller: ['$macgyver', '$scope', function controller($macgyver, $scope) {
		var $ctrl = this;
		$macgyver.inject($scope, $ctrl);

		// Adopt default  if no data value is given {{{
		$scope.$watch('$ctrl.data', function () {
			if (_.isUndefined($ctrl.data) && _.has($ctrl, 'config.default')) $ctrl.data = $ctrl.config.default;
		});
		// }}}
	}],
	template: '\n\t\t\t<table class="table table-bordered table-striped">\n\t\t\t</table>\n\t\t'
});

/**
* MacGyver text input
* @param {Object} config The config specification
* @param {boolean} [config.required=false] Whether this field is required
* @param {string} [config.placeholder] Placeholder text to display when the widget is empty
* @param {Date} [config.lengthMin] The minimum allowable length
* @param {Date} [config.lengthMax] The maximum allowable length
* @param {*} data The state data
*/
angular.module('macgyver').config(['$macgyverProvider', function ($macgyverProvider) {
	return $macgyverProvider.register('mgText', {
		title: 'Textbox',
		icon: 'fa fa-pencil-square-o',
		category: 'Simple Inputs',
		config: {
			lengthMin: { type: 'mgNumber', title: 'Minimum Length' },
			lengthMax: { type: 'mgNumber', title: 'Maximum Length' },
			placeholder: { type: 'mgText', help: 'Ghost text to display when the textbox has no value' },
			required: { type: 'mgToggle', default: false }
		}
	});
}]).component('mgText', {
	bindings: {
		config: '<',
		data: '='
	},
	controller: ['$macgyver', '$scope', function controller($macgyver, $scope) {
		var $ctrl = this;
		$macgyver.inject($scope, $ctrl);

		$ctrl.validate = function () {
			return [$ctrl.config.required && !$ctrl.data && $ctrl.config.title + ' is required', $ctrl.config.lengthMin && _.isString($ctrl.data) && $ctrl.data.length < $ctrl.config.lengthMin && $ctrl.config.title + ' is too small (minimum length is ' + $ctrl.config.lengthMin + ')', $ctrl.config.lengthMax && _.isString($ctrl.data) && $ctrl.data.length > $ctrl.config.lengthMax && $ctrl.config.title + ' is too long (maximum length is ' + $ctrl.config.lengthMax + ')'];
		};

		// Adopt default  if no data value is given {{{
		$scope.$watch('$ctrl.data', function () {
			if (_.isUndefined($ctrl.data) && _.has($ctrl, 'config.default')) $ctrl.data = $ctrl.config.default;
		});
		// }}}
	}],
	template: '\n\t\t\t<input ng-model="$ctrl.data" type="text" class="form-control" placeholder="{{$ctrl.config.placeholder}}"/>\n\t\t'
});

/**
* MacGyver free text input
* @param {Object} config The config specification
* @param {boolean} [config.required=false] Whether this field is required
* @param {string} [config.placeholder] Placeholder text to display when the widget is empty
* @param {Date} [config.lengthMin] The minimum allowable length
* @param {Date} [config.lengthMax] The maximum allowable length
* @param {number} [config.rows=3] How many row's in height to draw the widget
* @param {*} data The state data
*/
angular.module('macgyver').config(['$macgyverProvider', function ($macgyverProvider) {
	return $macgyverProvider.register('mgTextArea', {
		title: 'Multi-line text',
		icon: 'fa fa-align-justify',
		category: 'Simple Inputs',
		config: {
			rows: { type: 'mgNumber', title: 'Line height', default: 3 },
			lengthMin: { type: 'mgNumber', title: 'Minimum Length' },
			lengthMax: { type: 'mgNumber', title: 'Maximum Length' },
			placeholder: { type: 'mgTextArea', help: 'Ghost text to display when the textbox has no value' },
			required: { type: 'mgToggle', default: false }
		}
	});
}]).component('mgTextArea', {
	bindings: {
		config: '<',
		data: '='
	},
	controller: ['$macgyver', '$scope', function controller($macgyver, $scope) {
		var $ctrl = this;
		$macgyver.inject($scope, $ctrl);

		$ctrl.validate = function () {
			return [$ctrl.config.required && !$ctrl.data && $ctrl.config.title + ' is required', $ctrl.config.lengthMin && _.isString($ctrl.data) && $ctrl.data.length < $ctrl.config.lengthMin && $ctrl.config.title + ' is too small (minimum length is ' + $ctrl.config.lengthMin + ')', $ctrl.config.lengthMax && _.isString($ctrl.data) && $ctrl.data.length > $ctrl.config.lengthMax && $ctrl.config.title + ' is too long (maximum length is ' + $ctrl.config.lengthMax + ')'];
		};

		// Adopt default  if no data value is given {{{
		$scope.$watch('$ctrl.data', function () {
			if (_.isUndefined($ctrl.data) && _.has($ctrl, 'config.default')) $ctrl.data = $ctrl.config.default;
		});
		// }}}
	}],
	template: '\n\t\t\t<textarea ng-model="$ctrl.data" class="form-control" placeholder="{{$ctrl.config.placeholder}}" minlength="{{$ctrl.config.lengthMin}}" maxlength="{{$ctrl.config.lengthMin}}" rows="{{$ctrl.config.rows || 3}}"/>\n\t\t'
});

/**
* MacGyver time input
* @param {Object} config The config specification
* @param {boolean} [config.required=false] Whether this field is required
* @param {Date} [config.lengthMin] The minimum allowable time
* @param {Date} [config.lengthMax] The maximum allowable time
* @param {*} data The state data
*/
angular.module('macgyver').config(['$macgyverProvider', function ($macgyverProvider) {
	return $macgyverProvider.register('mgTime', {
		title: 'Time selection',
		icon: 'fa fa-clock-o',
		category: 'Simple Inputs',
		config: {
			min: { type: 'mgTime', title: 'Earliest time' },
			max: { type: 'mgNumber', title: 'Latest time' },
			required: { type: 'mgToggle', default: false }
		}
	});
}]).component('mgTime', {
	bindings: {
		config: '<',
		data: '='
	},
	controller: ['$macgyver', '$scope', function controller($macgyver, $scope) {
		var $ctrl = this;
		$macgyver.inject($scope, $ctrl);

		$ctrl.validate = function () {
			return [$ctrl.config.required && !$ctrl.data && $ctrl.config.title + ' is required', $ctrl.config.min && _.isString($ctrl.data) && $ctrl.data < $ctrl.config.min && $ctrl.config.title + ' is too early (earliest time is ' + $ctrl.config.min + ')', $ctrl.config.max && _.isString($ctrl.data) && $ctrl.data > $ctrl.config.max && $ctrl.config.title + ' is too late (latest time is ' + $ctrl.config.max + ')'];
		};

		// Adopt default  if no data value is given {{{
		$scope.$watch('$ctrl.data', function () {
			if (_.isUndefined($ctrl.data) && _.has($ctrl, 'config.default')) $ctrl.data = $ctrl.config.default;
		});
		// }}}
	}],
	template: '\n\t\t\t<input ng-model="$ctrl.data" type="time" class="form-control"/>\n\t\t'
});

/**
* MacGyver toggle
* @param {Object} config The config specification
* @param {string} [config.onText='On'] The text to display when the widget has a true value
* @param {string} [config.offText='Off'] The text to display when the widget has a false value
* @param {boolean} data The state of the toggle
*/
angular.module('macgyver').config(['$macgyverProvider', function ($macgyverProvider) {
	return $macgyverProvider.register('mgToggle', {
		title: 'Switch',
		icon: 'fa fa-toggle-on',
		category: 'Simple Inputs',
		config: {
			onText: { type: 'mgText', default: 'On' },
			offText: { type: 'mgText', default: 'Off' }
		}
	});
}]).component('mgToggle', {
	bindings: {
		config: '<',
		data: '='
	},
	controller: ['$macgyver', '$scope', function controller($macgyver, $scope) {
		var $ctrl = this;
		$macgyver.inject($scope, $ctrl);

		// Adopt default if no data value is given {{{
		$scope.$watch('$ctrl.data', function () {
			if (_.isUndefined($ctrl.data) && _.has($ctrl, 'config.default')) $ctrl.data = $ctrl.config.default;
		});
		// }}}
	}],
	template: '\n\t\t\t<div class="btn-group">\n\t\t\t\t<a ng-click="$ctrl.data = !$ctrl.data" class="btn" ng-class="!$ctrl.data ? \'btn-danger\' : \'btn-default\'">{{$ctrl.config.offText || \'Off\'}}</a>\n\t\t\t\t<a ng-click="$ctrl.data = !$ctrl.data" class="btn" ng-class="$ctrl.data ? \'btn-success\' : \'btn-default\'">{{$ctrl.config.onText || \'On\'}}</a>\n\t\t\t</div>\n\t\t'
});

/**
* MacGyver text input
* @param {Object} config The config specification
* @param {boolean} [config.required=false] Whether this field is required
* @param {string} [config.placeholder] Placeholder text to display when the widget is empty
* @param {*} data The state data
*/
angular.module('macgyver').config(['$macgyverProvider', function ($macgyverProvider) {
	return $macgyverProvider.register('mgUrl', {
		title: 'URL',
		icon: 'fa fa-globe',
		category: 'Simple Inputs',
		config: {
			placeholder: { type: 'mgUrl', help: 'Ghost text to display when the textbox has no value' },
			required: { type: 'mgToggle', default: false }
		}
	});
}]).component('mgUrl', {
	bindings: {
		config: '<',
		data: '='
	},
	controller: ['$macgyver', '$scope', function controller($macgyver, $scope) {
		var $ctrl = this;
		$macgyver.inject($scope, $ctrl);

		$ctrl.validate = function () {
			return [$ctrl.config.required && !$ctrl.data && $ctrl.config.title + ' is required'];
		};

		// Adopt default  if no data value is given {{{
		$scope.$watch('$ctrl.data', function () {
			if (_.isUndefined($ctrl.data) && _.has($ctrl, 'config.default')) $ctrl.data = $ctrl.config.default;
		});
		// }}}
	}],
	template: '\n\t\t\t<input ng-model="$ctrl.data" type="url" class="form-control" placeholder="{{$ctrl.config.placeholder}}"/>\n\t\t'
});