/**
* MacGyver static label
* This is simple display of read-only text. The text content is loaded either from the data feed or the `config.text` property in that order
* @param {Object} config The config specification
* @param {string} [config.text] The text to display if the data feed does not provide it
* @param {*} data The state data
*/
angular
	.module('macgyver')
	.config($macgyverProvider => $macgyverProvider.register('mgLabel', {
		title: 'Read-only label',
		icon: 'fa fa-font',
		category: 'General Decoration',
		config: {
			text: {type: 'mgText'},
		},
	}))
	.component('mgLabel', {
		bindings: {
			config: '<',
			data: '=',
		},
		controller: function($macgyver, $scope) {
			var $ctrl = this;
			$macgyver.inject($scope, $ctrl);
		},
		template: `
			<div class="form-control-static">{{$ctrl.data || $ctrl.config.text}}</div>
		`,
	})
