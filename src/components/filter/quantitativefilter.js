'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:fieldInfo
 * @description
 * # fieldInfo
 */
angular.module('vlui')
  .directive('quantitativeFilter', function (Dataset, Logger) {
    return {
      templateUrl: 'components/filter/quantitativefilter.html',
      restrict: 'E',
      replace: false,
      scope: {
        field: '=',
        filter: '='
      },
      link: function(scope) {
        var domain = Dataset.schema.domain({field: scope.field});
        scope.domainMin = domain[0];
        scope.domainMax = domain[1];

        // don't update until range slider handle released
        scope.localMin = scope.filter.range[0];
        scope.localMax = scope.filter.range[1];
        scope.updateRange = function() {
          scope.filter.range[0] = scope.localMin;
          scope.filter.range[1] = scope.localMax;
          scope.$apply(); // Force watcher to observe change
          Logger.logInteraction(Logger.actions.FILTER_CHANGE, scope.field, scope.filter);
        };

        if (Dataset.schema.type(scope.field) === 'temporal') {
          // convert dates to numerical types
          scope.domainMin = (new Date(scope.domainMin)).getTime();
          scope.domainMax = (new Date(scope.domainMax)).getTime();
        }
      }
    };
  });

// for formatting dates according to the selected timeUnit (just for display purposes)
angular.module('vlui')
  .filter('timeUnitFilter', function() {
    return function(dateNumber) {
      var date = new Date(dateNumber);
      return date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate();
    };
  });
