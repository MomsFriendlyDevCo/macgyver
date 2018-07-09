/**
* MacGyver date input
* @param {Object} config The config specification
* @param {boolean} [config.required=false] Whether this field is required
* @param {Date} [config.min] The minimum allowable date
* @param {Date} [config.max] The maximum allowable date
* @param {*} data The state data
*/
angular
	.module('macgyver')
	.config($macgyverProvider => $macgyverProvider.register('mgDate', {
		title: 'Date selection',
		icon: 'fa fa-calendar',
		category: 'Simple Inputs',
		config: {
			min: {type: 'mgDate', title: 'Earliest date'},
			max: {type: 'mgDate', title: 'Latest date'},
			required: {type: 'mgToggle', default: false},
		},
		format: v => {
			if (!v) return '';
			var d = v instanceof Date ? v : new Date(v);
			console.log('mgDate SHOULD BE DATE', d);
			return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
		},
	}))
	.component('mgDate', {
		bindings: {
			config: '<',
			data: '=',
		},
		controller: function($macgyver, $scope) {
			var $ctrl = this;
			$macgyver.inject($scope, $ctrl);

			$ctrl.validate = ()=> [
				$ctrl.config.required && !$ctrl.data && `${$ctrl.config.title} is required`,
				$ctrl.config.min && _.isString($ctrl.data) && $ctrl.data < $ctrl.config.min && `${$ctrl.config.title} is too early (earliest date is ${$ctrl.config.min})`,
				$ctrl.config.max && _.isString($ctrl.data) && $ctrl.data > $ctrl.config.max && `${$ctrl.config.title} is too late (latest date is ${$ctrl.config.max})`,
			];

			// Adopt default  if no data value is given {{{
			$scope.$watch('$ctrl.data', ()=> { if (_.isUndefined($ctrl.data) && _.has($ctrl, 'config.default')) $ctrl.data = $ctrl.config.default });
			// }}}
		},
		template: `
			<input ng-model="$ctrl.data" type="date" class="form-control"/>
		`,
	})
