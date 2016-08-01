'use strict';

angular.module('vlui')
  .directive('vlPlotGroupList', function (vl, cql, jQuery, consts, _, Logger, Pills) {
    return {
      templateUrl: 'components/vlplotgrouplist/vlplotgrouplist.html',
      restrict: 'E',
      replace: true,
      scope: {
        /** An instance of specQueryModelGroup */
        modelGroup: '='
      },
      link: function postLink(scope , element /*, attrs*/) {
        scope.consts = consts;
        scope.limit = consts.numInitClusters;

        // Functions
        scope.getChart = getChart;
        scope.increaseLimit = increaseLimit;
        scope.isInlist = isInList;
        scope.select = select;


        element.bind('scroll', function(){
           if(jQuery(this).scrollTop() + jQuery(this).innerHeight() >= jQuery(this)[0].scrollHeight){
            if (scope.limit < scope.modelGroup.items.length) {
              scope.increaseLimit();
            }
           }
        });

        /**
         *
         * @param {SpecQueryModelGroup | SpecQueryModel} item
         */
        function getChart(item) {
          var specM = cql.modelGroup.isSpecQueryModelGroup(item) ?
            cql.modelGroup.getTopItem(item) :
            item;
          return {
            enumSpecIndex: specM.enumSpecIndex,
            fieldSet: specM.specQuery.encodings,
            vlSpec: specM.toSpec()
          };
        }

        function increaseLimit() {
          // FIXME
          Logger.logInteraction(Logger.actions.LOAD_MORE, scope.limit);
        }

        /** return if the plot is still in the view, so it might be omitted from the render queue if necessary. */
        function isInList(/*chart*/) {
          // FIXME
          return true;
        }

        function select(chart) {
          Logger.logInteraction(Logger.actions.SPEC_SELECT, chart);
          Pills.parse(chart.vlSpec);
        }
      }
    };
  });
