/**
* MacGyver text input
* @param {Object} config The config specification
* @param {boolean} [config.required=false] Whether this field is required
* @param {string} [config.placeholder] Placeholder text to display when the widget is empty
* @param {Date} [config.min] The minimum allowable value
* @param {Date} [config.max] The maximum allowable value
* @param {number} [config.step] The number to increment / decrement by
* @param {boolean} [config.slider=false] Display the widget as a slider rather than free-text input (requires min/max to work properly)
* @param {*} data The state data
*/
angular
	.module('app')
	.config($macgyverProvider => $macgyverProvider.register('mgNumber', {
		title: 'Number',
		icon: 'fa fa-sort-numeric-asc',
		category: 'Simple Inputs',
		config: {
			min: {type: 'mgNumber', title: 'Minimum value'},
			max: {type: 'mgNumber', title: 'Maximum value'},
			step: {type: 'mgNumber', title: 'Value to increment / decrement by'},
			slider: {type: 'mgToggle', title: 'Display slider', default: false, help: 'Whether to display a fixed slider rather than a free form text input box'},
			placeholder: {type: 'mgNumber', help: 'Ghost text to display when there is no value'},
			required: {type: 'mgToggle', default: false},
		},
	}))
	.component('mgNumber', {
		bindings: {
			config: '<',
			data: '=',
		},
		controller: function($macgyver, $scope) {
			var $ctrl = this;
			$macgyver.inject($scope, $ctrl);

			$ctrl.validate = ()=> [
				$ctrl.config.required && !$ctrl.data && `${$ctrl.config.title} is required`,
				$ctrl.config.min && $ctrl.data < $ctrl.config.min && `${$ctrl.config.title} is too small (minimum value is ${$ctrl.config.min})`,
				$ctrl.config.max && $ctrl.data > $ctrl.config.max && `${$ctrl.config.title} is too large (maximum value is ${$ctrl.config.max})`,
			];

			$ctrl.add = steps => $ctrl.data += steps * ($ctrl.step || 1);

			// Adopt default  if no data value is given {{{
			$scope.$watch('$ctrl.data', ()=> { if (_.isUndefined($ctrl.data) && _.has($ctrl, 'config.default')) $ctrl.data = $ctrl.config.default });
			// }}}
		},
		template: `
			<div ng-if="$ctrl.config.slider">
				<input ng-model="$ctrl.data" type="range" class="form-control" placeholder="{{$ctrl.config.placeholder}}" min="{{$ctrl.config.min}}" max="{{$ctrl.config.max}}" step="{{$ctrl.config.step}}"/>
			</div>
			<div ng-if="!$ctrl.config.slider" class="input-group">
				<a ng-click="$ctrl.add(-1)" class="btn btn-default input-group-addon hidden-print"><i class="fa fa-arrow-down"></i></a>
				<input ng-model="$ctrl.data" type="number" class="form-control" placeholder="{{$ctrl.config.placeholder}}" min="{{$ctrl.config.min}}" max="{{$ctrl.config.max}}" step="{{$ctrl.config.step}}"/>
				<a ng-click="$ctrl.add(1)" class="btn btn-default input-group-addon hidden-print"><i class="fa fa-arrow-up"></i></a>
			</div>
		`,
	})
