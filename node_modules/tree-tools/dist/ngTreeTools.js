"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

angular.module('ngTreeTools', []).service('TreeTools', function () {
  var treeTools;
  return treeTools = {
    /**
    * Find a single node deeply within a tree structure
    * This method is really just a convenience wrapper around parents(tree, query, {limit: 1})
    * @param {Object|array} tree The tree structure to search (assumed to be a collection)
    * @param {Object|function} query A valid Lodash query to run (anything valid via _.find()) or a matching function to be run on each node
    * @param {Object} [options] Optional options object passed to parents() finder
    * @return {array|undefined} A generation list of all parents decending to the found item
    */
    find: function find(tree, query, options) {
      var settings = _.defaults(options, {
        limit: 1
      });

      var generations = this.parents(tree, query, settings);
      return _.isArray(generations) ? _.last(generations) : undefined;
    },

    /**
    * Return a copy of the tree with all non-matching nodes removed
    *
    * NOTE: This function seeks downwards, so any parent that does not match will also omit its child nodes
    *
    * @param {Object|array} tree The tree structure to search (assumed to be a collection)
    * @param {Object|function} query A valid Lodash query to run (anything valid via _.find()) or a matching function to be run on each node
    * @param {Object} [options] Options object
    * @param {array|string} [options.childNode="children"] Node or nodes to examine to discover the child elements
    */
    filter: function filter(tree, query, options) {
      var compiledQuery = _.isFunction(query) ? query : _.matches(query);

      var settings = _.defaults(options, {
        childNode: ['children']
      });

      settings.childNode = _.castArray(settings.childNode);

      var seekDown = function seekDown(tree) {
        return tree.filter(function (branch, index) {
          return compiledQuery(branch, index);
        }).map(function (branch) {
          settings.childNode.some(function (key) {
            if (_.has(branch, key)) {
              if (_.isArray(branch[key])) {
                branch[key] = seekDown(branch[key]);
              } else {
                delete branch[key];
              }
            }
          });
          return branch;
        });
      };

      if (_.isArray(tree)) {
        return seekDown(tree, []) || [];
      } else {
        return seekDown([tree], [])[0] || {};
      }
    },

    /**
    * Return all branches of a tree as a flat array
    * The return array with be a depth-first-search i.e. the order of the elements will be deepest traversal at each stage (so don't expact all root keys to be listed first)
    * @param {Object|array} tree The tree structure to search (assumed to be a collection)
    * @param {Object} [options] Options object passed to parents() finder
    * @param {array|string} [options.childNode="children"] Node or nodes to examine to discover the child elements
    * @return {Object|array} An array of all elements
    */
    flatten: function flatten(tree, options) {
      var settings = _.defaults(options, {
        childNode: ['children']
      });

      settings.childNode = _.castArray(settings.childNode);
      var seekStack = [];

      var seekDown = function seekDown(tree) {
        tree.forEach(function (branch) {
          seekStack.push(branch);
          settings.childNode.some(function (key) {
            if (branch[key] && _.isArray(branch[key])) seekDown(branch[key]);
          });
        });
      };

      seekDown(_.castArray(tree));
      return seekStack;
    },

    /**
    * Utility function to deep search a tree structure for a matching query and find parents up to the given query
    * If found this function will return an array of all generations with the found branch as the last element of the array (i.e. root -> grandchildren order)
    * @param {Object|array} tree The tree structure to search
    * @param {Object|function} query A valid Lodash query to run (anything valid via _.find()) or a matching function to be run on each node
    * @param {Object} [options] Optional options object
    * @param {array|string} [options.childNode="children"] Node or nodes to examine to discover the child elements
    * @return {array} A generation list of all parents decending to the found item
    */
    parents: function parents(tree, query, options) {
      var compiledQuery = _.isFunction(query) ? _.noop : _.matches(query);
      var seekStack = [];

      var settings = _.defaults(options, {
        childNode: ['children']
      });

      settings.childNode = _.castArray(settings.childNode);

      var seekDown = function seekDown(tree) {
        var foundChild = _.find(tree, _.isFunction(query) ? query : compiledQuery);

        if (foundChild) {
          seekStack.unshift(foundChild);
          return true;
        } else {
          return tree.some(function (branch) {
            var walkedStack = false;
            settings.childNode.some(function (key) {
              // Walk down first found childNode entry
              if (branch[key] && _.isArray(branch[key]) && seekDown(branch[key])) {
                // Found a valid key - stop iterating over possible key names
                seekStack.unshift(branch);
                walkedStack = true;
                return true;
              }
            });
            return walkedStack;
          });
        }
      };

      seekDown(_.castArray(tree));
      return seekStack;
    },

    /**
    * Utility function to deep search a tree structure for a matching query and find all children after the given query
    * If found this function will return an array of all child elements NOT including the query element
    * @param {Object|array} tree The tree structure to search (assumed to be a collection)
    * @param {Object|function|null} [query] A valid Lodash query to run (anything valid via _.find()) or a callback function. If null the entire flattened tree is returned
    * @param {Object} [options] Optional options object
    * @param {array|string} [options.childNode="children"] Node or nodes to examine to discover the child elements
    * @return {array} An array of all child elements under that item
    */
    children: function children(tree, query, options) {
      var compiledQuery = query ? _.matches(query) : null;

      var settings = _.defaults(options, {
        childNode: ['children']
      });

      settings.childNode = _.castArray(settings.childNode);
      var rootNode = query ? treeTools.find(tree, query) : tree;
      var seekStack = [];

      var seekDown = function seekDown(branch, level) {
        if (level > 0) seekStack.push(branch);
        settings.childNode.some(function (key) {
          if (branch[key] && _.isArray(branch[key])) {
            branch[key].forEach(function (branchChild) {
              seekDown(branchChild, level + 1);
            });
            return true;
          }
        });
      };

      seekDown(rootNode, 0);
      return seekStack;
    },

    /**
    * Utility function to determines whether a given node has children
    * @param {Object|array} branch The tree structure to search (assumed to be a collection)
    * @param {Object} [options] Optional options object
    * @param {array|string} [options.childNode="children"] Node or nodes to examine to discover the child elements
    * @return {array} An array of all child elements under that item
    */
    hasChildren: function hasChildren(branch, options) {
      var settings = _.defaults(options, {
        childNode: ['children']
      });

      return settings.childNode.some(function (key) {
        return branch[key] && _.isArray(branch[key]) && branch[key].length;
      });
    },

    /**
    * Utility function to deep scan a tree and return if any of it contains a matching element
    * This works the same as a deep version of the Lodash `_.has()` function combined with `some()`
    * This function will exit as soon as the first element matches
    * @param {Object|array} tree The tree structure to search
    * @param {Object|function} query A valid Lodash query to run
    * @return {boolean} Boolean indicating that at least one sub-element matches the query
    */
    hasSome: function hasSome(tree, query) {
      if (_.find(tree, query)) return true;
      if (_.isObject(tree)) return _.some(tree, function (i) {
        return treeTools.hasSome(i, query);
      });
    },

    /**
    * Recursively walk a tree evaluating all functions as promises and inserting their values
    * @param {array|Object} tree The tree structure to resolve
    * @param {Object} [options] Options object passed to parents() finder
    * @param {boolean} [options.clone=false] Clone the tree before resolving it, this keeps the original intact but costs some time while cloning, without this the input will be mutated
    * @param {array|string} [options.childNode="children"] Node or nodes to examine to discover the child elements
    * @param {boolean} [options.attempts=5] How many times to recurse when resolving promises-within-promises
    * @param {function} [options.isPromise=_.isFunction] Function used to recognise a promise-like return when recursing into promises
    * @param {boolean} [options.splice=true] Support splicing arrays (arrays are collapsed into their parents rather than returned as is)
    * @param {function} [options.isSplice] Function used to determine if a node should be spliced. Called as (node, path, tree). Default bechaviour is to return true if both the node and the parents are arrays - i.e. only support array -> object -> array striping not array -> array
    * @param {function} [options.wrapper=Promise.resolve] Wrap the promise in this function before resolving. Called as (nodeFunction, path, tree). Should return a promise or something that has 'then' compatibility
    * @return {Promise} A promise which will resolve with incomming tree object with all promises resolved
    */
    resolve: function resolve(tree, options) {
      var settings = _.defaults(options, {
        childNode: 'children',
        clone: false,
        attempts: 5,
        splice: true,
        isPromise: _.isFunction,
        isSplice: function isSplice(node, path, tree) {
          var parentNodePath = path.slice(0, -1);
          var parentNode = parentNodePath.length ? _.get(tree, parentNodePath) : tree; // For empty node paths return the main tree

          return _.isArray(node) && _.isArray(parentNode); // An array within an array?
        },
        wrapper: function wrapper(node) {
          return Promise.resolve(node());
        }
      });

      var base = settings.clone ? _.cloneDeep(tree) : tree;
      var dirty = true; // Whether we saw a node sweep return a function instead of a scalar - indicates a new sweep is required

      var splices = [];

      var resolver = function resolver(root, path) {
        var promiseQueue = [];

        _.forEach(root, function (child, childIndex) {
          if (_.isArray(child)) {
            // Scan children
            promiseQueue.push(resolver(child, path.concat([childIndex])));
          } else if (_.isPlainObject(child)) {
            // Scan an object
            promiseQueue.push(resolver(child, path.concat([childIndex])));
          } else if (_.isFunction(child)) {
            var nodePath = path.concat([childIndex]);
            promiseQueue.push(settings.wrapper(child, nodePath, base). // Wrap the function and expect it to return a promise
            then(function (res) {
              // Recursion - Does this look like a value that we should do another sweep though later?
              if (!dirty && _.isObject(res) && treeTools.hasSome(res, function (v) {
                return settings.isPromise(v);
              })) {
                dirty = true; // Returned a promise like object - mark sweep as dirty
              } // Set the tree path to the return value


              _.set(base, nodePath, res); // Does this value look like it should be spliced rather than set


              if (settings.splice && settings.isSplice(res, nodePath, base)) {
                splices.push(nodePath);
              }
            }));
          } // Everything else - leave alone as already resolved values

        });

        return Promise.all(promiseQueue);
      };

      return Promise.resolve().then(function () {
        return new Promise(function (resolve, reject) {
          // Loop the resolver until we are out of attempts
          var attemptNext = function attemptNext() {
            if (--settings.attempts > 0 && dirty) {
              dirty = false; // Mark sweep as clean - will get dirty if resolver sees a function return

              resolver(base, []).then(attemptNext);
            } else {
              resolve();
            }
          };

          attemptNext();
        });
      }).then(function () {
        // Resolve all splices
        if (!settings.splice) return;
        splices.reverse().forEach(function (path) {
          // Reverse the array paths so we can work from the end backwards when splicing to maintain the index offsets
          var spliceParentPath = path.slice(0, -1);
          var spliceParent = spliceParentPath.length ? _.get(base, spliceParentPath) : base;
          var spliceOffset = path[path.length - 1];
          spliceParent.splice.apply(spliceParent, [spliceOffset, 1].concat(_toConsumableArray(_.get(base, path))));
        });
        return null;
      }).then(function () {
        return base;
      });
    },

    /**
     * Utility function to sort tree by specific property or an array of properties
     * @param {array} tree The tree structure to sort
     * @param {array|string} propertyName Property names to sort the tree
     * @return {array} An array sorted by propertyName
     */
    sortBy: function sortBy(tree, propertyName) {
      var _this = this;

      // It is needed an array structure to sort.
      if (!_.isArray(tree)) tree = [tree];
      tree.forEach(function (item) {
        return _(item).keys().forEach(function (key) {
          if (_.isArray(item[key])) item[key] = _this.sortBy(item[key], propertyName);
        });
      });
      return _.sortBy(tree, propertyName);
    }
  };
});