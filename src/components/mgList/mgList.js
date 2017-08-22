/**
* MacGyver list input
* @param {Object} config The config specification
* @param {boolean} [config.required=false] Whether this field is required
* @param {Date} [config.min] The minimum allowable number of items
* @param {Date} [config.max] The maximum allowable number of items
* @param {*} data The state data
*/
angular
	.module('macgyver')
	.config($macgyverProvider => $macgyverProvider.register('mgList', {
		title: 'List',
		icon: 'fa fa-list-ol',
		category: 'Simple Inputs',
		config: {
			allowDelete: {type: 'mgToggle', default: true},
			min: {type: 'mgNumber', title: 'Minimum number of items'},
			max: {type: 'mgNumber', title: 'Maximum number of items'},
			required: {type: 'mgToggle', default: false},
			numbered: {type: 'mgToggle', default: true},
		},
	}))
	.component('mgList', {
		bindings: {
			config: '<',
			data: '=',
		},
		controller: function($macgyver, $scope) {
			var $ctrl = this;
			$macgyver.inject($scope, $ctrl);

			$ctrl.validate = ()=> [
				$ctrl.config.required && (!$ctrl.data || $ctrl.data.length) && `${$ctrl.config.title} is required`,
				$ctrl.config.min && $ctrl.data.length < $ctrl.config.min && `${$ctrl.config.title} has too few items (minimum is ${$ctrl.config.min})`,
				$ctrl.config.max && $ctrl.data.length > $ctrl.config.max && `${$ctrl.config.title} has too many items (maximum is ${$ctrl.config.max})`,
			];

			// Adopt default  if no data value is given {{{
			$scope.$watch('$ctrl.data', ()=> { if (_.isUndefined($ctrl.data) && _.has($ctrl, 'config.default')) $ctrl.data = $ctrl.config.default });
			// }}}

			// Appending {{{
			$ctrl.listNewItem = {
				text: '',
			};

			$ctrl.addItem = ()=> {
				if (!_.isArray($ctrl.data)) $ctrl.data = [];
				$ctrl.data.push($ctrl.listNewItem.text);
				$ctrl.listNewItem.text = '';
			};
			// }}}

			// Delete {{{
			$ctrl.removeItem = index => {
				$ctrl.data = $ctrl.data.filter((x, i) => i != index);
			};
			// }}}
		},
		template: `
			<form ng-submit="$ctrl.addItem()">
				<table class="table table-bordered table-hover">
					<tbody>
						<tr ng-repeat="row in $ctrl.data track by $index">
							<td ng-if="$ctrl.config.numbered == undefined || $ctrl.config.numbered" class="text-center font-md">{{$index + 1 | number}}</td>
							<td>
								<input ng-model="row" type="text" class="form-control"/>
							</td>
							<td ng-if="$ctrl.config.allowDelete == undefined || $ctrl.config.allowDelete">
								<a ng-click="$ctrl.removeItem($index)" class="btn btn-danger btn-sm visible-parent-hover"><i class="fa fa-trash-o"></i></a>
							</td>
						</tr>
					</tbody>
					<tfoot class="hidden-print">
						<tr>
							<td ng-if="$ctrl.config.numbered == undefined || $ctrl.config.numbered" class="text-center" width="30px">
								<button type="submit" class="btn btn-ellipsis" ng-class="$ctrl.listNewItem.text ? 'btn-success' : 'btn-disabled'">
									<i class="fa fa-plus"></i>
								</button>
							</td>
							<td>
								<input ng-model="$ctrl.listNewItem.text" type="text" class="form-control"/>
							</td>
							<td width="35px">&nbsp;</td>
						</tr>
					</tfoot>
				</table>
			</form>
		`,
	})
