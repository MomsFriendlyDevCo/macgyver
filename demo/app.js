var app = angular.module("app", [
	'macgyver',
]);

app.controller("macgyverExampleCtrl", function($http, $macgyver, $scope) {
	$scope.data = {};
	$scope.config = {}; // Populated via $http.get()

	// Fetch the showcase into the config
	$http.get('examples/showcase.json')
		.then(res => $scope.config = res.data);
});
