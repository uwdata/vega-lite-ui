'use strict';

/**
 * @ngdoc service
 * @name vlui.VlModals
 * @description
 * # VlModals
 * Service used to control modal visibility from anywhere in the application
 */
angular.module('vlui')
  .factory('VlModals', function ($cacheFactory) {

    // TODO: The use of scope here as the method by which a modal directive
    // is registered and controlled may need to change to support retrieving
    // data from a modal as may be needed in #77
    var modalsCache = $cacheFactory('vl-modals');

    // Public API
    return {
      register: function(id, scope) {
        if (modalsCache.get(id)) {
          console.error('Cannot register two modals with id ' + id);
          return;
        }
        modalsCache.put(id, scope);
      },

      deregister: function(id) {
        modalsCache.remove(id);
      },

      // Open a modal
      open: function(id) {
        var modalScope = modalsCache.get(id);
        if (!modalScope) {
          console.error('Unknown modal id ' + id);
          return;
        }
        modalScope.isOpen = true;
      },

      // Close a modal
      close: function(id) {
        var modalScope = modalsCache.get(id);
        if (!modalScope) {
          console.error('Unknown modal id ' + id);
          return;
        }
        modalScope.isOpen = false;
      },

      count: function() {
        return modalsCache.info().size;
      }
    };
  });
