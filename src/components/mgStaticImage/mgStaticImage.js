/**
* MacGyver static image
* @param {Object} config The config specification
* @param {string} [config.file] The file to display
* @param {string} [config.style='alert-info'] The style of alert box to display. Enum of 'info', 'success', 'warning', 'danger'
* @param {*} data The state data
*/
angular
	.module('macgyver')
	.config($macgyverProvider => $macgyverProvider.register('mgStaticImage', {
		title: 'Static Image',
		icon: 'fa fa-image',
		category: 'General Decoration',
		config: {
			file: {type: 'mgFileUpload', showList: false, allowDelete: false, onUpload: () => {
				console.log('upload callback');
			}},
		},
	}))
	.component('mgStaticImage', {
		bindings: {
			config: '<',
			data: '=',
		},
		controller: function($http, $macgyver, $scope) {
			var $ctrl = this;
			$macgyver.inject($scope, $ctrl);

			// TODO: Use mgFileUpload to delete the content when this widget is removed from config

			// URL storage {{{
			$ctrl.urls = {}; // These all get their defaults in $onInit

			$ctrl.getUrl = (type, context) => {
				if (_.isString($ctrl.urls[type])) {
					return $ctrl.urls[type]; // Already a string - just return
				} else if (_.isFunction($ctrl.urls[type])) { // Resolve it using a context
					return $ctrl.urls[type](Object.assign({}, {
						type,
						widget: 'mgFileList',
						path: $macgyver.getPath($scope),
					}, context));
				} else {
					throw new Error('Unknown URL type: ' + type);
				}
			};
			// }}}

			// Fetch data from server {{{
			$ctrl.refresh = ()=> {
				if (!_.isEmpty($ctrl.data)) { // Use data
					$ctrl.data = $ctrl.data;
				} else { // Fetch data via URL
					$http.get($ctrl.getUrl('query'))
						.then(data => $ctrl.data = _.isArray(data.data) ? data.data.pop() : data.data);
				}
			};
			// }}}

			// External events {{{
			//$scope.$on('mg.refreshUploads', ()=> $ctrl.refresh());
			// }}}

			// Init {{{
			$ctrl.$onInit = ()=> {
				$ctrl.urls.query = $ctrl.config.urlQuery || $macgyver.settings.urlResolver || '/api/widgets';

				// Setup the child mgFileUpload widget with config from this widget
				$ctrl.config.file = angular.extend({}, $ctrl.config);

				$ctrl.refresh();
			};
			// }}}
		},
		template: `
			<div ng-class="$ctrl.config.style || 'staticimage-box'">
				||{{$ctrl.data}}||
				<img ng-if="$ctrl.data.url" class="staticimage-content" ng-src="{{$ctrl.data.url}}">
			</div>
		`,
	})
