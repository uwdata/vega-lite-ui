'use strict';

angular.module('vlui').filter('compactJSON', [
  function() {
    return function(input) {
      return JSON.stringify(input, null, '  ', 80);
    };
  }
]);
