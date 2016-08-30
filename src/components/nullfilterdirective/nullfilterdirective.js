'use strict';

/**
 * @ngdoc directive
 * @name polestar.directive:nullFilterDirective
 * @description
 * # nullFilterDirective
 */
angular.module('vlui')
  .directive('nullFilterDirective', function () {
    return {
      templateUrl: 'components/nullfilterdirective/nullfilterdirective.html',
      restrict: 'E',
      scope: {
        spec: '='
      }
    };
  });