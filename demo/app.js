var app = angular.module("app", [
	'macgyver',
]);

app.controller("macgyverExampleCtrl", function($http, $macgyver, $scope, TreeTools) {
	$scope.data = {
		// Initialise with a date to test formatting
		demoDate: "2019-01-01T00:00:00.000Z"
	};
	$scope.config = {}; // Populated via $http.get()

	// Configure where to place the editor mask
	_.merge($macgyver.settings, {
		mgFormEditor: {
			// Configure the mask position to slightly overlap the panel-body
			maskPosition: {
				left: 2,
				width: -5,
				top: -2,
				height: 6,
			},

			// Example of custom maskVerb properties
			verbs: {
				buttonsLeft: [
					// {action: 'drag', class: 'btn btn-default', icon: 'fa fa-fw fa-bars'}, // FIXME: Not yet supported
					// {action: 'dropdown', class: 'btn btn-default', icon: 'fa fa-fw fa-ellipsis-h'}, // FIXME: Not yet possible in configuration
				],
				buttonsRight: [
					{action: 'add', class: 'btn btn-default', icon: 'fa fa-fw fa-plus', tooltip: 'Add a new widget under this one'},
				],
				dropdown: [
					{action: 'edit', icon: 'fa fa-fw fa-pencil', title: 'Edit', selectedWidgetOnly: true},
					// TODO: Also support tables for paste operation?
					{action: 'pasteTsv', icon: 'fa fa-fw fa-paste', title: 'Paste TSV table',
						show: widget => (widget && widget.type === 'mgGrid'),
						selectedWidgetOnly: true
					},
					{action: 'pasteJson', icon: 'fa fa-fw fa-paste', title: 'Paste JSON table',
						show: widget => (widget && widget.type === 'mgGrid'),
						selectedWidgetOnly: true
					},
					{action: 'duplicateCell', icon: 'fa fa-fw fa-arrow-down', title: 'Duplicate cell',
						show: widget => {
							// Only show when within an mgGridRow
							return (TreeTools.parents($scope.config, {id: widget.id}, {childNode: 'items'})
								.map(p => p.type)
								.indexOf('mgGridRow') !== -1);
						},
						selectedWidgetOnly: true
					},
					{action: 'delete', icon: 'fa fa-fw fa-trash', title: 'Delete widget', selectedWidgetOnly: true},
					{title: '-'},
					{
						title: 'Always show widget title',
						icon: widget => widget.showTitle || _.isUndefined(widget.showTitle) ? 'fa fa-fw fa-check-square-o' : 'fa fa-fw fa-square-o',
						action: widget => widget.showTitle = ! _.get(widget, 'showTitle', true), // showTitle defaults to true if unspecifed
						selectedWidgetOnly: true,
					},
					{
						title: 'Always displayed',
						icon: widget => widget.star ? 'fa fa-fw fa-check-square-o' : 'fa fa-fw fa-square-o',
						action: widget => widget.star = !widget.star,
						selectedWidgetOnly: true,
					},
				],
			},
		},
	});

	// Fetch the showcase into the config
	$http.get('examples/showcase.json')
		.then(res => $scope.config = res.data);
});
