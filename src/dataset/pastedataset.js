'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:pasteDataset
 * @description
 * # pasteDataset
 */
angular.module('vlui').directive('pasteDataset', [
  'Dataset', 'Alerts', 'Logger', 'Config', '_', 'dl',
  function (Dataset, Alerts, Logger, Config, _, dl) {
    return {
      templateUrl: 'dataset/pastedataset.html',
      restrict: 'E',
      replace: true,
      scope: false,  // use scope from datasetSelector
      link: function postLink(scope/*, element, attrs*/) {
        scope.datasetName = '';
        scope.data = '';

        // need to give this a unique name because we share the namespace
        scope.addPasted = function() {
          var data = dl.read(scope.data, {type: 'csv'});

          var dataset = {
            id: Date.now(),  // time as id
            name: scope.datasetName,
            values: data,
            group: 'pasted'
          };

          Dataset.dataset = Dataset.add(angular.copy(dataset));
          scope.datasetChanged();

          scope.datasetName = '';
          scope.data = '';

          Logger.logInteraction(Logger.actions.DATASET_NEW_PASTE, dataset.name);

          scope.doneAdd();
        };
      }
    };
  }
]);
