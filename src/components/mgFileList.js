/**
* MacGyver file list display
* This is an optional component inside mgFileList - if you just want a simple uploader you should see that component instead
* @param {Object} config The config specification
* @param {boolean} [config.allowDelete=true] Whether to allow file deletion
* @param {string,function} [config.urlQuery] The URL to query for files. If unset $macgyver.settings.urlResolver is used
* @param {string,function} [config.urlDelete] The URL to delete files from. If unset $macgyver.settings.urlResolver is used
* @param {string} [config.listMode='list'] The list method to use
* @param {function} [config.onDelete] Optional callback to fire when a file has been deleted
* @param {Array} [data] Optional array of files, if this is not set data will be populated via config.urlQuery instead
*/
angular
	.module('macgyver')
	.config($macgyverProvider => $macgyverProvider.register('mgFileList', {
		title: 'File list',
		icon: 'fa fa-files-o',
		category: 'Files and uploads',
		config: {
			allowDelete: {type: 'mgToggle', default: true},
			listMode: {type: 'mgChoiceButtons', enum: ['list', 'thumbnails'], default: 'list'},
		},
	}))
	.component('mgFileList', {
		bindings: {
			config: '<',
			data: '=',
		},
		controller: function($element, $http, $macgyver, $scope, $timeout) {
			var $ctrl = this;
			$macgyver.inject($scope, $ctrl);

			$ctrl.thumbnailAble = ['png', 'jpg', 'jpeg', 'gif', 'webm', 'svg'];

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

			// Init {{{
			$ctrl.$onInit = ()=> {
				$ctrl.urls.query = $ctrl.config.urlQuery || $macgyver.settings.urlResolver || '/api/widgets';
				$ctrl.urls.delete = $ctrl.config.urlDelete || $macgyver.settings.urlResolver || function(o) { return `/api/widgets/${o.path}` };

				$ctrl.refresh();
			};
			// }}}

			// Fetch data from server {{{
			$ctrl.refresh = ()=> {
				if (!_.isEmpty($ctrl.data)) { // Use data
					$ctrl.data = $ctrl.data;
				} else { // Fetch data via URL
					$http.get($ctrl.getUrl('query'))
						.then(data => $ctrl.data = data.data.map(file => {
							file.thumbnail = $ctrl.thumbnailAble.includes(file.ext);
							return file;
						}));
				}
			};
			// }}}

			// External events {{{
			$scope.$on('mg.refreshUploads', ()=> $ctrl.refresh());
			// }}}

			// Deal with deletes {{{
			$ctrl.delete = file =>
				$http.delete($ctrl.getUrl('delete', {file: file.name}))
					.then($ctrl.refresh, $ctrl.refresh) // Whatever happens - refresh
					.then(()=> {
						if (_.isFunction($ctrl.config.onDelete)) $ctrl.config.onDelete(file);
					})
			// }}}

		},
		template: `
			<ul ng-if="!$ctrl.config.listMode || $ctrl.config.listMode == 'list'" class="list-group">
				<a ng-repeat="file in $ctrl.data track by file.name" class="list-group-item" href="{{file.url}}" target="_blank">
					<span class="badge">{{file.size | filesize}}</span>
					<button ng-if="$ctrl.config.allowDelete === undefined || $ctrl.config.allowDelete" ng-click="$ctrl.delete(file); $event.preventDefault()" type="button" class="btn btn-danger btn-sm visible-parent-hover pull-right m-t--5 m-r-5"><i class="fa fa-trash"></i></button>
					<i ng-class="file.icon"></i>
					{{file.name}}
				</a>
				<li ng-repeat="file in $ctrl.uploading" class="list-group-item">
					<i class="fa fa-spinner fa-spin"></i>
					{{file.name}}
				</li>
			</ul>
			<div ng-if="$ctrl.config.listMode == 'thumbnails'" class="row" style="display:flex; flex-wrap: wrap">
				<div ng-repeat="file in $ctrl.data track by file.name" class="col-xs-6 col-md-3 m-b-10 visible-parent-hover-target">
					<a class="thumbnail" href="{{file.url}}" target="_blank" style="height: 100%; display: flex; align-items: center; justify-content: center">
						<img ng-if="file.thumbnail" src="{{file.url}}"/>
						<div ng-if="!file.thumbnail" class="text-center"><i ng-class="file.icon" class="fa-5x"></i></div>
					</a>
					<a ng-if="$ctrl.config.allowDelete === undefined || $ctrl.config.allowDelete" ng-click="$ctrl.delete(file)" class="btn btn-circle btn-danger visible-parent-hover" style="position: absolute; bottom: 15px; right: 20px">
						<i class="fa fa-fw fa-lg fa-trash"></i>
					</a>
				</div>
			</div>
		`,
	})
