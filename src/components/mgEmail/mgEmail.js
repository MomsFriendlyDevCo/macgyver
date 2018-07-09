/**
* MacGyver text input
* @param {Object} config The config specification
* @param {boolean} [config.required=false] Whether this field is required
* @param {string} [config.placeholder] Placeholder text when the textbox is empty
* @param {*} data The state data
*/
angular
	.module('macgyver')
	.config($macgyverProvider => $macgyverProvider.register('mgEmail', {
		title: 'Email address',
		icon: 'fa fa-envelope-o',
		category: 'Simple Inputs',
		config: {
			placeholder: {type: 'mgText', help: 'Ghost text to display when the text box has no value'},
			required: {type: 'mgToggle', default: false},
		},
		toString: true,
	}))
	.component('mgEmail', {
		bindings: {
			config: '<',
			data: '=',
		},
		controller: function($macgyver, $scope) {
			var $ctrl = this;
			$macgyver.inject($scope, $ctrl);

			$ctrl.validate = ()=> [
				$ctrl.config.required && !$ctrl.data && `${$ctrl.config.title} is required`,
			];

			// Adopt default  if no data value is given {{{
			$scope.$watch('$ctrl.data', ()=> { if (_.isUndefined($ctrl.data) && _.has($ctrl, 'config.default')) $ctrl.data = $ctrl.config.default });
			// }}}
		},
		template: `
			<input ng-model="$ctrl.data" type="email" class="form-control" placeholder="{{$ctrl.config.placeholder}}"/>
		`,
	})
