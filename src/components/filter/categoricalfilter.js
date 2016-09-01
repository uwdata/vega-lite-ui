'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:fieldInfo
 * @description
 * # fieldInfo
 */
angular.module('vlui')
  .directive('categoricalFilter', function (Dataset, vg, util, Logger) {
    return {
      templateUrl: 'components/filter/categoricalfilter.html',
      restrict: 'E',
      replace: true,
      scope: {
        field: '=',
        filter: '='
      },
      link: function(scope) {
        scope.values = [];
        scope.include = {};

        scope.selectAll = selectAll;
        scope.selectNone = selectNone;
        scope.keepOnly = keepOnly;
        scope.stringify = JSON.stringify;

        scope.filterChange = function() {
          Logger.logInteraction(Logger.actions.FILTER_CHANGE, scope.field, scope.filter);
        };

        function selectAll() {
          setInclude(scope.values);
          scope.filterChange();
        }

        function selectNone() {
          setInclude([]);
          scope.filterChange();
        }

        function keepOnly(onlyValue) {
          setInclude([onlyValue]);
          scope.filterChange();
        }

        function setInclude(list) {
          scope.include = list.reduce(function(include, x) {
            include[JSON.stringify(x)] = true;
            return include;
          }, {});
        }

        scope.$watch('field', function(field) {
          scope.values = Dataset.schema.domain({field: field});
        });

        scope.$watch('filter', function(filter) {
          setInclude(filter.in);
        });

        scope.$watch('include', function(include) {
          scope.filter.in = util.keys(include).filter(function(val) {
            return include[val];
          }).map(function(x) {
            return JSON.parse(x);
            // if (+x === +x) { return +x; }
            // return x;
          }).sort(vg.util.cmp); // Use Vega
        }, true);
      }
    };
  });
