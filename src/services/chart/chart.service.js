'use strict';

angular.module('vlui')
  .service('Chart', function (cql) {
    var Chart = {
      getChart: getChart
    };

    /**
     *
     * @param {SpecQueryModelGroup | SpecQueryModel} item
     */
    function getChart(item) {
      if (!item) {
        return {
          /** @type {Object} concise spec generated */
          vlSpec: null,
          fieldSet: null,

          /** @type {String} generated vl shorthand */
          shorthand: null,
          enumSpecIndex: null
        };
      }

      var specM = (item instanceof cql.model.SpecQueryModelGroup) ?
        cql.model.SpecQueryModelGroup.getTopSpecQueryModel(item) :
        item;
      return {
        enumSpecIndex: specM.enumSpecIndex,
        fieldSet: specM.specQuery.encodings,
        vlSpec: specM.toSpec(),
        shorthand: specM.toShorthand(),
        specM: specM
      };
    }

    return Chart;
  });