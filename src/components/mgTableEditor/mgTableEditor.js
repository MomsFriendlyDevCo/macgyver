/**
* MacGyver table editor meta control
* This control provides very basic functionality to edit the properties of a mgTable by allowing each column to have width, type, title etc.
* For more complex functionality (e.g. table columns that are nested containers) its probably best to use a JSON editor
* @param {Object} config The config specification
* @param {*} data The state data
*/
angular
	.module('macgyver')
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
			$ctrl.$macgyver = $macgyver;

			$macgyver.inject($scope, $ctrl);

			// Adopt default  if no data value is given {{{
			$scope.$watch('$ctrl.data', ()=> { if (_.isUndefined($ctrl.data) && _.has($ctrl, 'config.default')) $ctrl.data = $ctrl.config.default });
			// }}}

			$ctrl.add = ()=> {
				if (!$ctrl.data) $ctrl.data = [];
				$ctrl.data.push({
					title: `Column ${$ctrl.data.length + 1}`,
					type: 'mgText',
					showTitle: false,
				});
			};

			$ctrl.remove = index => $ctrl.data = $ctrl.data.filter((c, i) => i != index);

			$ctrl.widgetSelection;
			$scope.$watch('$ctrl.$macgyver.widgets', ()=> {
				$ctrl.widgetSelection = _($macgyver.widgets)
					.map()
					.sortBy('title')
					.value();
			});
		},
		template: `
			<table class="table table-bordered table-striped">
				<thead>
					<tr>
						<th width="50%">Title</th>
						<th width="25%">Type</th>
						<th width="25%">
							Width
							<i
								class="pull-right fa fa-info-circle"
								tooltip="Width can be any valid CSS specifier. e.g. '100' (assumes pixels), '50px', '20%'"
							></i>
						</th>
						<th width="32px">&nbsp;</th>
					</tr>
				</thead>
				<tbody>
					<tr ng-repeat="item in $ctrl.data">
						<td><input ng-model="item.title" type="text" class="form-control"/></td>
						<td>
							<select ng-model="item.type" class="form-control">
								<option ng-repeat="widget in $ctrl.widgetSelection track by widget.id" value="{{widget.id}}">{{widget.title}}</option>
							</select>
						</td>
						<td><input ng-model="item.width" type="text" class="form-control" placeholder="Default"/></td>
						<td>
							<a ng-click="$ctrl.remove($index)" class="btn btn-danger btn-sm">
								<i class="fa fa-trash"></i>
							</a>
						</td>
					</tr>
				</tbody>
				<tfoot>
					<tr>
						<td colspan="4" class="text-center">
							<a ng-click="$ctrl.add()" class="btn btn-sm btn-success">
								<i class="fa fa-plus"></i>
								Add column
							</a>
						</td>
					</tr>
				</tfoot>
			</table>
		`,
	})
