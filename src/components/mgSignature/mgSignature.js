/**
* MacGyver Signature directive
* @require angular-ui-scribble
* @param {Object} config The config specification
* @param {*} data The state data
*/
angular
	.module('macgyver')
	.config($macgyverProvider => $macgyverProvider.register('mgSignature', {
		title: 'Signature input',
		icon: 'fa fa-picture-o',
		category: 'Files and uploads',
		config: {
			allowDelete: {type: 'mgToggle', default: true, help: 'Allow the user to delete the signature and re-sign'},
		},
	}))
	.component('mgSignature', {
		bindings: {
			config: '<',
			data: '=',
		},
		controller: function($http, $macgyver, $scope) {
			var $ctrl = this;
			$macgyver.inject($scope, $ctrl);

			// URL storage {{{
			$ctrl.urls = {}; // These all get their defaults in $onInit

			$ctrl.getUrl = (type, context) => {
				if (_.isString($ctrl.urls[type])) {
					return $ctrl.urls[type]; // Already a string - just return
				} else if (_.isFunction($ctrl.urls[type])) { // Resolve it using a context
					return $ctrl.urls[type](Object.assign({}, {
						type,
						widget: 'mgSignature',
						path: $macgyver.getPath($scope),
					}, context));
				} else {
					throw new Error('Unknown URL type: ' + type);
				}
			};
			// }}}

			// Init {{{
			$ctrl.$onInit = ()=> {
				$ctrl.urls.query = $ctrl.config.urlQuery || $macgyver.settings.urlResolver || '/api/widgets';
				$ctrl.urls.upload = $ctrl.config.urlUpload || $macgyver.settings.urlResolver || function(o) { return `/api/widgets/${o.path}` };
				$ctrl.urls.delete = $ctrl.config.urlDelete || $macgyver.settings.urlResolver || function(o) { return `/api/widgets/${o.path}` };

				$ctrl.refresh();
			};
			// }}}

			// Fetch data from server {{{
			$ctrl.files;
			$ctrl.refresh = ()=>
				$http.get($ctrl.getUrl('query'))
					.then(data => $ctrl.files = data.data);
			// }}}

			// Deal with uploads {{{
			$ctrl.isUploading = false;
			$ctrl.getSignature = function(dataURI, blob) {
				var sigBlob = new Blob([blob], {type: 'image/png'});
				var formData = new FormData();
				formData.append('file', sigBlob);

				$http.post($ctrl.getUrl('upload', {file: 'signature.png'}), formData, {
					headers: {'Content-Type': undefined}, // Need to override the headers so that angular changes them over into multipart/mime
					transformRequest: angular.identity,
				})
					.then(()=> {
						$ctrl.isUploading = false;
						$ctrl.refresh();
					})

				$ctrl.isUploading = true;
			};
			// }}}

			// Deletion {{{
			$ctrl.delete = file =>
				$http.delete($ctrl.getUrl('delete', {file: 'signature.png'}))
					.then($ctrl.refresh, $ctrl.refresh); // Whatever happens - refresh
			// }}}
		},
		template: `
			<div ng-if="$ctrl.files && $ctrl.files.length" class="visible-parent-hover-target">
				<img ng-src="{{$ctrl.files[0].url}}" class="img-responsive"/>
				<a ng-click="$ctrl.delete()" class="btn btn-danger btn-circle btn-lg btn-fab visible-parent-hover" tooltip="Delete the signature" tooltip-tether="true"><i class="fa fa-fw fa-trash"></i></a>
			</div>
			<div ng-if="!$ctrl.files || !$ctrl.files.length">
				<div ng-if="$ctrl.isUploading" class="alert alert-info font-lg">
					<i class="fa fa-spinner fa-spin"></i>
					Uploading signature...
				</div>
				<div ng-if="!$ctrl.isUploading">
					<ui-scribble editable="false" callback="$ctrl.getSignature(dataURI, blob)"></ui-scribble>
				</div>
			</div>
		`,
	})
