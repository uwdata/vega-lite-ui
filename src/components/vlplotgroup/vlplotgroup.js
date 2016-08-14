'use strict';

/**
 * @ngdoc directive
 * @name vega-lite-ui.directive:visListItem
 * @description
 * # visListItem
 */
angular.module('vlui')
  .directive('vlPlotGroup', function (Bookmarks, consts, vg, vl, Dataset, Logger, _, Pills, Chart, $timeout) {
    return {
      templateUrl: 'components/vlplotgroup/vlplotgroup.html',
      restrict: 'E',
      replace: true,
      controller: function($scope, $element) {
        this.getDropTarget = function() {
          return $element.find('.fa-wrench')[0];
        };
      },
      scope: {
        /* pass to vlplot **/
        chart: '=',

        //optional
        disabled: '=',
        isInList: '=',

        alwaysScrollable: '=',
        configSet: '@',
        enablePillsPreview: '=',
        maxHeight: '=',
        maxWidth: '=',
        overflow: '=',
        priority: '=',
        rescale: '=',
        thumbnail: '=',
        tooltip: '=',

        /* vlplotgroup specific */

        /** Set of fieldDefs for showing field info.  For Voyager2, this might be just a subset of fields that are ambiguous. */
        fieldSet: '=',

        showBookmark: '@',
        showDebug: '=',
        showExpand: '=',
        showFilterNull: '@',
        showLabel: '@',
        showLog: '@',
        showSelect: '@',
        showSort: '@',
        showTranspose: '@',

        /** Whether the log / transpose sort cause side effect to the shelf  */
        toggleShelf: '=',

        alwaysSelected: '=',
        isSelected: '=',
        highlighted: '=',
        expandAction: '&',
        selectAction: '&'
      },
      link: function postLink(scope) {
        scope.Bookmarks = Bookmarks;
        scope.consts = consts;
        scope.hovered = false;

        // bookmark alert
        scope.showBookmarkAlert = false;
        scope.toggleBookmark = function(chart) {
          if (Bookmarks.isBookmarked(chart.shorthand)) {
            scope.showBookmarkAlert = !scope.showBookmarkAlert; // toggle alert
          }
          else {
            Bookmarks.add(chart);
          }
        };

        var hoverPromise = null;

        scope.fieldInfoMouseover = function(fieldDef) {
          scope.hovered = true;

          hoverPromise = $timeout(function() {
            (scope.highlighted||{})[fieldDef.field] = true;
            Logger.logInteraction(Logger.actions.FIELDDEF_HIGHLIGHTED, scope.chart.shorthand, {
              highlightedField: fieldDef.field
            });

            if (scope.enablePillsPreview) {
              Pills.preview(scope.chart.vlSpec);
            }
          }, 500);
        };

        scope.fieldInfoMouseout = function(fieldDef) {
          scope.hovered = false;

          if (hoverPromise) {
            // if we unhover within
            $timeout.cancel(hoverPromise);
          }
          hoverPromise = null;

          if ((scope.highlighted||{})[fieldDef.field]) {
            // disable preview if it's enabled
            Logger.logInteraction(Logger.actions.FIELDDEF_UNHIGHLIGHTED, scope.chart.shorthand, {
              highlightedField: fieldDef.field
            });

            (scope.highlighted||{})[fieldDef.field] = false;
            if (scope.enablePillsPreview) {
              Pills.preview(null);
            }
          }
        };

        scope.isFieldAny = function(chart, index) {
          if (chart.enumSpecIndex) {
            if (chart.enumSpecIndex.encodings && chart.enumSpecIndex.encodings[index] && chart.enumSpecIndex.encodings[index].field) {
              return true;
            }
          }
          return false;
        };

        scope.removeBookmark = function(chart) {
          Bookmarks.remove(chart);
          scope.showBookmarkAlert = false;
        };

        scope.keepBookmark = function() {
          scope.showBookmarkAlert = false;
        };

        // Defer rendering the debug Drop popup until it is requested
        scope.renderPopup = false;
        // Use _.once because the popup only needs to be initialized once
        scope.initializePopup = _.once(function() {
          scope.renderPopup = true;
        });

        scope.logCode = function(name, value) {
          console.log(name+':\n\n', JSON.stringify(value));
        };

        // TOGGLE LOG

        scope.log = {};
        scope.log.support = function(spec, channel) {
          if (!spec) { return false; }
          var encoding = spec.encoding,
            fieldDef = encoding[channel];

          return fieldDef && fieldDef.type === vl.type.QUANTITATIVE && !fieldDef.bin;
        };

        scope.log.toggle = function(spec, channel) {
          if (!scope.log.support(spec, channel)) { return; }

          var fieldDef = spec.encoding[channel],
            scale = fieldDef.scale = fieldDef.scale || {};

          if (scope.toggleShelf) {
            Pills.rescale(channel, scale.type === 'log' ? 'linear' : 'log');
          } else {
            scale.type = scale.type === 'log' ? 'linear' : 'log';
          }

          Logger.logInteraction(Logger.actions.LOG_TOGGLE, scope.chart.shorthand);
        };

        scope.log.active = function(spec, channel) {
          if (!scope.log.support(spec, channel)) { return; }

          var fieldDef = spec.encoding[channel],
            scale = fieldDef.scale;

          return scale && scale.type === 'log';
        };

        // TOGGLE FILTER
        // TODO: extract toggleFilterNull to be its own class

        scope.toggleFilterNull = function(spec) {
          Logger.logInteraction(Logger.actions.NULL_FILTER_TOGGLE, scope.chart.shorthand);

          spec.config = spec.config || {};
          spec.config.filterInvalid = spec.config.filterInvalid === true ? undefined : true;
        };

        scope.toggleFilterNull.support = function(spec) {
          var fieldDefs = vl.spec.fieldDefs(spec);
          for (var i in fieldDefs) {
            var fieldDef = fieldDefs[i];
            if (_.includes([vl.type.ORDINAL, vl.type.NOMINAL], fieldDef.type) && Dataset.schema.stats(fieldDef).missing > 0) {
              return true;
            }
          }
          return false;
        };

        // TOGGLE SORT
        // TODO: extract toggleSort to be its own class

        var toggleSort = scope.toggleSort = {};

        toggleSort.modes = ['ordinal-ascending', 'ordinal-descending',
          'quantitative-ascending', 'quantitative-descending', 'custom'];

        toggleSort.toggle = function(spec) {

          var currentMode = toggleSort.mode(spec);
          var currentModeIndex = toggleSort.modes.indexOf(currentMode);

          var newModeIndex = (currentModeIndex + 1) % (toggleSort.modes.length - 1);
          var newMode = toggleSort.modes[newModeIndex];

          Logger.logInteraction(Logger.actions.SORT_TOGGLE, scope.chart.shorthand, {
            currentMode: currentMode,
            newMode: newMode
          });

          var channels = toggleSort.channels(spec);

          if (scope.toggleShelf) {
            Pills.setSort(channels.ordinal, toggleSort.getSort(newMode, spec));
          } else {
            spec.encoding[channels.ordinal].sort = toggleSort.getSort(newMode, spec);
          }
        };

        /** Get sort property definition that matches each mode. */
        toggleSort.getSort = function(mode, spec) {
          if (mode === 'ordinal-ascending') {
            return 'ascending';
          }

          if (mode === 'ordinal-descending') {
            return 'descending';
          }

          var channels = toggleSort.channels(spec);
          var qEncDef = spec.encoding[channels.quantitative];

          if (mode === 'quantitative-ascending') {
            return {
              op: qEncDef.aggregate,
              field: qEncDef.field,
              order: 'ascending'
            };
          }

          if (mode === 'quantitative-descending') {
            return {
              op: qEncDef.aggregate,
              field: qEncDef.field,
              order: 'descending'
            };
          }

          return null;
        };

        toggleSort.mode = function(spec) {
          var channels = toggleSort.channels(spec);
          var sort = spec.encoding[channels.ordinal].sort;

          if (sort === undefined) {
            return 'ordinal-ascending';
          }

          for (var i = 0; i < toggleSort.modes.length - 1 ; i++) {
            // check if sort matches any of the sort for each mode except 'custom'.
            var mode = toggleSort.modes[i];
            var sortOfMode = toggleSort.getSort(mode, spec);

            if (_.isEqual(sort, sortOfMode)) {
              return mode;
            }
          }

          if (vg.util.isObject(sort) && sort.op && sort.field) {
            return 'custom';
          }
          console.error('invalid mode');
          return null;
        };

        toggleSort.channels = function(spec) {
          return spec.encoding.x.type === vl.type.NOMINAL || spec.encoding.x.type === vl.type.ORDINAL ?
                  {ordinal: 'x', quantitative: 'y'} :
                  {ordinal: 'y', quantitative: 'x'};
        };

        toggleSort.support = function(spec) {
          var encoding = spec.encoding;

          if (vl.encoding.has(encoding, 'row') || vl.encoding.has(encoding, 'column') ||
            !vl.encoding.has(encoding, 'x') || !vl.encoding.has(encoding, 'y') ||
            !vl.spec.alwaysNoOcclusion(spec)) { // FIXME replace this with CompassQL method
            return false;
          }

          return (
              (encoding.x.type === vl.type.NOMINAL || encoding.x.type === vl.type.ORDINAL) &&
              vl.fieldDef.isMeasure(encoding.y)
            ) ? 'x' :
            (
              (encoding.y.type === vl.type.NOMINAL || encoding.y.type === vl.type.ORDINAL) &&
              vl.fieldDef.isMeasure(encoding.x)
            ) ? 'y' : false;
        };

        scope.toggleSortClass = function(vlSpec) {
          if (!vlSpec || !toggleSort.support(vlSpec)) {
            return 'invisible';
          }

          var ordinalChannel = vlSpec && toggleSort.channels(vlSpec).ordinal,
            mode = vlSpec && toggleSort.mode(vlSpec);

          var directionClass = ordinalChannel === 'x' ? 'sort-x ' : '';

          switch (mode) {
            case 'ordinal-ascending':
              return directionClass + 'fa-sort-alpha-asc';
            case 'ordinal-descending':
              return directionClass + 'fa-sort-alpha-desc';
            case 'quantitative-ascending':
              return directionClass + 'fa-sort-amount-asc';
            case 'quantitative-descending':
              return directionClass + 'fa-sort-amount-desc';
            default: // custom
              return directionClass + 'fa-sort';
          }
        };

        scope.transpose = function() {
          Logger.logInteraction(Logger.actions.TRANSPOSE_TOGGLE, scope.chart.shorthand);
          if (scope.toggleShelf) {
            Pills.transpose();
          } else {
            Chart.transpose(scope.chart.vlSpec);
          }
        };

        scope.$on('$destroy', function() {
          scope.chart = null;
        });
      }
    };
  });
