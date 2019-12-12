/**
* MacGyver file upload
* NOTE: This module optionally uses mgFileList by default. You can override this if needed to only display an uploader.
* @param {Object} config The config specification
* @param {string} [config.icon="fa fa-file"] The icon class to display in the file selection button
* @param {string} [config.placeholder="Upload file..."] Placeholder text to display when no file is selected
* @param {string} [config.showList=true] Whether to automatically display a file list
* @param {string} [config.listMode='files'] The list mode display to use
* @param {string} [config.showUploading=true] Whether to display uploading files
* @param {boolean} [config.allowDelete=true] Whether to allow file deletion
* @param {string|function} [config.urlQuery] The URL to query for files. If unset $macgyver.settings.urlResolver is used
* @param {string|function} [config.urlUpload] The URL to upload files to. If unset $macgyver.settings.urlResolver is used
* @param {string|function} [config.urlDelete] The URL to delete files from. If unset $macgyver.settings.urlResolver is used
* @param {function} [config.onUpload] Callback to fire when a file is uploaded (as well as firing a `$broadcast('mg.refreshUploads')`)
* @param {*} data The state data
* @emits mg.refreshUploads Fired when all upload lists should refresh their contents as a file upload has just taken place
*/
angular
	.module('macgyver')
	.config($macgyverProvider => $macgyverProvider.register('mgFileUpload', {
		title: 'File upload',
		icon: 'fa fa-file-o',
		category: 'Files and uploads',
		config: {
			icon: {type: 'mgText', default: 'fa fa-file-text'},
			placeholder: {type: 'mgText', default: 'Upload file...', help: 'Ghost text to display when no file is present'},
			allowDelete: {type: 'mgToggle', default: true},
			showList: {type: 'mgToggle', default: true, help: 'Show a list of files already uploaded'},
			listMode: {type: 'mgChoiceButtons', enum: ['list', 'thumbnails'], default: 'list'}, // NOTE: This is really just inherited by the mgFileList child element
			showUploading: {type: 'mgToggle', default: true},
		},
	}))
	.component('mgFileUpload', {
		bindings: {
			config: '<',
			data: '=?',
		},
		controller: function($element, $http, $macgyver, $scope, $timeout) {
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
						widget: 'mgFileUpload',
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
				$ctrl.listConfig = angular.extend({}, $ctrl.config, {mgPath: $macgyver.getPath($scope)});
			};
			// }}}

			// Deal with new uploads {{{
			$ctrl.selectedFile;
			$ctrl.uploading = [];

			$ctrl.click = ()=> $element.find('input[type=file]').trigger('click');

			$element
				.find('input[type=file]')
				.on('change', function() { $timeout(()=> { // Attach to file widget and listen for change events so we can update the text
					var filename = $(this).val().replace(/\\/g,'/').replace( /.*\//,''); // Tidy up the file name

					var formData = new FormData();
					formData.append('file', this.files[0]);

					$ctrl.uploading.push({
						name: filename,
						$promise: $http.post($ctrl.getUrl('upload', {file: filename}), formData, {
							headers: {'Content-Type': undefined}, // Need to override the headers so that angular changes them over into multipart/mime
							transformRequest: angular.identity,
						})
							.then(()=> {
								$ctrl.uploading = $ctrl.uploading.filter(i => i.name != filename); // Remove this item from the upload list
								if (_.isFunction($ctrl.config.onUpload)) $ctrl.config.onUpload();
								$macgyver.broadcast($scope, 'mg.refreshUploads'); // Tell all file displays to refresh their contents
							})
					});
				})});

			// }}}
		},
		template: `
			<a ng-click="$ctrl.click()" class="btn btn-primary hidden-print" style="margin-bottom:10px">
				<i ng-class="$ctrl.icon || 'fa fa-file'"></i>
				{{$ctrl.selectedFile || $ctrl.placeholder || 'Upload file...'}}
			</a>
			<div ng-if="$ctrl.config.showList === undefined || $ctrl.config.showList">
				<mg-file-list config="$ctrl.listConfig" data="$ctrl.data"></mg-file-list>
			</div>
			<ul ng-if="$ctrl.config.showUploading === undefined || $ctrl.config.showUploading" class="list-group">
				<li ng-repeat="file in $ctrl.uploading" class="list-group-item">
					<i class="fa fa-spinner fa-spin"></i>
					{{file.name}}
				</li>
			</ul>
			<div style="display: none"><input type="file" name="file"/></div>
		`,
	})
