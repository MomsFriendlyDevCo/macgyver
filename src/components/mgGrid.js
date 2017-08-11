/**
* MacGyver component layout for grids
* This container displays an array (rows) or arrays (columns) of widgets (items)
* @param {Object} config The config specification
* @param {array} config.items A collection of sub-item objects to display
* @param {array} config.items[] A column definition
* @param {string} config.items[][].type The type of the object to render. This corresponds to a `mg*` component
* @param {*} data The state data
*/
angular
	.module('app')
	.config($macgyverProvider => $macgyverProvider.register('mgGrid', {
		title: 'Grid layout',
		icon: 'fa fa-dropbox',
		category: 'Layout',
		isContainer: true,
		config: {
			rows: {type: 'mgNumber', default: 1, min: 1, max: 100},
			cols: {type: 'mgNumber', default: 1, min: 1, max: 100},
		},
	}))
	.component('mgGrid', {
		bindings: {
			config: '<',
			data: '=',
		},
		controller: function($macgyver, $scope) {
			var $ctrl = this;
			$macgyver.inject($scope, $ctrl);

			$ctrl.$onInit = ()=> {
				// Populate rows + cols when we boot
				$ctrl.config.rows = $ctrl.config.items.length;
				$ctrl.config.cols = Math.max(...$ctrl.config.items.map(i => i.items.length));
			};

			$scope.$watchGroup(['$ctrl.config.rows', '$ctrl.config.cols'], ()=> {
				if (_.has($ctrl, 'config.rows')) { // Rows has been set - probably by the user editing the widget properties
					if ($ctrl.config.rows < $ctrl.config.items.length) { // Removing some items
						debugger;
						$ctrl.config.items = $ctrl.config.items.slice(0, $ctrl.config.rows);
					} else if ($ctrl.config.rows > $ctrl.config.items.length) { // Adding some rows
						_.range($ctrl.config.items.length, $ctrl.config.rows).forEach(i => {
							$ctrl.config.items.push({
								id: $ctrl.config.id + '-row-' + i,
								type: 'mgGridRow',
								items: [],
							});
						});
					}
				}

				if (_.has($ctrl, 'config.cols')) { // Verify that all rows have the correct number of row blocks
					$ctrl.config.items.forEach((row, r) => {
						if (row.items.length < $ctrl.config.cols) { // Not enough blocks
							_.range(row.items.length, $ctrl.config.cols).forEach(c => {
								row.items.push({
									id: $ctrl.config.id + '-row-' + r + '-col-' + c,
									type: 'mgContainer',
									items: [],
								});
							});
						} else if (row.items.length > $ctrl.config.cols) { // Too many blocks
							row.items = row.items.slice(0, $ctrl.config.cols);
						}
					});
				}
			});
		},
		template: $macgyver => `
			<table class="table table-striped table-bordered">
				<tr ng-repeat="row in $ctrl.config.items">
					<td ng-repeat="w in row.items" ng-switch="w.type">
						` + _.map($macgyver.widgets, w => `<div ng-switch-when="${w.id}">${w.template}</div>`).join('\n') + `
					</td>
				</tr>
			</table>
		`,
	})
