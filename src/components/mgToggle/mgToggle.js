/**
* MacGyver toggle
* @param {Object} config The config specification
* @param {string} [config.onText='On'] The text to display when the widget has a true value
* @param {string} [config.offText='Off'] The text to display when the widget has a false value
* @param {boolean} data The state of the toggle
*/
angular
	.module('macgyver')
	.config($macgyverProvider => $macgyverProvider.register('mgToggle', {
		title: 'Switch',
		icon: 'fa fa-toggle-on',
		category: 'Simple Inputs',
		config: {
			onText: {type: 'mgText', default: 'On'},
			onClassActive: {type: 'mgText', default: 'btn-success', advanced: true},
			onClassInactive: {type: 'mgText', default: 'btn-default', advanced: true},
			offText: {type: 'mgText', default: 'Off'},
			offClassActive: {type: 'mgText', default: 'btn-danger', advanced: true},
			offClassInactive: {type: 'mgText', default: 'btn-default', advanced: true},
		},
		format: (v, config) => v
			? config && config.onText ? config.onText : 'On'
			: config && config.offText ? config.offText : 'Off',
		formatAlign: 'center',
	}))
	.component('mgToggle', {
		bindings: {
			config: '<',
			data: '=',
		},
		controller: function($macgyver, $scope) {
			var $ctrl = this;
			$macgyver.inject($scope, $ctrl);

			// Adopt default if no data value is given {{{
			$scope.$watch('$ctrl.data', ()=> { if (_.isUndefined($ctrl.data) && _.has($ctrl, 'config.default')) $ctrl.data = $ctrl.config.default });
			// }}}

			$ctrl.$onInit = ()=> $scope.assignConfig();
		},
		template: `
			<div class="btn-group">
				<a ng-click="$ctrl.data = !$ctrl.data" class="btn" ng-class="!$ctrl.data ? $ctrl.config.offClassActive : $ctrl.config.offClassInactive">{{$ctrl.config.offText}}</a>
				<a ng-click="$ctrl.data = !$ctrl.data" class="btn" ng-class="$ctrl.data ? $ctrl.config.onClassActive : $ctrl.config.onClassInactive">{{$ctrl.config.onText}}</a>
			</div>
		`,
	})
