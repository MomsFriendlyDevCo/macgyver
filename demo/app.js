var app = angular.module("app", [
	'macgyver',
]);

app.controller("macgyverExampleCtrl", function($http, $macgyver, $scope) {
	$scope.data = {};
	$scope.config = {}; // Populated via $http.get()

	// Bootstrap 4 style {{{
	_.merge($macgyver.widgets.mgChoiceButtons.config, {
		itemClassInactive: {default: 'btn btn-light'},
		itemClassActive: {default: 'btn btn-primary'},
	});

	_.merge($macgyver.widgets.mgList.config, {
		addButtonActiveClass: {default: 'btn btn-block btn-success fa fa-plus'},
		addButtonInactiveClass: {default: 'btn btn-block btn-secondary btn-disabled fa fa-plus'},
	});

	_.merge($macgyver.widgets.mgNumber.config, {
		bumperDownClass: {default: 'btn btn-light fa fa-arrow-down input-group-prepend text-muted'},
		bumperUpClass: {default: 'btn btn-light fa fa-arrow-up input-group-append text-muted'},
		prefixClass: {default: 'input-group-append'},
		suffixClass: {default: 'input-group-append'},
	});

	_.merge($macgyver.widgets.mgToggle.config, {
		onClassInactive: {default: 'btn-light'},
		offClassInactive: {default: 'btn-light'},
	});

	_.merge($macgyver.widgets.mgTable.config, {
		addButtonActiveClass: {default: 'btn btn-block btn-success fa fa-plus'},
		addButtonInactiveClass: {default: 'btn btn-block btn-secondary btn-disabled fa fa-plus'},
	});
	// }}}

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
