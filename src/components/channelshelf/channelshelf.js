'use strict';

angular.module('vlui')
  .directive('channelShelf', function(ANY, Dataset, Pills, _, Drop, Logger, vl, Schema) {
    return {
      templateUrl: 'components/channelshelf/channelshelf.html',
      restrict: 'E',
      replace: true,
      scope: {
        channelId: '=',
        encoding: '=',
        mark: '='
      },
      link: function(scope, element /*, attrs*/) {
        var propsPopup, funcsPopup;

        // TODO(https://github.com/vega/vega-lite-ui/issues/187):
        // consider if we can use validator / cql instead
        scope.allowedCasting = {
          quantitative: [vl.type.QUANTITATIVE, vl.type.ORDINAL, vl.type.NOMINAL],
          ordinal: [vl.type.ORDINAL, vl.type.NOMINAL],
          nominal: [vl.type.NOMINAL, vl.type.ORDINAL],
          temporal: [vl.type.TEMPORAL, vl.type.ORDINAL, vl.type.NOMINAL]
        };

        scope.Dataset = Dataset;
        scope.schema = Schema.getChannelSchema(scope.channelId);
        scope.isAnyChannel = false;
        scope.pills = Pills.pills;

        scope.supportMark = function(channelId, mark) {
          if (Pills.isAnyChannel(channelId)) {
            return true;
          }
          if (mark === ANY) { // TODO: support {values: [...]}
            return true;
          }
          return vl.channel.supportMark(channelId, mark);
        };

        propsPopup = new Drop({
          content: element.find('.shelf-properties')[0],
          target: element.find('.shelf-label')[0],
          position: 'bottom left',
          openOn: 'click'
        });

        scope.fieldInfoPopupContent =  element.find('.shelf-functions')[0];

        scope.removeField = function() {
          Pills.remove(scope.channelId);
        };

        scope.fieldDragStart = function() {
          Pills.dragStart(Pills.get(scope.channelId), scope.channelId);
        };

        scope.fieldDragStop = function() {
          Pills.dragStop();
        };

        /**
         * Event handler for dropping pill.
         */
        scope.fieldDropped = function() {
          var pill = Pills.get(scope.channelId);
          if (funcsPopup) {
            funcsPopup = null;
          }

          // validate type
          var types = Schema.schema.definitions.Type.enum;
          if (!_.includes(types, pill.type)) {
            // if existing type is not supported
            pill.type = types[0];
          }

          // TODO validate timeUnit / aggregate

          Pills.dragDrop(scope.channelId);
          Logger.logInteraction(Logger.actions.FIELD_DROP, pill, pill);
        };

        scope.$watch('channelId', function(channelId) {
          scope.isAnyChannel = Pills.isAnyChannel(channelId);
        }, true);

        // If some external action changes the fieldDef, we also need to update the pill
        scope.$watch('encoding[channelId]', function(fieldDef) {
          Pills.set(scope.channelId, fieldDef ? _.cloneDeep(fieldDef) : {});
        }, true);

        scope.$watchGroup(['allowedCasting[Dataset.schema.type(encoding[channelId].field)]', 'encoding[channel].aggregate'], function(arr){
          var allowedTypes = arr[0], aggregate=arr[1];
          scope.allowedTypes = aggregate === 'count' ? [vl.type.QUANTITATIVE] : allowedTypes;
        });
      }
    };
  });
