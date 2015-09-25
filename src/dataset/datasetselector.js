'use strict';

angular.module('vlui')
  .directive('datasetSelector', function(Drop, Dataset, Config, Logger) {
    return {
      templateUrl: 'dataset/datasetselector.html',
      restrict: 'E',
      replace: true,
      scope: {},
      link: function postLink(scope , element/*, attrs*/) {
        scope.Dataset = Dataset;

        scope.datasetChanged = function() {
          if (!Dataset.dataset) {
            // reset if no dataset has been set
            Dataset.dataset = Dataset.currentDataset;
            funcsPopup.open();
            return;
          }

          Logger.logInteraction(Logger.actions.DATASET_CHANGE, Dataset.dataset.name);

          Dataset.update(Dataset.dataset).then(function() {
            Config.updateDataset(Dataset.dataset, Dataset.type);
          });
        };

        scope.doneAdd = function() {
          funcsPopup.close();
        };

        var funcsPopup = new Drop({
          content: element.find('.popup-new-dataset')[0],
          target: document.body,
          position: 'top left',
          openOn: false
        });

        scope.$on('$destroy', function() {
          funcsPopup.destroy();
          funcsPopup = null;
        });
      }
    };
  });
