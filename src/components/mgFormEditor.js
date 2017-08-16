/**
* MacGyver form editor
* Meta component to edit a form
* @param {Object} [$macgyver.settings.mgFormEditor.maskPosition] Optional object containing left, top, width, height relative positions (e.g. left=1 will use the position + 1px)
*/
angular
	.module('macgyver')
	.component('mgFormEditor', {
		template: `
			// @include components/mgFormEditor.tmpl.html
		`,
		bindings: {
			config: '<',
			data: '=',
		},
		controller: function($element, $macgyver, $scope, TreeTools) {
			var $ctrl = this;
			$ctrl.$macgyver = $macgyver;

			// .editing mode {{{
			// This variable (as well as the partner CSS: `mg-form-editor.editing` dictates whether mg-form-editor should react to events like clicking form elements
			$ctrl.editing = false;
			$ctrl.setEditing = editing => {
				$ctrl.editing = editing;
				$element.toggleClass('editing', $ctrl.editing);
			};

			$scope.$evalAsync(()=> $ctrl.setEditing(true)); // Kickoff initial editing mode when everything settles
			// }}}

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
			*/
			$ctrl.widgetEdit = function(widget) {
				var node;
				if (_.isObject(widget)) {
					node = widget;
				} else if ($ctrl.selectedWidget) { // Try to determine from currently selected widget if we have one
					node = TreeTools.find($ctrl.config, {id: $ctrl.selectedWidget.id}, {childNode: 'items'});
				} else { // Can't do anything - cancel action
					return;
				}

				if (!node) return; // Didn't find anything - do nothing

				// Get Human Readable Name for the edit widget. If error jsut use vanilla display
				if (node.type && typeof node.type == 'string') {
					$ctrl.widgetName = ' - '+node.type.replace(/^mg+/i, '').replace(/([A-Z])/g, ' $1').trim()
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

				$ctrl.setEditing(false);
				$('#modal-mgFormEditor-edit').modal('show')
					.one('hidden.bs.modal', ()=> {
						$ctrl.setEditing(true); // Restore editing ability to editor (i.e. click will open the edit page)
					});
			};

			// Clicking on any widget when the mask is enabled should open an editor {{{
			$element.on('mousedown', 'mg-container > div', function(event) {
				var elem = angular.element(this);
				if (elem.closest('.modal').length) return; // Don't react when the element is inside a modal

				if (event.button == 0) {
					event.stopPropagation();
					$scope.$apply(() => {
						$ctrl.widgetEdit();
					});
				}
			});

			// Open a context menu on RMB
			$element.on('contextmenu', 'mg-container > div', function(event) {
				var elem = angular.element(this);
				if (elem.closest('.modal').length) return; // Don't react when the element is inside a modal
				event.stopPropagation();
				event.preventDefault();

				// Close the dropdown if the user clicks off it {{{
				angular.element(document)
					.one('mousedown', function(e) {
						if (!angular.element(e.target).closest('.dropdown-menu').length) e.stopPropagation(); // Only prevent the click if the user wasn't clicking the dropdown menu
						// Hide the menu in 100ms (Angular gets upset if we trigger an ng-click on an invisible <a> tag)
						setTimeout(()=> angular.element('#mgFormEditor-dropdown-widget').css('display', 'none'), 100);
					});
				// }}}

				// Position a dropdown under the mouse {{{
				var thisOffset = angular.element(this).offset();
				angular.element('#mgFormEditor-dropdown-widget')
					.css({
						position: 'absolute',
						display: 'block',
						left: thisOffset.left + event.offsetX - 220,
						top: thisOffset.top + event.offsetY - 35,
					});
				// }}}
			});
			// }}}

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
			$element.on('mouseover', 'mg-container > div', function(event) {
				event.stopPropagation();
				var elem = angular.element(this);
				if (elem.closest('.modal').length) return; // Don't react when the element is inside a modal

				var pos = elem.position();
				var setCSS = {
					left: pos.left + _.get($macgyver.settings, 'mgFormEditor.maskPosition.left', 0),
					top: pos.top + _.get($macgyver.settings, 'mgFormEditor.maskPosition.top', 0),
					width: elem.width() + _.get($macgyver.settings, 'mgFormEditor.maskPosition.width', 0),
					height: elem.height() + 6 + _.get($macgyver.settings, 'mgFormEditor.maskPosition.height', 0),
				};
				$element.children('.mgFormEditor-mask-background').css(setCSS);

				var verbWidth = 250;
				$element.children('.mgFormEditor-mask-verbs').css({
					left: setCSS.left + setCSS.width - verbWidth - 5,
					top: setCSS.top,
					width: verbWidth,
				});
				$scope.$apply(() => {
					$ctrl.selectedWidget = TreeTools.find($ctrl.config, {id: elem.attr('data-path')}, {childNode: 'items'});
				});
			});
			// }}}
		},
	})
