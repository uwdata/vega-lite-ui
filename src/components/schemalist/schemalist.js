'use strict';

angular.module('vlui')
  .directive('schemaList', function() {
    return {
      templateUrl: 'components/schemalist/schemalist.html',
      restrict: 'E',
      scope: {
        orderBy: '<',
        fieldDefs: '<',
        showAdd: '<'
      },
      replace: true
    };
  });
