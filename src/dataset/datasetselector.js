'use strict';

angular.module('vlui')
  .directive('datasetSelector', function(Dataset, Modals, Logger) {
    return {
      templateUrl: 'dataset/datasetselector.html',
      restrict: 'E',
      replace: true,
      scope: {},
      link: function postLink(scope/*, element, attrs*/) {
        scope.Dataset = Dataset;

        scope.loadData = function() {
          // reset if no dataset has been set
          Dataset.dataset = Dataset.currentDataset;
          Logger.logInteraction(Logger.actions.DATASET_OPEN);
          Modals.open('dataset-modal');
          return;
        };
        
        scope.datasetChanged = function() {
          if (!Dataset.dataset) {
            scope.loadData();
          }

          Dataset.update(Dataset.dataset);
        };
      }
    };
  });
