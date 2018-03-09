/**
* MacGyver component layout for grid rows
* This is really just a virtual wrapper around content and doesnt serve any purpose except to identify what is a grid row in the hierarchy
* This container displays an array (rows) or arrays (columns) of widgets (items)
* @param {Object} config The config specification
* @param {*} data The state data
*/
angular
	.module('macgyver')
	.config($macgyverProvider => $macgyverProvider.register('mgGridRow', {
		title: 'Grid row layout',
		icon: 'fa fa-dropbox',
		category: 'Layout',
		isContainer: true,
		userPlaceable: false,
		config: {},
	}))
	.component('mgGridRow', {
		bindings: {
			config: '<',
			data: '=',
		},
		controller: function($macgyver, $scope) {
			var $ctrl = this;
			$macgyver.inject($scope, $ctrl);
		},
	})
