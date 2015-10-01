'use strict';

/**
 * @ngdoc filter
 * @name vega-lite-ui.filter:underscore2space
 * @function
 * @description
 * # underscore2space
 * Filter in the vega-lite-ui.
 */
angular.module('vlui').filter('underscore2space', [
  function () {
    return function (input) {
      return input ? input.replace(/_+/g, ' ') : '';
    };
  }
]);
