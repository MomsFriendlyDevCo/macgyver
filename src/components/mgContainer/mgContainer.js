/**
* MacGyver component loader
* This is a meta component that loads other dynamic components as an array
* @param {Object} config The config specification
* @param {array} config.items A collection of sub-item objects to display
* @param {boolean} [config.ignoreScope=false] If true any child item storage paths will not be prefixed by this items ID (e.g. a child item with the ID 'foo' will normally be set to '(whatever this ID is).foo' unless this option is true)
* @param {string} [config.layout="form"] The layout profile to use. ENUM: form = A standard horizontal form layout, panel = A bootsrap panel with header and footer
* @param {boolean} [config.items[].help] Optional help text to show under the element
* @param {boolean} [config.items[].ignoreScope=false] Whether this container effects the lexical path of the item being set - i.e. if enabled (the default) the saved item will use this containers ID in the path of the item to set, if disabled this container is effectively invisible
* @param {boolean} [config.items[].showTitle=true] Whether to show the left-hand-side form title for the item
* @param {string} [config.items[].title] Optional title to display for the widget
* @param {string} config.items[].type The type of the object to render. This corresponds to a `mg*` component
* @param {*} data The state data
*/
angular
	.module('macgyver')
	.config($macgyverProvider => $macgyverProvider.register('mgContainer', {
		title: 'Container layout',
		icon: 'fa fa-dropbox',
		category: 'Layout',
		isContainer: true,
		template: '<mg-container config="w" data="w.ignoreScope ? $ctrl.data : $ctrl.data[w.id]"></mg-container>', // Overriding template for containers to bypass scoping if ignoreScope is true
		config: {
			// items: undefined, // Intentionally hidden - mgFormEditor provides functionality to edit this
			ignoreScope: {type: 'mgToggle', default: false, title: 'Ignore Scope', help: 'Flatten the data scope with the parent level - i.e. dont nest any child element inside an object when saving data'},
			layout: {type: 'mgChoiceDropdown', title: 'Layout profile', help: 'How to layout child elements', default: 'form', enum: [
				{id: 'form', title: 'Standard form layout'},
				{id: 'panel', title: 'Panel based layout'},
			]},
			layoutStyle: {
				title: 'Layout style',
				help: 'Styling to use if layout is in panel mode',
				type: 'mgChoiceButtons',
				default: 'panel-default',
				iconSelected: 'fa fa-fw fa-check',
				iconDefault: 'fa fa-fw',
				enum: [
					{id: 'panel-default', class: 'btn-default'},
					{id: 'panel-success', class: 'btn-success'},
					{id: 'panel-info', class: 'btn-info'},
					{id: 'panel-warning', class: 'btn-warning'},
					{id: 'panel-danger', class: 'btn-danger'},
				],
			},
			layoutColorful: {type: 'mgToggle', default: false, title: 'Fill layout color', help: 'Shade the entire panel in the layout style'},
		},
		configChildren: {
			help: {type: 'mgText', title: 'Help text', help: 'Optional help text for the item - just like what you are reading now'},
			showTitle: {type: 'mgToggle', default: true, title: 'Show Title', help: 'Whether to show the side title for this element'},
			title: {type: 'mgText', title: 'Title'},
			rowClass: {type: 'mgChoiceDropdown', title: 'Styling', help: 'Additional styling to apply to the widget', default: '', enum: $macgyverProvider.settings.mgContainer.rowClass},
		},
	}))
	.component('mgContainer', {
		bindings: {
			config: '<',
			data: '=',
		},
		controller: function($element, $macgyver, $scope) {
			var $ctrl = this;
			$macgyver.inject($scope, $ctrl);
			$ctrl.isEditing = !! $element.closest('mg-form-editor').length;

			$ctrl.widgetAddChild = ()=> $scope.$emit('mg.mgFormEditor.widgetAdd', 'inside', $ctrl.config.id);
		},
		template: $macgyver =>  `
			<div ng-switch="$ctrl.config.layout">
				<div ng-switch-when="panel">
					<div class="panel" ng-class="[$ctrl.config.layoutStyle || 'panel-default', $ctrl.config.layoutColorful ? 'panel-colorful' : undefined]">
						<div class="panel-heading">{{$ctrl.config.title}}</div>
						<div class="panel-body">
							<div ng-repeat="w in $ctrl.config.items track by w.id" ng-switch="w.type" data-path="{{w.id}}" class="form-group row mgComponent" ng-class="[w.mgValidation == 'error' ? 'has-error' : '', w.rowClass]">
								<label ng-if="w.showTitle || w.showTitle===undefined" class="control-label text-left" ng-class="!(w.type=='mgLabel' || w.type=='mgHtml') || ($ctrl.data[w.id] || w.text) ? 'col-sm-3' : 'col-sm-12'">{{w.title}}</label>
								<div ng-if="!(w.type=='mgLabel' || w.type=='mgHtml') || ($ctrl.data[w.id] || w.text)" ng-class="w.showTitle || w.showTitle===undefined ? 'col-sm-9' : 'col-sm-12'">
							` + _.map($macgyver.widgets, w => `<div ng-switch-when="${w.id}">${w.template}</div>`).join('\n') + `
									<div ng-switch-default class="alert alert-danger">Unknown MacGyver widget type : "{{w.type}}"</div>
								</div>
								<div class="help-block" ng-if="w.help" ng-class="w.showTitle || w.showTitle===undefined ? 'col-sm-9 col-sm-offset-3' : 'col-sm-12'">{{w.help}}</div>
							</div>
							<div ng-click="$ctrl.widgetAddChild()" ng-if="$ctrl.isEditing && !$ctrl.config.items.length" class="text-center">
								<a class="btn btn-sm btn-success"><i class="fa fa-plus"></i> Add widget</a>
							</div>
						</div>
					</div>
				</div>
				<div ng-switch-default>
					<div ng-click="$ctrl.widgetAddChild()" ng-if="$ctrl.isEditing && !$ctrl.config.items.length" class="text-center">
						<a class="btn btn-sm btn-success"><i class="fa fa-plus"></i> Add widget</a>
					</div>
					<div ng-repeat="w in $ctrl.config.items track by w.id" ng-switch="w.type" data-path="{{w.id}}" class="form-group row mgComponent" ng-class="[w.mgValidation == 'error' ? 'has-error' : '', w.rowClass]">
						<label ng-if="w.showTitle || w.showTitle===undefined" class="control-label text-left" ng-class="!(w.type=='mgLabel' || w.type=='mgHtml') || ($ctrl.data[w.id] || w.text) ? 'col-sm-3' : 'col-sm-12'">{{w.title}}</label>
						<div ng-if="!(w.type=='mgLabel' || w.type=='mgHtml') || ($ctrl.data[w.id] || w.text)" ng-class="w.showTitle || w.showTitle===undefined ? 'col-sm-9' : 'col-sm-12'">
					` + _.map($macgyver.widgets, w => `<div ng-switch-when="${w.id}">${w.template}</div>`).join('\n') + `
							<div ng-switch-default class="alert alert-danger">Unknown MacGyver widget type : "{{w.type}}"</div>
						</div>
						<div class="help-block" ng-if="w.help" ng-class="w.showTitle || w.showTitle===undefined ? 'col-sm-9 col-sm-offset-3' : 'col-sm-12'">{{w.help}}</div>
					</div>
				</div>
			</div>
		`,
	})
