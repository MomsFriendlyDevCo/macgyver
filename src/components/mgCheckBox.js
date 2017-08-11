/**
* MacGyver toggle
* @param {Object} config The config specification
* @param {*} data The state data
*/
angular
	.module('macgyver')
	.config($macgyverProvider => $macgyverProvider.register('mgCheckBox', {
		title: 'Check Box',
		icon: 'fa fa-check-square-o',
		category: 'Simple Inputs',
		config: {
		},
	}))
	.component('mgCheckBox', {
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
		template:
		`<div class="text-center">
			<input ng-model="$ctrl.data" type="checkbox"/>
		</div>`,
	})
