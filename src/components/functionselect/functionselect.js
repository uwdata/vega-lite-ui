'use strict';

angular.module('vlui')
  .directive('functionSelect', function(_, consts, vl, Pills, Logger, Schema) {
    return {
      templateUrl: 'components/functionselect/functionselect.html',
      restrict: 'E',
      scope: {
        channelId: '=',
        fieldDef: '='
      },
      link: function(scope /*,element, attrs*/) {
        var BIN='bin', COUNT='count', maxbins;

        scope.func = {
          selected: undefined,
          list: {
            aboveFold: [],
            belowFold: [] // could be empty
          }
        };

        // timeUnits for T
        var timeUnits = {
          aboveFold: [
            undefined,
            'yearmonthdate', 'year', 
            'quarter', 'month', 
            'date','day', 
            'hours', 'minutes', 
            'seconds', 'milliseconds'
          ],
          belowFold: [
            'yearquarter',
            'yearmonth',
            'yearmonthdatehours',
            'yearmonthdatehoursminutes',
            'yearmonthdatehoursminutesseconds',
            'hoursminutes',
            'hoursminutesseconds',
            'minutesseconds', 
            'secondsmilliseconds'
          ]
        }

        // aggregations for Q
        var aggregations = {
          aboveFold: [
            undefined,
            'min', 'max',
            'median', 'mean',
            'sum' // bin is here
          ],
          belowFold: [
            'missing', 'valid',
            'distinct', 'modeskew',
            'q1', 'q3',
            'stdev', 'stdevp',
            'variance', 'variancep'
          ] // there is no 'count' for Q
        };

        function getTimeUnits(type) {
          if (type === 'temporal') {
            if (!timeUnits.all || timeUnits.all.length <= 0) {
              timeUnits.all = timeUnits.aboveFold.concat(timeUnits.belowFold);
            }
            return timeUnits.all;
          }
          return [];
        }

        function getAggregations(type) {
          if(!type) {
            return [COUNT];
          }

          // HACK
          // TODO: make this correct for temporal as well
          if (type === 'quantitative' ){
            if (!aggregations.all || aggregations.all.length <= 0) {
              aggregations.all = aggregations.aboveFold.concat(aggregations.belowFold);
            }
            return aggregations.all;
          }
          return [];
        }

        scope.selectChanged = function() {
          Logger.logInteraction(Logger.actions.FUNC_CHANGE, scope.func.selected);
        };

        // FIXME func.selected logic should be all moved to selectChanged
        // when the function select is updated, propagates change the parent
        scope.$watch('func.selected', function(selectedFunc) {
          var oldPill = Pills.get(scope.channelId),
            pill = _.clone(oldPill),
            type = pill ? pill.type : '';

          if(!pill){
            return; // not ready
          }

          // reset field def
          // HACK: we're temporarily storing the maxbins in the pill
          pill.bin = selectedFunc === BIN ? true : undefined;
          pill.aggregate = getAggregations(type).indexOf(selectedFunc) !== -1 ? selectedFunc : undefined;
          pill.timeUnit = getTimeUnits(type).indexOf(selectedFunc) !== -1 ? selectedFunc : undefined;

          if(!_.isEqual(oldPill, pill)){
            Pills.set(scope.channelId, pill, true /* propagate change */);
          }
        });

        // when parent objects modify the field
        scope.$watch('fieldDef', function(pill) {
          if (!pill) {
            return;
          }

          var type = pill.field ? pill.type : '';

          // hack: save the maxbins
          if (pill.bin) {
            maxbins = pill.bin.maxbins;
          }

          var isOrdinalShelf = ['row','column','shape'].indexOf(scope.channelId) !== -1,
            isQ = type === vl.type.QUANTITATIVE,
            isT = type === vl.type.TEMPORAL;

          if(pill.field === '*' && pill.aggregate === COUNT){
            scope.func.list.aboveFold=[COUNT];
            scope.func.selected = COUNT;
          } else {
            scope.func.list.aboveFold = [].concat( isT ? timeUnits.aboveFold : [] )
              .concat( isQ ? aggregations.aboveFold : [] )
              // TODO: check supported type based on primitive data?
              .concat( isQ ? ['bin'] : []);

            scope.func.list.belowFold = [].concat( isT ? timeUnits.belowFold : [])
              .concat( isQ ? aggregations.belowFold : [] );

            var defaultVal = (isOrdinalShelf &&
              (isQ && BIN) || (isT && consts.defaultTimeFn)
            ) || undefined;

            var selected = pill.bin ? 'bin' :
              pill.aggregate || pill.timeUnit;

            if (scope.func.list.aboveFold.indexOf(selected) >= 0 || scope.func.list.belowFold.indexOf(selected) >= 0) {
              scope.func.selected = selected;
            } else {
              scope.func.selected = defaultVal;
            }

          }
        }, true);
      }
    };
  });
