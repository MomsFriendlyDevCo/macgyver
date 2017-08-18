/**
* MacGyver Image directive
* @require angular-ui-scribble
* @param {Object} config The config specification
* @param {string} [config.showList=true] Whether to automatically display a file list
* @param {string} [config.listMode='thumbnails'] The list mode display to use
* @param {*} data The state data
*/
angular
	.module('macgyver')
	.config($macgyverProvider => $macgyverProvider.register('mgImage', {
		title: 'Image',
		icon: 'fa fa-pencil-square',
		category: 'Files and uploads',
		config: {
			title: {type: 'mgText', default: 'Attach image'},
			allowDelete: {type: 'mgToggle', default: true},
			showList: {type: 'mgToggle', default: true, help: 'Show a list of images already uploaded'},
			listMode: {type: 'mgChoiceButtons', enum: ['list', 'thumbnails'], default: 'thumbnails'}, // NOTE: This is really just inherited by the mgFileList child element
		},
	}))
	.component('mgImage', {
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
					return url[type]; // Already a string - just return
				} else if (_.isFunction($ctrl.urls[type])) { // Resolve it using a context
					return $ctrl.urls[type](Object.assign({}, {
						type,
						widget: 'mgImage',
						path: $macgyver.getPath($scope),
					}, context));
				} else {
					throw new Error('Unknown URL type: ' + type);
				}
			};
			// }}}

			// Init {{{
			$ctrl.$onInit = ()=> {
				$ctrl.urls.upload = $ctrl.config.urlUpload || $macgyver.settings.urlResolver || function(o) { return `/api/widgets/${o.path}` };

				// Setup the child list widget with the same path as this object
				$ctrl.listConfig = angular.extend({listMode: 'thumbnails'}, $ctrl.config, {mgPath: $macgyver.getPath($scope)});
			};
			// }}}

			// Deal with uploads {{{
			$ctrl.isUploading = false;
			$ctrl.getImage = function(dataURI, blob) {
				var sigBlob = new Blob([blob], {type: 'image/png'});
				var formData = new FormData();
				formData.append('file', sigBlob);

				$http.post($ctrl.getUrl('upload', {file: (new Date).toISOString() + '.png'}), formData, {
					headers: {'Content-Type': undefined}, // Need to override the headers so that angular changes them over into multipart/mime
					transformRequest: angular.identity,
				})
					.then(()=> {
						$ctrl.isUploading = false;
						$macgyver.broadcast($scope, 'mg.refreshUploads'); // Tell all file displays to refresh their contents
					})

				$ctrl.showModal(false);
				$ctrl.isUploading = true;
			};
			// }}}

			// Deal with modal {{{
			$ctrl.modalShown = false;
			$ctrl.showModal = show => {
				if (show) {
					angular.element('#modal-mgImage-' + $ctrl.config.id)
						.on('shown.bs.modal', ()=> $scope.$apply(()=> $ctrl.modalShown = true))
						.on('hidden.bs.modal', ()=> $scope.$apply(()=> $ctrl.modalShown = false))
						.modal('show')
				} else {
					angular.element('#modal-mgImage-' + $ctrl.config.id).modal('hide');
				}
			};
			// }}}
		},
		template: `
			<div id="modal-mgImage-{{$ctrl.config.id}}" class="modal fade">
				<div class="modal-dialog" style="width: 830px">
					<div class="modal-content">
						<div class="modal-header">
							<a class="close" data-dismiss="modal"><i class="fa fa-times"></i></a>
							<h4 class="modal-title">{{$ctrl.config.title || 'Attach image'}}</h4>
						</div>
						<div class="modal-body">
							<div ng-if="$ctrl.modalShown">
								<ui-scribble editable="true" callback="$ctrl.getImage(dataURI, blob)" width="800" height="600"></ui-scribble>
							</div>
						</div>
						<div class="modal-footer">
							<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
						</div>
					</div>
				</div>
			</div>
			<div ng-if="$ctrl.config.showList === undefined || $ctrl.config.showList">
				<mg-file-list config="$ctrl.listConfig" data="$ctrl.data"></mg-file-list>
			</div>
			<div ng-if="!$ctrl.files || !$ctrl.files.length" class="hidden-print">
				<div ng-if="$ctrl.isUploading" class="alert alert-info font-lg">
					<i class="fa fa-spinner fa-spin"></i>
					Uploading signature...
				</div>
				<a ng-click="$ctrl.showModal(true)" class="btn btn-success">
					<i class="fa fa-plus"></i>
					Add image
				</a>
			</div>
		`,
	})
