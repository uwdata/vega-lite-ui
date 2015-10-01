'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:bookmarkList
 * @description
 * # bookmarkList
 */
angular.module('vlui').directive('bookmarkList', [
  'Bookmarks', 'consts',
  function (Bookmarks, consts) {
    return {
      templateUrl: 'bookmarklist/bookmarklist.html',
      restrict: 'E',
      replace: true,
      scope: {
        active:'=',
        deactivate: '&',
        highlighted: '='
      },
      link: function postLink(scope, element, attrs) {
        // jshint unused:false
        scope.Bookmarks = Bookmarks;
        scope.consts = consts;
      }
    };
  }
]);
