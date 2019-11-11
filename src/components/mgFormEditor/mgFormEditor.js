/**
* MacGyver form editor
* Meta component to edit a form
* @param {Object} [$macgyver.settings.mgFormEditor.maskPosition] Optional object containing left, top, width, height relative positions (e.g. left=1 will use the position + 1px)
* @param {Object} [$macgyver.settings.mgFormEditor.menuPosition] Optional object containing left, top (e.g. left=1 will use the position + 1px)
* @param {Object} [$macgyver.settings.mgFormEditor.maskVerbs] Optional collection of buttons to display when hovering over a component (see the 'Defaults' section in the code for the default contents)
* @param {Object|boolean} [$macgyver.settings.mgFormEditor.scroller] Optional element to bind to for scroll events. If this is boolean false nothing will be bound, if its a string that jQuery selector will be used, everything else (including falsy) defaults to `document`
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
			$ctrl.isCreating = false; // Whether we are currently adding widgets (disables rendering of the add modal if falsy)
			$ctrl.categories = _($macgyver.widgets)
				.filter(w => w.userPlaceable)
				.map('category')
				.sort()
				.uniq()
				.value();

			$ctrl.category = $ctrl.categories.find(c => c == 'Simple Inputs'); // Try to find 'Simple Inputs' or dont use a filter

			/**
			* Container for the element we're going to create
			* @var {Object}
			* @var {string} Object.id The ID of the element to add around
			* @var {string} Object.direction The direction to add the new item within. ENUM: 'above', 'below'
			* @var {string} Object.type The type of widget to add
			*/
			$ctrl.widgetAddDetails = {}; // Container for the eventually created new widget

			/**
			* Paste a table of widgets
			* @params {Object} [widget] Optional widget to paste into, if omitted the currently active DOM element will be used
			* @returns {Promise} A promise which will resolve whether a widget was added or if the user cancelled the process
			*/
			$ctrl.widgetPaste = function(widget, verb) {
				// Work out what item we are currently hovering over
				var node = widget || TreeTools.find($ctrl.config, {id: $ctrl.selectedWidget.id}, {childNode: 'items'});
				if (!node) return; // Didn't find anything - do nothing

				return navigator.clipboard.readText()
					.then(content => {
						if (!content) return;

						var layout;
						switch (verb) {
							case 'JSON':
								// Flatten first dimension which is a list of separate tables
								layout = _(JSON.parse(content))
									.flatten()
									.value();
								break;

							case 'TSV':
							default:
								// LibreOffice: LF delimited, no rows
								if (content.indexOf('\t') === -1) {
									// We're unable to tell the difference between cell line-breaks and end-of-row without tab delimiters.
									throw new Error('Not implemented');

									// MS Office: Tab delimited, CRLF rows
								} else {
									if (!node.cols || node.cols < 0) return alert('Number of cols must be set to paste tables.');
									/*
									// NOTE: Makeshift method which allows for layout within cells. However every cell must be wrapped in `<cell></cell>`
									var matches = content.match(new RegExp('(?<=\<cell\>)((.|\n|)*?)(?=\<\/cell\>)', 'gm'));
									layout = _(matches)
										.compact()
										.chunk(node.cols)
										.value();
									*/

									// Tabs not allowed, last col does not support line-breaks.
									var bytab = _(content)
										.split('\t');
									var reordered = [];
									bytab.forEach((c, i) => {
										if ((reordered.length + 1) % node.cols === 0) {
											reordered.push(c.substr(0, c.indexOf('\n')));
											reordered.push(c.substr(c.indexOf('\n') + 1));
										} else {
											reordered.push(c);
										}
									});
									layout = _(reordered)
										.chunk(node.cols)
										.value();
								}
						}

						node.items = layout.map((row, rowi) => {
							if (!row || row.length !== node.cols) return;

							var cols = row.map(col => {
								if (!col) {
									return {
										type: 'mgContainer',
										items: []
									};
								}

								// First row has headings
								var type = (rowi === 0)?'mgHeading':'mgHtml';
								return {
									type: 'mgContainer',
									items: [
										{
											"type": type,
											"showTitle": false,
											"rowClass": "",
											"title": "",
											"text": col
										}
									]
								};
							});
							// Add extra cols when paste is larger
							node.cols = Math.max(node.cols, cols.length);
							return {
								type: 'mgGridRow',
								items: cols
							};
						});
						node.items = node.items.filter(n => typeof n !== 'undefined');
						node.rows = node.items.length;

						// Traverse tree
						$macgyver.forEach(node, w => {
							// Remove markup and re-apply line-breaks or tabs.
							if (w.text) w.text = w.text
								.replace('<cell>', '')
								.replace('</cell>', '')
								.replace(new RegExp('\r', 'g'), '')
								.replace(new RegExp('\n', 'g'), '<br>')
								.replace(new RegExp('\t', 'g'), '&nbsp;&nbsp;&nbsp;&nbsp;');
						});
					});
					//.catch(e => console.log('ERROR', e.toString()));
			};

			/**
			* Duplicate cell contents down an entire column
			* @params {Object} [widget] Optional widget to paste into, if omitted the currently active DOM element will be used
			* @todo `verb` in signature for duplicating up/down?
			* @returns {Promise} A promise which will resolve whether a widget was added or if the user cancelled the process
			*/
			$ctrl.widgetDuplicateCell = function(widget) {
				// Work out what item we are currently hovering over
				var node = widget || TreeTools.find($ctrl.config, {id: $ctrl.selectedWidget.id}, {childNode: 'items'});
				if (!node) return; // Didn't find anything - do nothing

				var parents = TreeTools.parents($ctrl.config, {id: node.id}, {childNode: 'items'})
				var types = parents.map(p => p.type);
				var grid_idx = types.lastIndexOf('mgGrid');
				var row_idx = types.lastIndexOf('mgGridRow');
				var container_idx = types.lastIndexOf('mgContainer');
				var grid_row = parents[grid_idx].items.indexOf(parents[row_idx]);
				var grid_cell = parents[grid_idx].items[grid_row].items.indexOf(parents[container_idx]);

				// Duplicate object and strip ids
				var clone = JSON.parse(JSON.stringify(parents[container_idx], (k, v) => {
					if (k !== 'id') return v;
				}));

				// Replace subsequent rows with new instance of cloned object
				for (var i=grid_row + 1; i<parents[grid_idx].items.length; i++) {
					parents[grid_idx].items[i].items[grid_cell] = JSON.parse(JSON.stringify(clone));
				}
			}

			/**
			* Add a new widget
			* @param {string} [direction='below'] The direction relative to the currently selected DOM element to add from. ENUM: 'above', 'below'
			* @param {Object|string} [widget] Optional widget or widget id to add relative to, if omitted the currently selected DOM element is used
			* @returns {Promise} A promise which will resolve whether a widget was added or if the user cancelled the process
			*/
			$ctrl.widgetAdd = function(direction = 'below', widget) {
				var node;
				if (_.isString(widget)) {
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


				return $q.resolve()
					.then(()=> $ctrl.locks.add(['maskMove', 'contextMenu', 'edit'], 'widgetAdd'))
					.then(()=> $ctrl.isCreating = true)
					.then(()=> $ctrl.modal.show('modal-mgFormEditor-add'))
					.then(()=> $ctrl.isCreating = false)
					.then(()=> $ctrl.locks.remove(['maskMove', 'contextMenu', 'edit'], 'widgetAdd'))
			};

			// Also listen for broadcasts from child controls such as the 'Add widget' button on empty containers
			$scope.$on('mg.mgFormEditor.widgetAdd', (e, direction, widget) => $ctrl.widgetAdd(direction, widget));


			/**
			* Finalize the state of $ctrl.widgetAddDetails and make the object
			* @param {Object} props props to merge with $ctrl.widgetAddDetails before submission
			*/
			$ctrl.widgetAddSubmit = function(props) {
				angular.merge($ctrl.widgetAddDetails, props);

				// Locate node we are adding above / below
				var node = TreeTools.find($ctrl.config, {id: $ctrl.widgetAddDetails.id}, {childNode: 'items'});
				if (!node) return console.error('Asked to create a widget around non-existant ID', $ctrl.widgetAddDetails); // Can't find element anyway
				var nodeParent = TreeTools.parents($ctrl.config, {id: $ctrl.widgetAddDetails.id}, {childNode: 'items'}).slice(-2).slice(0, 1)[0];
				var nodeIndex = nodeParent.items.findIndex(i => i.id == node.id);

				// Insert new widget into parents items collection
				var prototypeWidget = {
					type: $ctrl.widgetAddDetails.type,
					title: $macgyver.widgets[$ctrl.widgetAddDetails.type].title, // Set a default title
				};

				switch ($ctrl.widgetAddDetails.direction) {
					case 'above':
						//if inserting above an index 0, need to ensure index is not -ve
						var insertedIndex = (nodeIndex - 1) < 0 ? 0 : nodeIndex - 1;
						//actually insert the prototypeWidget
						nodeParent.items.splice(insertedIndex, 0, prototypeWidget);
						$ctrl.modal.hide().then(()=> $ctrl.widgetEdit(nodeParent.items[insertedIndex]));
						break;
					case 'below':
						//Insert below the current widget (increment by 1)
						var insertedIndex = nodeIndex + 1;
						//actually insert the prototypeWidget
						nodeParent.items.splice(insertedIndex, 0, prototypeWidget);
						$ctrl.modal.hide().then(()=> $ctrl.widgetEdit(nodeParent.items[insertedIndex]));
						break;
					case 'inside':
						// FIXME: push on undefined? Adding an input widget to an `mgContainer` within an `mgGridRow`.
						node.items.push(prototypeWidget);
						$ctrl.modal.hide().then(()=> $ctrl.widgetEdit(node.items[node.items.length-1]));
						break;
				}

				$scope.$broadcast('mg.mgFormEditor.change');
				$scope.$emit('mg.mgFormEditor.added');
			};

			$ctrl.widgetFilter = widget => widget.userPlaceable && (!$ctrl.category || widget.category == $ctrl.category);
			// }}}

			// Widget Editing {{{
			$ctrl.isInserter; // The user is hovering over a meta-inserter widget
			$ctrl.insertPosition; // If !!$ctrl.isInserter this is where to actually make the new element
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
					$ctrl.widgetName = ' - ' + node.type.replace(/^mg/i, '')
						.replace(/([A-Z])/g, ' $1').trim();
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
								.filter(i => // editable defaults to true for all cases unless the ID is `items` in which case it has to be explicit
									!_.isUndefined(i.editable) ? i.editable
									: i.id != 'items'
								)
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
					]
						.filter(widget => widget.type != 'mgContainer' || widget.items.length > 0), // Remove empty containers
				};

				return $q.resolve()
					.then(()=> $ctrl.locks.add(['maskMove', 'contextMenu', 'edit'], 'widgetEdit'))
					.then(()=> $macgyver.widgets[node.type] && !$macgyver.widgets[node.type].nonEditableWidget && $ctrl.modal.show('modal-mgFormEditor-edit'))
					.then(()=> $ctrl.locks.remove(['maskMove', 'contextMenu', 'edit'], 'widgetEdit'))
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

			// Edit mask {{{
			// React to mouse movement
			$element.on('mousemove', event => $scope.$apply(()=> {
				if ($ctrl.locks.check('maskMove')) return;
				var mouse = {left: event.clientX, top: event.clientY};

				var matching =
					angular.element('.mgComponent, .mgComponentEditorInserter')
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

				if (matching) { // Has widget disabled Edit mask
					var widget = TreeTools.find($ctrl.config, {id: angular.element(matching.el).attr('data-path')}, {childNode: 'items'});
					if (widget && $macgyver.widgets[widget.type].skipMask) {
						return;
					}
				}

				if (matching) {
					$ctrl.isInserter = angular.element(matching.el).hasClass('mgComponentEditorInserter');
					$element.children('.mgFormEditor-mask')
						.removeClass('mgFormEditor-mask-editor mgFormEditor-mask-inserter')
						.addClass($ctrl.isInserter ? 'mgFormEditor-mask-inserter' : 'mgFormEditor-mask-editor')
						.css({
							left: matching.rect.left + _.get($macgyver.settings, 'mgFormEditor.maskPosition.left', 0),
							top: matching.rect.top + _.get($macgyver.settings, 'mgFormEditor.maskPosition.top', 0),
							width: matching.rect.width + _.get($macgyver.settings, 'mgFormEditor.maskPosition.width', 0),
							height: matching.rect.height + _.get($macgyver.settings, 'mgFormEditor.maskPosition.height', 0),
							display: 'block',
						})

					if ($ctrl.isInserter) {
						$ctrl.selectedWidget = undefined;
						$ctrl.insertPosition = angular.element(matching.el);
					} else {
						$ctrl.selectedWidget = TreeTools.find($ctrl.config, {id: angular.element(matching.el).attr('data-path')}, {childNode: 'items'});
						$ctrl.insertPosition = undefined;
					}
				} else {
					$ctrl.selectedWidget = null;
				}
			}));

			// Hide the mask when scrolling
			if (_.get($macgyver.settings, 'mgFormEditor.scroller') !== false) { // Bind to scrollable element?
				angular.element(_.get($macgyver.settings, 'mgFormEditor.scroller') || document).on('scroll', ()=> {
					$element.children('.mgFormEditor-mask').css('display', 'none');
					$scope.$apply(()=> $ctrl.selectedWidget = null);
				})

				if (_.has($macgyver.settings, 'mgFormEditor.scroller')) { // Are we using a non-body scroller?
					// Bind to the editing mask to detect wheel events - when we find them destroy the mask so future wheels get forwarded to the scroll element
					$element.children('.mgFormEditor-mask')[0].addEventListener('wheel', ()=> {
						$element.children('.mgFormEditor-mask').css('display', 'none');
						$scope.$apply(()=> $ctrl.selectedWidget = null);
					});
				}
			}

			// When opening / closing dropdowns disable the mask from moving
			$element.on('show.bs.dropdown', ()=> { $scope.$apply(()=> $ctrl.locks.add(['maskMove', 'edit'], 'dropdown')) });
			$element.on('hide.bs.dropdown', ()=> { $scope.$apply(()=> $ctrl.locks.remove(['maskMove', 'edit'], 'dropdown')) });

			// React to mouse clicking
			$element.on('mousedown', function(event) {
				if (angular.element(event.target).closest('a').length) return; // User was probably clicking on a button - don't handle this internally

				var elem = angular.element(this);
				if (elem.closest('.modal').length) return; // Don't react when the element is inside a modal

				if (!$ctrl.locks.check('edit') && $ctrl.selectedWidget && event.button == 0) { // Left mouse click on widget - edit widget under cursor
					event.stopPropagation();
					$scope.$apply(()=> $ctrl.widgetEdit());
				} else if ($ctrl.isInserter && event.button == 0) { // Left mouse click on inserter meta-widget
					$ctrl.insertPosition.trigger('click');
				}
			});

			// React to right mouse menu clicking
			$element.on('contextmenu', function(event) {
				if (!$ctrl.locks.check('contextMenu')) return;

				event.stopPropagation();
				event.preventDefault();

				if (!$ctrl.selectedWidget) return;
				$element.find('.mgFormEditor-mask > .mgFormEditor-mask-buttons .dropdown-toggle').dropdown('toggle');
			});
			// }}}

			// Generate IDs for every widget {{{
			$ctrl.recalculateIds = ()=> {
				$ctrl.config = $macgyver.neatenSpec($ctrl.config);
			};

			// Recalc if spec deeply changes
			$scope.$watch('$ctrl.config', ()=> $ctrl.recalculateIds(), true);
			// }}}

			// Verbs {{{
			$ctrl.verbs = {dropdown: [], buttonsLeft: [], buttonsRight: []}; // All get popuulated via $ctrl.recalculateVerbs()

			$ctrl.recalculateVerbs = ()=> {
				Object.assign($ctrl.verbs, _.mapValues($ctrl.verbs, (junk, verbArea) =>
					// Flatten all properties down, if they are a function use the return value of that function
					$macgyver.settings.mgFormEditor.verbs[verbArea]
						.filter(verb =>
							(!verb.selectedWidgetOnly || (verb.selectedWidgetOnly && $ctrl.selectedWidget)) // Selected widget filtering
							&& (!verb.show || verb.show($ctrl.selectedWidget, $ctrl.config)) // Show function? Use it to determine filtering
						)
						.map(verb => _.mapValues(verb, (v, k) => {
							if (_.isFunction(v) && k != 'action') { // Translate all functions EXCEPT action
								return v($ctrl.selectedWidget);
							} else {
								return v;
							}
						}))
				));
			};

			// Recalc if focus changes or the verb list changes
			$scope.$watchGroup(['$ctrl.$macgyver.settings.mgFormEditor.verbs', '$ctrl.selectedWidget.id'], ()=> $ctrl.recalculateVerbs());


			/**
			* Execute a verb action
			* The action can be a function - in which case it is executed as ({$ctrl.selectedWidget, verb})
			* or a string
			* @param {Object|function|string} verb The verb to execute, if this is a function it is exected as (widget, verb)
			*/
			$ctrl.verbAction = verb => {
				if (angular.isFunction(verb.action)) {
					verb.action($ctrl.selectedWidget, verb);
				} else {
					var action = _.isObject(verb) && verb.action ? verb.action : verb;

					switch (action) {
						case 'add': $ctrl.widgetAdd(); break;
						case 'edit': $ctrl.widgetEdit(); break;
						case 'delete': $ctrl.widgetDelete(); break;
						case 'pasteTsv': $ctrl.widgetPaste($ctrl.selectedWidget, 'TSV'); break;
						case 'pasteJson': $ctrl.widgetPaste($ctrl.selectedWidget, 'JSON'); break;
						case 'duplicateCell': $ctrl.widgetDuplicateCell(); break;
						case 'dropdown':
							// FIXME: Not yet working
							$element.find('.mgFormEditor-mask-buttons .dropdown-toggle')
								.attr('data-toggle', 'dropdown') // Have to set this for Bootstrap'py reasons
								.dropdown();

							console.log('DD DONE');
							break;
						default:
							throw new Error(`Unknown or unsupported verb action: "${action}"`);
					}
				}

				// Recalculate dropdown after all actions
				$ctrl.recalculateVerbs();
			};
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

			// Utility > Modals {{{
			$ctrl.modal = {
				/**
				* Show a Bootstrap modal, resolving a promise when the modal has been closed
				* NOTE: Because of Bootstraps *interesting* way of dealing with modal windows, this promise will call $ctrl.modal.hide() (i.e. hide all modals) before attempting to show
				* @param {string} id The DOM ID of the modal to show
				* @returns {Promise} Resolves when the modal is ready
				*/
				show: id => $q(resolve => {
					var query = '#' + id;
					if (angular.element(query).is(':visible').length) return resolve(); // Element is already shown

					$ctrl.modal.hide()
						.then(()=> {
							angular.element(query)
								.one('hidden.bs.modal', ()=> resolve())
								.modal('show');
						});
				}),

				/**
				* Hide a Bootstrap modal, resolving a promise when the modal is hidden
				* @param {string} [id] The DOM ID of the modal to hide, if omitted all modals are hidden
				* @returns {Promise} Resolves when the modal / all models are closed, never rejects
				*/
				hide: id => $q(resolve => {
					var query = id ? `#${id}` : '.modal';
					if (!angular.element(query).is(':visible')) return resolve(); // Element(s) is/are already hidden

					angular.element(query)
						.one('hidden.bs.modal', ()=> resolve())
						.modal('hide')
				}),
			};
			// }}}

			// Utility > Locks {{{
			$ctrl.locks = {
				/**
				* Internal lock storage
				* @var {Object <Set>}
				*/
				_locks: {},

				/**
				* Add an item to a named lock set(s)
				* @param {string|array} lock The locking set(s) to add to
				* @param {string|array} id The ID of the lock to add
				*/
				add: (lock, id) => {
					_.castArray(lock).forEach(l => {
						if (!$ctrl.locks._locks[l]) $ctrl.locks._locks[l] = new Set();
						_.castArray(id).forEach(i => $ctrl.locks._locks[l].add(i));
					});
				},

				/**
				* Remove an item from a lock set(s)
				* @param {string|array} lock The locking set(s) to remove from
				* @param {string|array} id The ID of the lock to remove
				*/
				remove: (lock, id) => {
					_.castArray(lock).forEach(l => {
						if (!$ctrl.locks._locks[l]) return;  // Lock is empty anyway
						_.castArray(id).forEach(i => $ctrl.locks._locks[l].delete(i));
					});
					return $ctrl;
				},

				/**
				* Query if a given lock has any entities
				* @param {string} lock The lock to query
				* @returns {boolean} True if the lock has any entities
				*/
				check: lock => $ctrl.locks._locks[lock] && $ctrl.locks._locks[lock].size > 0,
			};
			// }}}

		},
	})
