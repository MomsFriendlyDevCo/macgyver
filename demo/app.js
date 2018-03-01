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
				{title: '-'},
				{action: 'toggleTitle', icon: 'fa fa-fw fa-arrows-h', title: 'Toggle title display'},
				{action: 'delete', icon: 'fa fa-fw fa-trash', title: 'Delete widget'},
				{action: widget => widget.star = !widget.star, icon: 'fa fa-fw fa-star', title: 'Toggle always displayed'},
			],
		},
	});

	// Fetch the showcase into the config
	$http.get('examples/showcase.json')
		.then(res => $scope.config = res.data);
});
