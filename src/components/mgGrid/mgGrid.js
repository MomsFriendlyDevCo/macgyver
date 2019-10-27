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
	.module('macgyver')
	.config($macgyverProvider => $macgyverProvider.register('mgGrid', {
		title: 'Grid layout',
		icon: 'fa fa-dropbox',
		category: 'Layout',
		isContainer: true,
		config: {
			rows: {type: 'mgNumber', default: 1, min: 1, max: 100},
			cols: {type: 'mgNumber', default: 1, min: 1, max: 100},
			style: {
				type: 'mgChoiceDropdown',
				title: 'Grid style',
				help: 'How to style the grid',
				default: 'table-bordered',
				enum: [
					{id: '', title: 'Bordered', class: 'table-bordered'},
					{id: 'mgTableBorderless', title: 'Borderless', class: 'table-borderless'},
					{id: 'mgTableCondensed', title: 'Condensed', class: 'table-condensed'}
				]
			},
			styleCompact: {
				type: 'mgToggle',
				title: 'Compact forms',
				default: false
			},
			styleDarker: {
				type: 'mgToggle',
				title: 'Darker borders',
				default: false
			},
			styleHover: {
				type: 'mgToggle',
				title: 'Hover rows',
				default: true
			},
			styleStriped: {
				type: 'mgToggle',
				title: 'Striped rows',
				default: true
			},
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
				if (!$ctrl.config.items) $ctrl.config.items = [];
				if (!$ctrl.config.rows) $ctrl.config.rows = $ctrl.config.items.length;
				if (!$ctrl.config.cols) $ctrl.config.cols = Math.max(...$ctrl.config.items.map(i => i.items.length));
			};

			$scope.$watchGroup(['$ctrl.config.rows', '$ctrl.config.cols'], ()=> {
				if (_.has($ctrl, 'config.rows')) { // Rows has been set - probably by the user editing the widget properties
					if ($ctrl.config.rows < $ctrl.config.items.length) { // Removing some items
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
			<table class="table" ng-class="[
				$ctrl.config.style ? $ctrl.config.style : 'table-bordered',
				$ctrl.config.styleHover ? 'table-hover' : undefined,
				$ctrl.config.styleStriped ? 'table-striped' : undefined,
				$ctrl.config.styleCompact ? 'table-compact' : undefined,
				$ctrl.config.styleDarker ? 'table-darker' : undefined
			]">
				<tr ng-repeat="row in $ctrl.config.items">
					<td ng-repeat="w in row.items" ng-switch="w.type">
						<mg-container ng-if="w.type=='mgContainer'" data="$ctrl.data[w.id]" config="w"></mg-container>
						<div ng-if="w.type!='mgContainer'" class="alert alert-danger">Child cell elements within a mgGrid must always be an mgContainer</div>
					</td>
				</tr>
			</table>
		`,
	})
