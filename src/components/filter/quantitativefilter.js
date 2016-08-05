'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:fieldInfo
 * @description
 * # fieldInfo
 */
angular.module('vlui')
  .directive('quantitativeFilter', function (Dataset) {
    return {
      templateUrl: 'components/filter/quantitativefilter.html',
      restrict: 'E',
      replace: false,
      scope: {
        field: '=',
        filter: '='
      },
      link: function(scope, element) {
        scope.domainMin = 0;
        scope.domainMax = 100;
        scope.$watch('field', function(field) {
          var domain = Dataset.domain(field);
          scope.domainMin = domain[0];
          scope.domainMax = domain[1];
        });
      }
    };
  });
