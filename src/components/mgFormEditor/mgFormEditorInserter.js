/**
* MacGyver form editor helper widget for widget inserting
*/
angular
	.module('macgyver')
	.config($macgyverProvider => $macgyverProvider.register('mgFormEditorInserter', {
		title: 'Form Editor - Inserter',
		userPlaceable: false,
		icon: 'fa fa-pencil-square-o',
		category: 'Form Editor Inserter',
		config: {},
	}))
	.component('mgFormEditorInserter', {
		bindings: {
			config: '<',
			data: '=',
		},
		controller: function($element, $macgyver, $scope) {
			var $ctrl = this;
			$ctrl.$macgyver = $macgyver;
			$macgyver.inject($scope, $ctrl);

			$element.on('click', ()=> $scope.$apply(()=> {
				// Pass - higher level functions handle the insertation here - we just have to catch the event
			}));
		},
		template: `
			<div class="alert alert-success mgComponentEditorInserter">
				<div ng-click="$ctrl.widgetAddChild()">
					<i class="fa fa-plus"></i>
					Add widget
				</div>
			</div>
		`,
	})
