angular
	.module('macgyver', [
		'angular-bs-tooltip',
		'angular-ui-scribble',
		'dragularModule',
		'ngSanitize',
		'ngTreeTools',
		'ui.select',
	])
	.provider('$macgyver', function() {
		var $macgyver = this;
		$macgyver.widgets = {};

		// Settings {{{
		$macgyver.settings = {
			urlResolver: undefined, // Used by mgFile and other uploaders to determine its URL
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
		* @param {boolean|function} [properties.format=false] Whether the value of the widget can be exposed as a string. If this is === true the exact value is used, if === false (default) it will be ignored when making a digest of the form, if a function it will be called as (value) and expected to return a string value. NOTE: In the spec file, which is a flat JSON file any function argument will be overridden to `true`
		* @param {string} [properties.formatAlign='left'] The prefered column alignment when showing the result of `properties.format`
		*
		* @returns {$macgyver} This chainable object
		*/
		$macgyver.register = function(id, properties) {
			$macgyver.widgets[id] = properties || {};
			$macgyver.widgets[id].id = id;

			var domName = _.kebabCase(id);
			_.defaults($macgyver.widgets[id], {
				template: `<${domName} config="w" data="$ctrl.data[w.id]"></${domName}>`,
				title: _.startCase(id),
				userPlaceable: true,
				category: 'Misc',
				format: false,
				formatAlign: 'left',
			});

			return $macgyver;
		};


		/**
		* Generate an empty prototype tree from a form layout
		* @params {array} layout The root node to generate from
		* @params {boolean} [useDefaults] Whether to adopt control defaults when generating the tree
		* @returns {Object} an object representing a prototype data storage tree
		*/
		$macgyver.getDataTree = function(root, useDefaults) {
			if (!root) {
				console.warn('Empty MacGyver form tree');
			} else if (!$macgyver.widgets[root.type]) {
				console.warn('Unknown widget type "' + root.type + '" for item ID "' + root.id + '" - assuming is not a container');
				return (useDefaults ? root.default : null);
			} else if ($macgyver.widgets[root.type].isContainer && !$macgyver.widgets[root.type].isContainerArray) {
				return _(root.items)
					.mapKeys('id')
					.mapValues(i => $macgyver.getDataTree(i))
					.value();
			} else if ($macgyver.widgets[root.type].isContainer && $macgyver.widgets[root.type].isContainerArray) {
				return [
					_(root.items)
						.mapKeys('id')
						.mapValues(i => $macgyver.getDataTree(i))
						.value()
				];
			} else {
				return (useDefaults ? root.default : null);
			}
		};


		/**
		* Returns the first found form in the search direction
		* @param {Object} $scope The scope of the calling component
		* @param {string} [direction="downwards"] What direction to search for the form element in. ENUM: 'upwards', 'downwards'
		* @param {string} [want="$ctrl"] What aspect of the form is sought. ENUM: '$ctrl', '$scope'
		* @returns {Object} The first found form within a scope
		* @example
		* // In a controller / component
		* $macgyver.getForm($scope);
		* // => The scope instance of the form (i.e. the inside of the mg-form component)
		*/
		$macgyver.getForm = function($scope, direction = 'downwards', want = '$ctrl') {
			// Make an empty object, broadcast and expect the first reciever to populate the `form` key which we can then use to reference the form
			var form = {};

			if (direction == 'downwards') {
				$scope.$broadcast('mg.getForm', form);
			} else if (direction == 'upwards') {
				$scope.$emit('mg.getForm', form);
			} else {
				throw new Error('Unknown form search direction: ' + direction);
			}

			return form[want]
		};


		/**
		* Returns an object where each key is the ID of the MacGyver component with the value being the component controller
		* @param {Object} $scope The scope of the calling component
		* @returns {Object} An object where each key is the component path and the value is the widget
		* // In a controller / component
		* $macgyver.getAll($scope);
		* // => {foo: <fooController>, bar: <barController>, ...}
		*/
		$macgyver.getAll = function($scope) {
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
		$macgyver.getPath = function($scope) {
			var overridePath = _.get($scope, ['$ctrl', 'config', 'mgPath'])

			if (overridePath && _.isArray(overridePath)) {
				return overridePath;
			} else if (_.isString(overridePath)) {
				return overridePath.split('.');
			} else { // Determine from parent segments
				var stack = [];
				$scope.$emit('mg.getStack', stack);
				return stack
					.map(i => i.id) // Return only the ID segment
					.filter(i => !! i); // Remove empty items
			}
		};


		/**
		* Inject various life-cycle hooks into a component that doesnt want to have to manage them itself
		* This really just takes care of the unit responding to the 'mg.get' event at present
		* @returns {$macgyver} This chainable object
		* @example
		* // In a controller / component
		* $macgyver.inject($scope, $ctrl);
		*/
		$macgyver.inject = function($scope, $ctrl) {
			$scope.$on('mg.get', (e, c) => {
				if (!$ctrl.config) return;
				c[$ctrl.config.id] = $ctrl;
			});
			$scope.$on('mg.getStack', function(e, c) {
				c.push({
					id: $ctrl.config.id,
					$ctrl: $ctrl,
					$scope: $scope,
				});
				return c;
			});


			/**
			* Function to force the adoption of default config values within a controller
			* @param {string} [keys...] The keys to adopt the values of, if no specific keys are set all config keys will be used
			* @example Set the config value 'foo' to whatever that config structure has as a default
			* $ctrl.$onInit = $scope.assignDefaults('foo')
			*/
			$scope.assignConfig = (...keys) => {
				if (!$ctrl.config.type) throw new Error('Cannot determine type of widget to assign defaults, check that assignDefaults is being called within $onInit');
				if (!keys.length) keys = _.keys($macgyver.widgets[$ctrl.config.type].config);

				keys.forEach(key => {
					if (!angular.isUndefined($ctrl.config[key])) return; // Already assigned a value
					var widget = $macgyver.widgets[$ctrl.config.type];
					if (!widget) throw new Error(`Unable to assign default "${key}" as no default exists in "${$ctrl.config.type}" config`);
					if (!_.has(widget.config[key], 'default')) throw new Error(`The config key "${key}" for widget "${$ctrl.config.type}" does not have a default value - remove the call to assignDefaults`);
					console.log('ASSIGN', key, widget.config[key].default);
					$ctrl.config[key] = widget.config[key].default;
				});
			};

			return $macgyver;
		};


		/**
		* Broadcast a message to all MacGyver components under the first form found as the parent of the given scope
		* Messages should always begin with the 'mg.' prefix
		* @param {Object} $scope The scope of the widget to search from
		* @param {*} message,... The message to broadcast
		* @returns {*} The return value of the broadcast event
		*/
		$macgyver.broadcast = function($scope, ...message) {
			var mgForm = $macgyver.getForm($scope, 'upwards', '$scope');
			return mgForm ? mgForm.$broadcast(...message) : undefined;
		};

		// @include ./shared.js

		/**
		* Angular nonsense function to get this instance
		*/
		$macgyver.$get = function() {
			return $macgyver;
		};
	})

	/**
	* Helper filter to return a human readable filesize
	* @param {string|number} filesize The filesize to format
	* @return {string} A human readable filesize (e.g. '45kb')
	* @example
	* $ctrl.someNumber | filesize
	*/
	.filter('filesize', ()=> filesize)

	/**
	* Helper filter for MacGyver which takes an object and runs a filter on it
	* @param {Object} obj The object to filter
	* @param {Object|function} filter Either a matching object expression to filter by or a function which is called as `(value, key)`
	* @return {Object} The input object filtered by the supplied filter
	* @example
	* $ctrl.$macgyver.widgets | mgFilterObject:{userPlaceable: true}
	*/
	.filter('mgFilterObject', ()=> (obj, filter) => {
		if (angular.isObject(filter)) {
			return _.pickBy(obj, i => _.isMatch(i, filter))
		} else if (angular.isFunction(filter)) {
			return _.pickBy(obj, filter);
		}
	})
