var app = angular.module("app", [
	'macgyver',
]);

app.controller("macgyverExampleCtrl", function($http, $macgyver, $scope) {
	$scope.data = {};
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
			verbs: [
				{action: 'edit', icon: 'fa fa-fw fa-pencil', title: 'Edit'},
				{action: 'delete', icon: 'fa fa-fw fa-trash', title: 'Delete widget'},
				{title: '-'},
				{
					title: 'Always show widget title',
					icon: widget => widget.showTitle || _.isUndefined(widget.showTitle) ? 'fa fa-fw fa-check-square-o' : 'fa fa-fw fa-square-o',
					action: widget => widget.showTitle = ! _.get(widget, 'showTitle', true), // showTitle defaults to true if unspecifed
				},
				{
					title: 'Always displayed',
					icon: widget => widget.star ? 'fa fa-fw fa-check-square-o' : 'fa fa-fw fa-square-o',
					action: widget => widget.star = !widget.star,
				},
			],
		},
	});

	// Fetch the showcase into the config
	$http.get('examples/showcase.json')
		.then(res => $scope.config = res.data);
});
