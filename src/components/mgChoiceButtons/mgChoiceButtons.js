/**
* MacGyver selector of an item from a small list of enums
* @param {Object} config The config specification
* @param {array} config.enum A collection of items to choose from, each must be an object with at least an 'id'. If this is an array of strings it will be traslated into a collection automaitcally
* @param {string} [config.enum[].class] Optional class to display per item, if omitted the item ID is used
* @param {string} [config.enum[].classSelected] Optional class to display per item when selected
* @param {string} [config.enum[].title] Optional title to display within each element
* @param {string} [config.itemClassInactive='btn btn-default'] Default item class to use per item (unless an override is present in the item object)
* @param {string} [config.itemClassActive='btn btn-primary'] Item class to use when item is selected
* @param {string} [config.classWrapper='btn-group'] The class definition of the outer widget element
* @param {*} data The state data
*/
angular
	.module('macgyver')
	.config($macgyverProvider => $macgyverProvider.register('mgChoiceButtons', {
		title: 'Button multiple-choice',
		icon: 'fa fa-check-square',
		category: 'Choice Selectors',
		config: {
			enum: {
				type: 'mgList',
				title: 'The list of items to display',
				default: ['Foo', 'Bar', 'Baz'],
			},
			classWrapper: {type: 'mgText', default: 'btn-group', title: 'Group CSS class', advanced: true},
			itemClassActive: {type: 'mgText', default: 'btn btn-primary', advanced: true},
			itemClassInactive: {type: 'mgText', default: 'btn btn-default', advanced: true},
		},
		format: true, // FIXME: Not sure about this, what if we need to lookup the value by the enum ID?
	}))
	.component('mgChoiceButtons', {
		bindings: {
			config: '<',
			data: '=',
		},
		controller: function($macgyver, $scope) {
			var $ctrl = this;
			$macgyver.inject($scope, $ctrl);

			// Translate $ctrl.enum -> $ctrl.enumIter (convert arrays of strings for example) {{{
			$ctrl.enumIter = []; // Cleaned up version of enum
			$scope.$watchCollection('$ctrl.config.enum', ()=> {
				if (!$ctrl.config.enum) return; // No data yet
				if (_.isArray($ctrl.config.enum) && _.isString($ctrl.config.enum[0])) { // Array of strings
					$ctrl.enumIter = $ctrl.config.enum.map(i => ({
						id: _.camelCase(i),
						title: i,
					}));
				} else if (_.isArray($ctrl.config.enum) && _.isObject($ctrl.config.enum[0])) { // Collection
					$ctrl.enumIter = $ctrl.config.enum;
				}
			});
			// }}}
			// Adopt default if no data value is given {{{
			$scope.$watch('$ctrl.data', ()=> {
				if (_.isUndefined($ctrl.data) && _.has($ctrl, 'config.default')) $ctrl.data = $ctrl.config.default;
			});

			$ctrl.$onInit = ()=> $scope.assignConfig('itemClassInactive', 'itemClassActive');
			// }}}
		},
		template: `
			<div ng-class="$ctrl.config.classWrapper || 'btn-group'">
				<a ng-repeat="item in $ctrl.enumIter track by item.id" ng-class="
					$ctrl.data == item.id
					? item.classSelected || $ctrl.config.itemClassActive
					: item.class || $ctrl.config.itemClassInactive
				" ng-click="$ctrl.data = item.id">
					{{item.title}}
				</a>
			</div>
		`,
	})
