/**
* MacGyver horizontal seperator
* @param {Object} config The config specification
* @param {*} data The state data
*/
angular
	.module('app')
	.config($macgyverProvider => $macgyverProvider.register('mgSeperator', {
		title: 'Seperator',
		icon: 'fa fa-minus',
		category: 'General Decoration',
	}))
	.component('mgSeperator', {
		bindings: {
			config: '<',
			data: '=',
		},
		controller: function($macgyver, $scope) {
			var $ctrl = this;
			$macgyver.inject($scope, $ctrl);
		},
		template: `
			<hr/>
		`,
	})
