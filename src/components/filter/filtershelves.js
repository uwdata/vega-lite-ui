'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:fieldInfo
 * @description
 * # fieldInfo
 */
angular.module('vlui')
  .directive('filterShelves', function (FilterManager, Dataset) {
    return {
      templateUrl: 'components/filter/filtershelves.html',
      restrict: 'E',
      replace: false,
      scope: {
        spec: '='
      },
      link: function(scope) {
        scope.Dataset = Dataset;
        scope.filterManager = FilterManager;
        scope.clearFilter = clearFilter;
        scope.removeFilter = removeFilter;

        function clearFilter() {
          FilterManager.reset();
        }

        function removeFilter(field) {
          FilterManager.toggle(field);
        }
      }
    };
  });
