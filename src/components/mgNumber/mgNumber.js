/**
* MacGyver text input
* @param {Object} config The config specification
* @param {boolean} [config.required=false] Whether this field is required
* @param {string} [config.placeholder] Placeholder text to display when the widget is empty
* @param {Date} [config.min] The minimum allowable value
* @param {Date} [config.max] The maximum allowable value
* @param {number} [config.step] The number to increment / decrement by
* @param {boolean} [config.interface="bumpers"] Display the widget as a slider rather than free-text input (requires min/max to work properly)
* @param {*} data The state data
*/
angular
	.module('macgyver')
	.config($macgyverProvider => $macgyverProvider.register('mgNumber', {
		title: 'Number',
		icon: 'fa fa-sort-numeric-asc',
		category: 'Simple Inputs',
		config: {
			min: {type: 'mgNumber', title: 'Minimum value'},
			max: {type: 'mgNumber', title: 'Maximum value'},
			step: {type: 'mgNumber', title: 'Value to increment / decrement by'},
			placeholder: {type: 'mgNumber', help: 'Ghost text to display when there is no value'},
			required: {type: 'mgToggle', default: false},
			interface: {type: 'mgChoiceDropdown', title: 'Interface', help: 'How to allow number input', default: 'bumpers', enum: [
				{id: 'bumpers', title: 'Number input with buttons'},
				{id: 'slider', title: 'Slider bar'},
				{id: 'input', title: 'Number input box only'},
			]},
			bumperDownClass: {type: 'mgText', default: 'btn btn-default fa fa-arrow-down input-group-addon', advanced: true},
			bumperUpClass: {type: 'mgText', default: 'btn btn-default fa fa-arrow-up input-group-addon', advanced: true},
		},
		format: v => {
			if (!v) return '';
			return (_.isNumber(v) ? v : parseInt(v)).toLocaleString();
		},
		formatAlign: 'right',
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

			$ctrl.add = steps => {
				if (!angular.isNumber($ctrl.data)) return $ctrl.data = $ctrl.config.min || 0; // Not already a number default to the min or zero

				$ctrl.data += steps * ($ctrl.step || 1);
				if ($ctrl.config.max && $ctrl.data > $ctrl.config.max) $ctrl.data = $ctrl.config.max;
				if ($ctrl.config.min && $ctrl.data < $ctrl.config.min) $ctrl.data = $ctrl.config.min;
			};

			// Adopt default if no data value is given {{{
			$scope.$watch('$ctrl.data', ()=> { if (_.isUndefined($ctrl.data) && _.has($ctrl, 'config.default')) $ctrl.data = $ctrl.config.default });

			$ctrl.$onInit = ()=> $scope.assignConfig('interface', 'bumperDownClass', 'bumperUpClass');
			// }}}
		},
		template: `
			<div ng-if="$ctrl.config.interface == 'slider'">
				<input ng-model="$ctrl.data" type="range" class="form-control" placeholder="{{$ctrl.config.placeholder}}" min="{{$ctrl.config.min}}" max="{{$ctrl.config.max}}" step="{{$ctrl.config.step}}"/>
			</div>
			<div ng-if="$ctrl.config.interface == 'bumpers'" class="input-group">
				<a ng-click="$ctrl.add(-1)" class="hidden-print" ng-class="$ctrl.config.bumperDownClass"></a>
				<input ng-model="$ctrl.data" type="number" class="form-control" placeholder="{{$ctrl.config.placeholder}}" min="{{$ctrl.config.min}}" max="{{$ctrl.config.max}}" step="{{$ctrl.config.step}}"/>
				<a ng-click="$ctrl.add(1)" class="hidden-print" ng-class="$ctrl.config.bumperUpClass"></a>
			</div>
			<div ng-if="$ctrl.config.interface == 'input'">
				<input ng-model="$ctrl.data" type="number" class="form-control" placeholder="{{$ctrl.config.placeholder}}" min="{{$ctrl.config.min}}" max="{{$ctrl.config.max}}" step="{{$ctrl.config.step}}"/>
			</div>
		`,
	})
