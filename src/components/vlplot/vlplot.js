'use strict';

angular.module('vlui')
  .directive('vlPlot', function(vl, vg, cql, $timeout, $q, Dataset, Config, consts, _, $document, Logger, Heap, $window) {
    var counter = 0;
    var MAX_CANVAS_SIZE = 32767/2, MAX_CANVAS_AREA = 268435456/4;

    var renderQueue = new Heap(function(a, b){
        return a.priority - b.priority;
      }),
      rendering = false;

    function getRenderer(width, height) {
      // use canvas by default but use svg if the visualization is too big
      if (width > MAX_CANVAS_SIZE || height > MAX_CANVAS_SIZE || width*height > MAX_CANVAS_AREA) {
        return 'svg';
      }
      return 'canvas';
    }

    return {
      templateUrl: 'components/vlplot/vlplot.html',
      restrict: 'E',
      scope: {
        chart: '=',

        //optional
        disabled: '<',
        /** A function that returns if the plot is still in the view, so it might be omitted from the render queue if necessary. */
        isInList: '<',
        listTitle: '<',

        alwaysScrollable: '<',
        configSet: '@',
        overflow: '<',
        priority: '<',
        rescale: '<',
        thumbnail: '<',
        tooltip: '<'
      },
      replace: true,
      link: function(scope, element) {
        var HOVER_TIMEOUT = 500;
        var view;
        var tooltip;

        scope.vlPlotHeight = function() {
          return element.height();
        };

        scope.vlPlotWidth = function() {
          return element.width();
        };

        function destroyView() {
          if (view) {
            tooltip.destroy(); // remove tooltip event listners on view
            view.off('mouseover');
            view.off('mouseout');
            view.destroy();
            view = null;

            var shorthand = getShorthand();
            if (consts.debug && $window.views) {
              delete $window.views[shorthand];
            }
          }
        }

        scope.visId = (counter++);

        var hoverPromise = null;
        var renderQueueNextPromise = null;

        scope.hoverFocus = false;
        scope.destroyed = false;

        scope.mouseenter = function() {
          hoverPromise = $timeout(function(){
            Logger.logInteraction(Logger.actions.CHART_MOUSEOVER, scope.chart.shorthand,{
              list: scope.listTitle
            });
            scope.hoverFocus = !scope.thumbnail;
          }, HOVER_TIMEOUT);
        };

        scope.mouseleave = function() {
          if (scope.hoverFocus) {
            Logger.logInteraction(Logger.actions.CHART_MOUSEOUT, scope.chart.shorthand, {
              list: scope.listTitle
            });
          }

          $timeout.cancel(hoverPromise);
          hoverPromise = null;

          scope.hoverFocus = scope.unlocked = false;
        };

        function onTooltipAppear(event, item) {
          Logger.logInteraction(Logger.actions.CHART_TOOLTIP, item.datum, {
            shorthand: scope.chart.shorthand,
            list: scope.listTitle
          });
        }

        function onTooltipDisappear(event, item) {
          Logger.logInteraction(Logger.actions.CHART_TOOLTIP_END, item.datum, {
            shorthand: scope.chart.shorthand,
            list: scope.listTitle
          });
        }

        function getVgSpec() {
          var configSet = scope.configSet || consts.defaultConfigSet || {};

          if (!scope.chart.vlSpec) {
            return;
          }

          var vlSpec = _.cloneDeep(scope.chart.vlSpec);
          vg.util.extend(vlSpec.config, Config[configSet]());
          return vl.compile(vlSpec).spec;
        }

        function getVisElement() {
          return element.find('.vega > :first-child');
        }

        function rescaleIfEnable() {
          var visElement = getVisElement();
          if (scope.rescale) {
            // have to digest the scope to ensure that
            // element.width() is bound by parent element!
            scope.$digest();

            var xRatio = Math.max(
                0.2,
                element.width() /  /* width of vlplot bounding box */
                scope.width /* width of the vis */
              );

            if (xRatio < 1) {
              visElement.width(scope.width * xRatio)
                        .height(scope.height * xRatio);
            }

          } else {
            visElement.css('transform', null)
                      .css('transform-origin', null);
          }
        }

        function getShorthand() {
          return scope.chart.shorthand || (scope.chart.vlSpec ? cql.query.shorthand.vlSpec(scope.chart.vlSpec) : '');
        }

        function renderQueueNext() {
          // render next item in the queue
          if (renderQueue.size() > 0) {
            var next = renderQueue.pop();
            next.parse();
          } else {
            // or say that no one is rendering
            rendering = false;
          }
        }


        function render(spec) {

          if (!spec) {
            if (view) {
              destroyView();
            }
            return;
          }

          scope.height = spec.height;
          if (!element) {
            console.error('can not find vis element');
          }

          var shorthand = getShorthand();

          function parseVega() {
            // if no longer a part of the list, cancel!
            if (scope.destroyed || scope.disabled || (scope.isInList && scope.chart.fieldSetKey && !scope.isInList(scope.chart))) {
              console.log('cancel rendering', shorthand);
              renderQueueNext();
              return;
            }

            var start = new Date().getTime();
            // render if still a part of the list
            vg.parse.spec(spec, function(error, chart) {
              if (error) {
                console.error('error', error);
                renderQueueNextPromise = $timeout(renderQueueNext, 1);
                return;
              }
              try {
                var endParse = new Date().getTime();
                destroyView();
                view = chart({el: element[0]});

                if (!consts.useUrl) {
                  view.data({raw: Dataset.data});
                }

                view.update();

                // read width / height from layout
                var layout = view.data('layout').values()[0];
                var renderer = getRenderer(layout.width, layout.height);
                if (renderer === 'svg') {
                  view.renderer(renderer);
                }

                var visElement = element.find('.vega > :first-child');
                // read  <canvas>/<svg>’s width and height, which is vega's outer width and height that includes axes and legends
                scope.width =  visElement.width();
                scope.height = visElement.height();

                if (consts.debug) {
                  $window.views = $window.views || {};
                  $window.views[shorthand] = view;
                }

                Logger.logInteraction(Logger.actions.CHART_RENDER, scope.chart.shorthand, {
                  list: scope.listTitle
                });
                rescaleIfEnable();

                var endChart = new Date().getTime();
                console.log('parse spec', (endParse-start), 'charting', (endChart-endParse), shorthand);
                if (scope.tooltip) {
                  // use vega-tooltip
                  tooltip = vl.tooltip(view, scope.chart.vlSpec, {
                    onAppear: onTooltipAppear,
                    onDisappear: onTooltipDisappear,
                    delay: 200
                  });
                }
              } catch (e) {
                console.error(e, JSON.stringify(spec));
              } finally {
                renderQueueNextPromise = $timeout(renderQueueNext, 1);
              }

            });
          }

          if (!rendering) { // if no instance is being render -- rendering now
            rendering=true;
            parseVega();
          } else {
            // otherwise queue it
            renderQueue.push({
              priority: scope.priority || 0,
              parse: parseVega
            });
          }
        }

        var specWatcher = scope.$watch(function() {
          // Omit data property to speed up deep watch
          return _.omit(scope.chart.vlSpec, 'data');
        }, function() {
          var spec = scope.chart.vgSpec = getVgSpec();
          if (!scope.chart.cleanSpec) {
            // FIXME
            scope.chart.cleanSpec = scope.chart.vlSpec;
          }
          render(spec);
        }, true);

        scope.$on('$destroy', function() {
          console.log('vlplot destroyed');
          if (view) {
            destroyView();
          }

          if (hoverPromise) {
            $timeout.cancel(hoverPromise);
            hoverPromise = null;
          }

          if (tooltipPromise) {
            $timeout.cancel(tooltipPromise);
            tooltipPromise = null;
          }

          // if (renderQueueNextPromise) {
          //   $timeout.cancel(renderQueueNextPromise);
          //   renderQueueNextPromise = null;
          // }

          scope.destroyed = true;
          // FIXME another way that should eliminate things from memory faster should be removing
          // maybe something like
          // renderQueue.splice(renderQueue.indexOf(parseVega), 1));
          // but without proper testing, this is riskier than setting scope.destroyed.

          // Clean up watcher
          specWatcher();
        });
      }
    };
  });
