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
			maskVerbs: [
				{action: 'toggleTitle', class: 'btn btn-default btn-sm', icon: 'fa fa-fw fa-arrows-h', tooltip: 'Toggle the title visibility of this element'},
				{action: 'delete', class: 'btn btn-danger btn-sm', icon: 'fa fa-fw fa-trash', tooltip: 'Delete this widget'},
				{
					action: widget => widget.star = !widget.star,
					class: widget => 'btn btn-sm ' + (widget.star ? 'btn-warning' : 'btn-default'),
					icon: widget => 'fa fa-fw ' + (widget.star ? 'fa-star' : 'fa-star-o'),
					tooltip: 'Toggle the star of the widget',
				},
			],
		},
	});

	// Fetch the showcase into the config
	$http.get('examples/showcase.json')
		.then(res => $scope.config = res.data);
});
