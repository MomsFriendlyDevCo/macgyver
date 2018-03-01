/**
* MacGyver form editor
* Meta component to edit a form
* @param {Object} [$macgyver.settings.mgFormEditor.maskPosition] Optional object containing left, top, width, height relative positions (e.g. left=1 will use the position + 1px)
* @param {Object} [$macgyver.settings.mgFormEditor.menuPosition] Optional object containing left, top (e.g. left=1 will use the position + 1px)
* @param {Object} [$macgyver.settings.mgFormEditor.maskVerbs] Optional collection of buttons to display when hovering over a component (see the 'Defaults' section in the code for the default contents)
*/
angular
	.module('macgyver')
	.component('mgFormEditor', {
		template: `
			// @include components/mgFormEditor/mgFormEditor.tmpl.html
		`,
		bindings: {
			config: '<',
			data: '=',
		},
		controller: function($element, $macgyver, $q, $scope, $timeout, dragularService, TreeTools) {
			var $ctrl = this;
			$ctrl.$macgyver = $macgyver;

			// Widget Creation {{{
			$ctrl.categories = _($macgyver.widgets)
				.filter(w => w.userPlaceable)
				.map('category')
				.sort()
				.uniq()
				.value();

			$ctrl.category = $ctrl.categories[0];

			/**
			* Container for the element we're going to create
			* @var {Object}
			* @var {string} Object.id The ID of the element to add around
			* @var {string} Object.direction The direction to add the new item within. ENUM: 'above', 'below'
			* @var {string} Object.type The type of widget to add
			*/
			$ctrl.widgetAddDetails = {}; // Container for the eventually created new widget

			/**
			* Add a new widget
			* @param {string} direction The direction relative to the currently selected DOM element to add from. ENUM: 'above', 'below'
			* @param {Object|string} [widget] Optional widget or widget id to add relative to, if omitted the currently selected DOM element is used
			*/
			$ctrl.widgetAdd = function(direction, widget) {
				var node;
				if (_.isString(widget)) {
					debugger;
					node = TreeTools.find($ctrl.config, {id: widget}, {childNode: 'items'});
				} else if (_.isObject(widget)) {
					node = widget;
				} else { // Work out what item we are currently hovering over
					node = TreeTools.find($ctrl.config, {id: $ctrl.selectedWidget.id}, {childNode: 'items'});
				}
				if (!node) return; // Didn't find anything - do nothing

				$ctrl.widgetAddDetails = {
					id: node.id,
					direction: direction,
				};

				$('#modal-mgFormEditor-add').modal('show');
			};

			// Also listen for broadcasts from child controls such as the 'Add widget' button on empty containers
			$scope.$on('mg.mgFormEditor.widgetAdd', (e, direction, widget) => $ctrl.widgetAdd(direction, widget));


			/**
			* Finalize the state of $ctrl.widgetAddDetails and make the object
			* @param {Object} props props to merge with $ctrl.widgetAddDetails before submission
			*/
			$ctrl.widgetAddSubmit = function(props) {
				angular.merge($ctrl.widgetAddDetails, props);
				$('#modal-mgFormEditor-add').modal('hide');

				// Locate node we are adding above / below
				var node = TreeTools.find($ctrl.config, {id: $ctrl.widgetAddDetails.id}, {childNode: 'items'});
				if (!node) return console.error('Asked to create a widget around non-existant ID', $ctrl.widgetAddDetails); // Can't find element anyway
				var nodeParent = TreeTools.parents($ctrl.config, {id: $ctrl.widgetAddDetails.id}, {childNode: 'items'}).slice(-2).slice(0, 1)[0];
				var nodeIndex = nodeParent.items.findIndex(i => i.id == node.id);

				// Insert new widget into parents items collection
				var prototypeWidget = {
					id: $ctrl.widgetAddDetails.type + '-' + _.times(5, i => _.sample('abcdefghijklmnopqrstuvwxyz').split('')).join(''), // Generate a random ID
					type: $ctrl.widgetAddDetails.type,
				};

				switch ($ctrl.widgetAddDetails.direction) {
					case 'above':
						//if inserting above an index 0, need to ensure index is not -ve
						var insertedIndex = (nodeIndex - 1) < 0 ? 0 : nodeIndex - 1;
						//actually insert the prototypeWidget
						nodeParent.items.splice(insertedIndex, 0, prototypeWidget);
						$ctrl.widgetEdit(nodeParent.items[insertedIndex]);
						break;
					case 'below':
						//Insert below the current widget (increment by 1)
						var insertedIndex = nodeIndex + 1;
						//actually insert the prototypeWidget
						nodeParent.items.splice(insertedIndex, 0, prototypeWidget);
						$ctrl.widgetEdit(nodeParent.items[insertedIndex]);
						break;
					case 'inside':
						node.items.push(prototypeWidget);
						$ctrl.widgetEdit(node.items[node.items.length-1]);
						break;
				}

				$scope.$broadcast('mg.mgFormEditor.change');
			};
			// }}}

			// Widget Editing {{{
			$ctrl.selectedWidget; // The currently selected widget (determined by mouseover)
			$ctrl.selectedWidgetData;
			$ctrl.selectedWidgetForm;
			$ctrl.widgetName;

			/**
			* Begin editing a widget
			* @param {Object} [widget] An optional widget to edit, if omitted the widget is calculated from the currently selected DOM element
			* @returns {Promise} A promise that will resolve when the user closes the modal dialog, it will reject if no object can be edited
			*/
			$ctrl.widgetEdit = widget => $q(function(resolve, reject) {
				var node;
				if (_.isObject(widget)) {
					node = widget;
				} else if ($ctrl.selectedWidget) { // Try to determine from currently selected widget if we have one
					node = TreeTools.find($ctrl.config, {id: $ctrl.selectedWidget.id}, {childNode: 'items'});
				} else { // Can't do anything - cancel action
					return reject('No widget selected to edit');
				}

				// Get Human Readable Name for the edit widget. If error jsut use vanilla display
				if (node.type && typeof node.type == 'string') {
					$ctrl.widgetName = ' - ' + node.type.replace(/^mg+/i, '').replace(/([A-Z])/g, ' $1').trim()
				}

				// Select the Angular data element
				$ctrl.selectedWidgetData = node;

				// Setup a form definition from the defined properties of the config element
				$ctrl.selectedWidgetForm = {
					type: 'mgContainer',
					items: [
						// Options applicable to all types {{{
						{
							id: 'globalConfig',
							type: 'mgContainer',
							ignoreScope: true,
							showTitle: false,
							items: [
								{id: 'id', type: 'mgText', title: 'ID'},
							],
						},
						// }}}
						{id: 'sepGlobal', type: 'mgSeperator', showTitle: false},
						// Options for this specific type {{{
						{
							id: 'typeConfig',
							type: 'mgContainer',
							ignoreScope: true,
							showTitle: false,
							items: _($macgyver.widgets[$ctrl.selectedWidgetData.type].config)
								.map((v, k) => {
									v.id = k;
									if (!v.title) v.title = _.startCase(k);
									return v;
								})
								.filter(i => i.id != 'items') // Sub-items are managed by the UI
								.value()
						},
						// }}}
						// Options inherited from parents (via configChildren) {{{
						{
							id: 'parentConfig',
							type: 'mgContainer',
							ignoreScope: true,
							showTitle: false,
							items:
								// Partially horrifying method of scoping upwards though a tree to determine parent config
								_(
									// Step 1 - extract all the parent items configChildren and merge it into an object (oldest config first so children overwrite)
									_(TreeTools.parents($ctrl.config, node, {childNode: 'items'}))
										.slice(0, -1)// Remove this node from the list
										.reverse() // We're interested in the oldest first (so younger parents overwrite the config)
										.map(p => _.get($macgyver, ['widgets', p.type, 'configChildren']))
										.filter() // Remove all blank items
										.reduce((obj, p) => _.assign(obj, p), {})
								)
									// Step 2 - transform output into a form
									.map((p, k) => {
										p.id = k;
										if (!p.title) p.title = _.startCase(k);
										return p;
									})
									.value()
						},
						// }}}
					],
				};

				$ctrl.maskReact.move = false;
				$ctrl.maskReact.context = false;
				$('#modal-mgFormEditor-edit')
					.one('hidden.bs.modal', ()=> {
						resolve();
						$ctrl.maskReact.move = true;
						$ctrl.maskReact.context = true;
					})
					.modal('show')
			});

			/**
			* Toggle a single property associated with the active widget
			* @param {string} prop The property to toggle
			* @param {boolean} [startValue=false] The starting value of the property if undefined
			*/
			$ctrl.widgetToggle = function(prop, startValue) {
				var node = TreeTools.find($ctrl.config, {id: $ctrl.selectedWidget.id}, {childNode: 'items'});
				if (!node) return; // Didn't find anything - do nothing

				if (!_.has(node, prop)) { // Not yet set - assume its starting value is 'startValue'
					node[prop] = ! startValue;
				} else { // Just invert
					node[prop] = ! node[prop];
				}
			};

			// }}}

			// Widget Deletion {{{
			/**
			* Delete a widget
			* @params {Object} [widget] Optional widget to delete, if omitted the currently active DOM element will be used
			*/
			$ctrl.widgetDelete = function(widget) {
				// Work out what item we are currently hovering over
				var node = widget || TreeTools.find($ctrl.config, {id: $ctrl.selectedWidget.id}, {childNode: 'items'});
				if (!node) return; // Didn't find anything - do nothing

				var nodeParent = TreeTools.parents($ctrl.config, {id: node.id}, {childNode: 'items'}).slice(-2).slice(0, 1)[0];
				if (!nodeParent) throw new Error('Cannot find widget parent for ID: ' + node.id);
				var nodeIndex = nodeParent.items.findIndex(i => i.id == node.id);

				nodeParent.items.splice(nodeIndex, 1);
			};
			// }}}

			// Setup a mask over any widget when the user moves their mouse over them {{{
			$ctrl.maskReact = {
				move: true, // Whether the mask can move, if falsy all mouse move events will be ignored
				edit: true, // Respond to left-mouse-clicks
				context: true, // Respond to right-mouse-clicks
			};

			// React to mouse movement
			$element.on('mousemove', function(event) {
				if (!$ctrl.maskReact.move) return;
				var mouse = {left: event.clientX, top: event.clientY};

				var matching =
					angular.element('.mgComponent')
						.toArray()
						.map(i => {
							var rect = i.getBoundingClientRect();
							return {
								rect,
								area: rect.width * rect.height,
								el: i,
							};
						})
						.filter(i => i.rect.left <= mouse.left && i.rect.top <= mouse.top && i.rect.right >= mouse.left && i.rect.bottom >= mouse.top)
						.sort((a, b) => { // Find the item under the mouse with the tinest area
							if (a.area == b.area) return 0;
							return a.area < b.area ? -1 : 1;
						})
						[0];

				if (matching) {
					$element.children('.mgFormEditor-mask').css({
						left: matching.rect.left + _.get($macgyver.settings, 'mgFormEditor.maskPosition.left', 0),
						top: matching.rect.top + _.get($macgyver.settings, 'mgFormEditor.maskPosition.top', 0),
						width: matching.rect.width + _.get($macgyver.settings, 'mgFormEditor.maskPosition.width', 0),
						height: matching.rect.height + _.get($macgyver.settings, 'mgFormEditor.maskPosition.height', 0),
						display: 'block',
					})

					$ctrl.selectedWidget = TreeTools.find($ctrl.config, {id: angular.element(matching.el).attr('data-path')}, {childNode: 'items'});
				} else {
					$ctrl.selectedWidget = null;
				}
			});

			// Hide the mask when scrolling
			angular.element(document).on('scroll', ()=> $scope.$apply(()=> {
				$element.children('.mgFormEditor-mask').css('display', 'none');
				$ctrl.selectedWidget = null;
			}));

			// When opening / closing dropdowns disable the mask from moving
			$element.on('show.bs.dropdown', ()=> { $scope.$apply(()=> {
				$ctrl.maskReact.move = false
				$ctrl.maskReact.edit = false
			}) });
			$element.on('hide.bs.dropdown', ()=> { $scope.$apply(()=> {
				$ctrl.maskReact.move = true;
				$ctrl.maskReact.edit = true;
			}) });

			// React to mouse clicking
			$element.on('mousedown', function(event) {
				if (angular.element(event.target).closest('a').length) return; // User was probably clicking on a button - don't handle this internally

				var elem = angular.element(this);
				if (elem.closest('.modal').length) return; // Don't react when the element is inside a modal

				if ($ctrl.maskReact.edit && event.button == 0) { // Left mouse click - edit widget under cursor
					event.stopPropagation();
					$scope.$apply(()=> $ctrl.widgetEdit());
				}
			});

			// React to right mouse menu clicking
			$element.on('contextmenu', function(event) {
				if (!$ctrl.maskReact.context) return;

				event.stopPropagation();
				event.preventDefault();

				if (!$ctrl.selectedWidget) return;
				$element.find('.mgFormEditor-mask > .mgFormEditor-mask-buttons .dropdown-toggle').dropdown('toggle');
			});
			// }}}

			// Drag + Drop via Dragular {{{
			// Dragular has to be re-init each time the items array changes as it attaches to jQuery hooks and not Angular
			$scope.$watchCollection('$ctrl.config.items', ()=> $timeout(()=> {
				if ($ctrl.drake) $ctrl.drake.remove();

				try {
					$ctrl.drake = dragularService('mg-container', {
						classes: {
							mirror: 'gu-mirror form-horizontal', // BS insists that the dragging mirror have the correct form helper
						},
						scope: $scope,
						direction: 'vertical',
						lockY: true,
					});
				} catch (e) {
					// NOTE: Dragular complains about multiple event handlers being attached but we don't really care about that
					// Disabled the following line (or remove the entire try-catch block) if you need to see the error
					// console.error(e);
				}
			}));

			// Handle the drop condition - splice the moved item back into the parent items array, removing the original
			$scope.$on('dragulardrop', (e, el, targetContainer, sourceContainer, conModel, elIndex, targetModel, dropIndex) => {
				var parents = TreeTools.parents($ctrl.config, {id: $ctrl.selectedWidget.id}, {childNode: 'items'});
				var parent = parents[parents.length-2];

				parent.items = _(parent.items)
					.map((i, idx, items) => {
						if (idx == dropIndex) { // Is this the drop position?
							return [items[elIndex], i];
						} else if (idx == elIndex) { // Is this the source position?
							return undefined;
						} else { // Everything else gets passed though
							return i;
						}
					})
					.filter()
					.flatten()
					.value();
			});
			// }}}

			// Mask verbs (i.e. buttons that appear on hover) {{{
			/**
			* Execute a verb action
			* The action can be a function - in which case it is executed as ({$ctrl.selectedWidget, verb})
			* or a string
			* @param {Object} verb The verb to execute
			*/
			$ctrl.verbAction = verb => {
				if (angular.isFunction(verb.action)) {
					verb.action($ctrl.selectedWidget, verb);
				} else if (verb.action == 'edit') {
					$ctrl.widgetEdit();
				} else if (verb.action == 'toggleTitle') {
					$ctrl.widgetToggle('showTitle', true);
				} else if (verb.action == 'delete') {
					$ctrl.widgetDelete();
				}
			};

			/**
			* Return the evaulated property of a mask verb
			* If the verbs property is a function it is invoked with ({$ctrl.selectedWidget, verb})
			* If its a string it is used as is
			* @param {Object} verb The verb to examine
			* @param {string} prop The property to evaluate and return
			* @returns {*} The evaluated return value
			*/
			$ctrl.verbProperty = (verb, prop) => {
				if (!$ctrl.selectedWidget) return;

				if (angular.isFunction(verb[prop])) {
					return verb[prop]($ctrl.selectedWidget);
				} else {
					return verb[prop];
				}
			};
			// }}}

			// Init + Set Defaults {{{
			$ctrl.$onInit = ()=> {
				_.defaults($macgyver.settings.mgFormEditor, {
					maskVerbs: [
						{action: 'toggleTitle', class: 'btn btn-default btn-sm', icon: 'fa fa-fw fa-arrows-h', tooltip: 'Toggle the title visibility of this element'},
						{action: 'delete', class: 'btn btn-danger btn-sm', icon: 'fa fa-fw fa-trash', tooltip: 'Delete this widget'},
					],
				});
			};
			// }}}
		},
	})
