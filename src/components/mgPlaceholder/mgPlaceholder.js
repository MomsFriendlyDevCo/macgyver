/**
* MacGyver placeholder
* @param {Object} config The config specification
* @param {string} [config.text] The text to display in the alert if data is falsy
* @param {string} [config.style='alert-info'] The style of alert box to display. Enum of 'info', 'success', 'warning', 'danger'
* @param {*} data The state data
*/
angular
	.module('macgyver')
	.config($macgyverProvider => $macgyverProvider.register('mgPlaceholder', {
		title: 'Placeholder',
		icon: 'fa fa-arrows-alt',
		category: 'General Decoration',
		config: {
			text: {type: 'mgText', default: ''},
			height: {type: 'mgNumber'},
			style: {
				type: 'mgChoiceButtons',
				default: 'placeholder-lines',
				iconSelected: 'fa fa-fw fa-check',
				iconDefault: 'fa fa-fw',
				enum: [
					{id: 'placeholder-lines', title: 'Lined box'},
					{id: 'placeholder-construction', title: 'Construction area'},
				],
			},
		},
	}))
	.component('mgPlaceholder', {
		bindings: {
			config: '<',
		},
		controller: function($macgyver, $scope) {
			var $ctrl = this;
			$macgyver.inject($scope, $ctrl);
		},
		template: `
			<div ng-class="$ctrl.config.style || 'placeholder-box'" style="height: {{$ctrl.config.height || 'auto'}}">
				<div ng-if="$ctrl.config.text" class="placeholder-text" ng-bind="$ctrl.config.text"></div>
			</div>
		`,
	})
