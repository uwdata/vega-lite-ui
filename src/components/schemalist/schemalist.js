'use strict';

angular.module('vlui')
  .directive('schemaList', function(vl) {
    return {
      templateUrl: 'components/schemalist/schemalist.html',
      restrict: 'E',
      scope: {
        orderBy: '<',
        fieldDefs: '<',
        showAdd: '<',
        showCount: '<'
      },
      replace: true,
      link: function(scope) {
        scope.countFieldDef = {field: '*', aggregate: vl.aggregate.AggregateOp.COUNT, type: vl.type.QUANTITATIVE};
      }
    };
  });
