'use strict';

angular.module('angular-ui-scribble', []).factory('$debounce', ['$timeout', function ($timeout) {
	/**
 * @author Matt Carter <m@ttcarter.com>
 * Calls fn once after timeout even if more than one call to debounced fn was made
 * Edited version of the original part of ng-tools - https://github.com/capaj/ng-tools
 */
	function debounce(callback, timeout, apply) {
		timeout = angular.isUndefined(timeout) ? 0 : timeout;
		apply = angular.isUndefined(apply) ? true : apply;
		var callCount = 0;
		return function () {
			var self = this;
			var args = arguments;
			callCount++;
			var wrappedCallback = function (version) {
				return function () {
					if (version === callCount) return callback.apply(self, args);
				};
			}(callCount);
			return $timeout(wrappedCallback, timeout, apply);
		};
	}
	return debounce;
}]).directive('uiScribble', function () {
	return {
		scope: {
			callback: '&',
			editable: '<',
			buttons: '<',
			width: '@?',
			height: '@?',
			sizes: '<',
			colors: '<'
		},
		template: '\n\t\t\t<div class="scribble" ng-class="editable ? \'scribble-editable\' : \'scribble-not-editable\'">\n\t\t\t\t<input class="scribble-file-camera selectBackground-image" type="file" accept="image/*" >\n\t\t\t\t<input class="scribble-file-camera selectBackground-video" type="file" accept="image/*" capture="camera">\n\t\t\t\t<nav ng-if="editable" class="scribble-actions navbar navbar-default" style="width: {{width}}px">\n\t\t\t\t\t<div class="navbar-form pull-left">\n\t\t\t\t\t\t<div ng-if="buttons.camera" class="btn-group">\n\t\t\t\t\t\t\t<a ng-if="mode!=\'streaming\' && !isMobile" tooltip="Set background image" ng-click="setBackground()" class="btn btn-primary"><i class="fa fa-camera"></i></a>\n\t\t\t\t\t\t\t<a ng-if="mode==\'streaming\' && !isMobile" tooltip="Take screenshot" ng-click="screenshot()" class="btn btn-primary"><i class="fa fa-camera"></i></a>\n\t\t\t\t\t\t\t<a ng-if="isMobile" ng-click="requestCamera(\'video\')" class="btn btn-primary"><i class="fa fa-camera"></i></a>\n\t\t\t\t\t\t\t<a ng-click="requestCamera(\'image\')" class="btn btn-primary"><i class="fa fa-paperclip"></i></a>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t\t<div class="btn-group">\n\t\t\t\t\t\t\t<a ng-click="setMode(\'pen\')" ng-class="mode==\'pen\' && \'active\'" tooltip="Pen" class="btn btn-default"><i class="fa fa-pencil"></i></a>\n\t\t\t\t\t\t\t<a ng-if="buttons.eraser" ng-click="setMode(\'erase\')" ng-class="mode==\'erase\' && \'active\'" tooltip="Eraser" class="btn btn-default"><i class="fa fa-eraser"></i></a>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t\t<div ng-if="buttons.sizes" class="btn-group scribble-pens">\n\t\t\t\t\t\t\t<a ng-repeat="size in sizes" ng-click="setPenSize(size)" ng-class="penSize==size && \'active\'" tooltip="Pen Size {{size}}" class="btn btn-default"><i class="fa fa-circle" style="transform: scale({{$index / sizes.length + 0.2}})"></i></a>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t\t<div ng-if="buttons.colors" class="btn-group scribble-colors">\n\t\t\t\t\t\t\t<a ng-repeat="color in colors" ng-click="setPenColor(color)" ng-class="penColor==color && \'active\'" tooltip="Pen Color {{color}}" class="btn btn-default"><i class="fa fa-square" style="color: {{color}}"></i></a>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t</div>\n\t\t\t\t\t<div ng-if="buttons.clear" class="navbar-form pull-right">\n\t\t\t\t\t\t<div class="btn-group">\n\t\t\t\t\t\t\t<a ng-click="clearSignature()" class="btn btn-danger"><i class="fa fa-trash"></i></a>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t</div>\n\t\t\t\t</nav>\n\t\t\t\t<div class="scribble-area" style="width: {{width}}px; height: {{height}}px">\n\t\t\t\t\t<canvas class="scribble-board" height="{{height}}" width="{{width}}"></canvas>\n\t\t\t\t\t<video class="scribble-video" ng-show="mode==\'streaming\'" height="{{height}}" width="{{width}}" autoplay></video>\n\t\t\t\t\t<canvas class="scribble-background" ng-show="mode!=\'streaming\'" height="{{height}}" width="{{width}}"></canvas>\n\t\t\t\t\t<a ng-if="signatureReady" ng-click="submit()" class="btn btn-success btn-circular btn-fab"><i class="fa fa-fw fa-check fa-2x"></i></a>\n\t\t\t\t</div>\n\t\t\t\t<canvas class="scribble-composed" height="{{height}}" width="{{width}}"></canvas>\n\t\t\t</div>\n\t\t',
		controller: ['$scope', '$element', '$debounce', function controller($scope, $element, $debounce) {
			// Mobile version {{{
			var userAgent = navigator.userAgent;
			$scope.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(userAgent);

			$scope.requestCamera = function (type) {
				$scope.setMode('pen');

				if (videoStream && videoStream.getTracks()[0]) videoStream.getTracks()[0].stop();

				$element.find('.selectBackground-' + type).trigger('click');
			};
			// }}}

			// Deal with user config {{{
			if (!$scope.height) $scope.height = 200;
			if (!$scope.width) $scope.width = 490;
			if (!$scope.sizes) $scope.sizes = [1, 2, 3, 4, 5];
			if (!$scope.colors) $scope.colors = ['#000', '#337AB7', '#3C763D', '#8A6D3B', '#A94442'];

			$scope.buttons = Object.assign({ // Set default buttons unless overriden
				camera: true,
				colors: true,
				clear: true,
				eraser: true,
				sizes: true
			}, $scope.buttons);
			// }}}

			// Screenshot management {{{
			var canvas = $element[0].querySelector('.scribble-board');
			var ctx = canvas.getContext('2d');
			$scope.signaturePad = new SignaturePad(canvas);

			var canvasBackground = $element[0].querySelector('.scribble-background');
			var ctxBackground = canvasBackground.getContext('2d');
			var composedImage = $element[0].querySelector('.scribble-composed');
			var ctxComposed = composedImage.getContext('2d');
			var video = $element[0].querySelector('.scribble-video');
			var videoStream;
			// check for getUserMedia support
			navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia || navigator.oGetUserMedia;

			$scope.setBackground = function () {
				if (!navigator.getUserMedia) return;

				navigator.getUserMedia({ video: true }, function (stream) {
					// Get webcam feed if available
					$scope.$applyAsync(function () {
						$scope.signatureReady = false;
						// Clear canvas
						if (ctxBackground) ctxBackground.clearRect(0, 0, canvas.width, canvas.height);
						video.src = window.URL.createObjectURL(stream);
						videoStream = stream;
						$scope.setMode('streaming'); // Start video feed
					});
				}, function () {
					return alert("Camera unavailable");
				});
			};

			$scope.reversed = false;
			$scope.flipContext = function () {
				$scope.reversed = !$scope.reversed;
				ctxBackground.translate(canvasBackground.width, 0);
				ctxBackground.scale(-1, 1);
			};

			$scope.screenshot = function () {
				$scope.setMode('pen');
				$scope.signatureReady = false;

				if (video.paused || video.ended) console.log("no video");;
				if (video.paused || video.ended) return false;
				//TODO: hack to flip context only once {{{
				if (!$scope.reversed) $scope.flipContext();
				// }}}

				ctxBackground.drawImage(video, 0, 0, $scope.width, $scope.height);
				videoStream.getTracks()[0].stop();
				$scope.signatureReady = true;
			};
			// }}}

			// Handle signature pad events {{{
			$scope.clearSignature = function () {
				return $scope.signaturePad.clear();
			};

			$scope.signaturePad.onBegin = function () {
				return $scope.$applyAsync(function () {
					return $scope.signatureReady = false;
				});
			};

			$scope.signaturePad.onEnd = $debounce(function () {
				return $scope.$applyAsync(function () {
					if ($scope.editable) {
						$scope.signatureReady = true;
					} else {
						$scope.submit();
					}
				});
			}, 1500, false);
			// }}}

			// Manage mode {{{
			$scope.mode = 'pen';
			$scope.setMode = function (mode) {
				return $scope.mode = mode;
			};

			$scope.$watch('mode', function (newVal, oldVal) {
				if (newVal == 'erase' && newVal !== oldVal) {
					$scope.oldStroke = {
						oldComposition: ctx.globalCompositeOperation,
						minWidth: $scope.signaturePad.minWidth,
						maxWidth: $scope.signaturePad.maxWidth
					};
					ctx.globalCompositeOperation = 'destination-out';
					$scope.signaturePad.minWidth = 6;
					$scope.signaturePad.maxWidth = 8;
				} else if (oldVal == 'erase') {
					ctx.globalCompositeOperation = $scope.oldStroke.oldComposition;
					$scope.signaturePad.minWidth = $scope.oldStroke.minWidth;
					$scope.signaturePad.maxWidth = $scope.oldStroke.maxWidth;
				}
			});
			// }}}

			// Pen size {{{
			$scope.penSize = 1;
			$scope.setPenSize = function (size) {
				$scope.penSize = size;
				$scope.signaturePad.minWidth = size - 0.5;
				$scope.signaturePad.maxWidth = size + 1.5;
			};
			// }}}

			// Pen color {{{
			$scope.penColor = '#000';
			$scope.setPenColor = function (color) {
				$scope.penColor = color;
				$scope.signaturePad.penColor = color;
			};
			// }}}

			// Background - mobile {{{
			var selectBackgroundImage = $element[0].querySelector('.selectBackground-image');
			var selectBackgroundVideo = $element[0].querySelector('.selectBackground-video');

			selectBackgroundImage.addEventListener('change', imageSelected(selectBackgroundImage));
			selectBackgroundVideo.addEventListener('change', imageSelected(selectBackgroundVideo));

			function imageSelected(selectBackground) {
				return function () {
					if (!selectBackground.files.length) return;

					var backgroundSrc = selectBackground.files[0];
					var reader = new FileReader();

					reader.onload = function (event) {
						var image = new Image();
						image.src = event.target.result;
						image.onload = function () {
							return loadImage(image);
						};
					};

					if (reader) reader.readAsDataURL(backgroundSrc);
				};
			}
			// Load image on canvas
			function loadImage(image) {
				$scope.$applyAsync(function () {
					if ($scope.reversed) $scope.flipContext();
					$scope.signatureReady = true;

					ctxBackground.clearRect(0, 0, canvas.width, canvas.height);
					ctxBackground.drawImage(image, 0, 0, canvasBackground.width, canvasBackground.height);
				});
			}
			// }}}

			// Submit signature {{{
			$scope.getDataURI = function () {
				ctxComposed.clearRect(0, 0, composedImage.width, composedImage.height);
				ctxComposed.drawImage(canvasBackground, 0, 0);
				ctxComposed.drawImage(canvas, 0, 0);
				return composedImage.toDataURL();
			};

			$scope.getBlob = function (dataURI) {
				var byteString = atob(dataURI.replace(/^data:image\/png;base64,/, ''));
				var ia = new Uint8Array(byteString.length);
				for (var i = 0; i < byteString.length; i++) {
					ia[i] = byteString.charCodeAt(i);
				}
				return new Blob([ia], { type: 'image/png' });
			};

			$scope.submit = function () {
				var dataURI = $scope.getDataURI();
				$scope.callback({
					dataURI: dataURI,
					blob: $scope.getBlob(dataURI)
				});
			};
			// }}}
		}]
	};
});