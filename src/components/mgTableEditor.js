/**
* MacGyver table editor meta control
* This control provides very basic functionality to edit the properties of a mgTable by allowing each column to have width, type, title etc.
* For more complex functionality (e.g. table columns that are nested containers) its probably best to use a JSON editor
* @param {Object} config The config specification
* @param {*} data The state data
*/
angular
	.module('app')
	.config($macgyverProvider => $macgyverProvider.register('mgTableEditor', {
		title: 'Table Editor',
		icon: 'fa fa-pencil-square-o',
		config: {},
		userPlaceable: false,
	}))
	.component('mgTableEditor', {
		bindings: {
			config: '<',
			data: '=',
		},
		controller: function($macgyver, $scope) {
			var $ctrl = this;
			$macgyver.inject($scope, $ctrl);

			// Adopt default  if no data value is given {{{
			$scope.$watch('$ctrl.data', ()=> { if (_.isUndefined($ctrl.data) && _.has($ctrl, 'config.default')) $ctrl.data = $ctrl.config.default });
			// }}}
		},
		template: `
			<table class="table table-bordered table-striped">
			</table>
		`,
	})
