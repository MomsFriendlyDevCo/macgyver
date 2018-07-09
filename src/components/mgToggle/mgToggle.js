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
			offText: {type: 'mgText', default: 'Off'},
		},
		format: v => v ? '<i class="fa fa-check"></i>' : '<i class="fa fa-times"></i>',
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
		},
		template: `
			<div class="btn-group">
				<a ng-click="$ctrl.data = !$ctrl.data" class="btn" ng-class="!$ctrl.data ? 'btn-danger' : 'btn-default'">{{$ctrl.config.offText || 'Off'}}</a>
				<a ng-click="$ctrl.data = !$ctrl.data" class="btn" ng-class="$ctrl.data ? 'btn-success' : 'btn-default'">{{$ctrl.config.onText || 'On'}}</a>
			</div>
		`,
	})
