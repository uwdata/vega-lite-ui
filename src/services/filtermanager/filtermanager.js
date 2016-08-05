'use strict';

angular.module('vlui')
  .service('FilterManager', function (_, vl, Dataset) {
    var self = this;

    /** local object for this object */
    self.filterIndex = {};

    this.toggle = function(field) {
      if (!self.filterIndex[field]) {
        self.filterIndex[field] = initFilter(field);
      } else {
        self.filterIndex[field].enabled = !self.filterIndex[field].enabled;
      }
    };

    this.reset = function(oldFilter, hard) {
      if (hard) {
        self.filterIndex = {};
      } else {
        _.forEach(self.filterIndex, function(value, field) {
          delete self.filterIndex[field];
        });
      }

      if (oldFilter) {
        console.error('We do not support loading filter yet!');
      }

      return self.filterIndex;
    }

    this.getVlFilter = function() {
      var vlFilter = _.reduce(self.filterIndex, function (filters, filter, field) {
        if (filter.enabled) {
          filters.push(_.omit(filter, 'enabled'));
        }
        return filters;
      }, []);

      return vlFilter.length ? vlFilter : undefined;
    }

    function initFilter(field) {
      var type = Dataset.schema.type(field);

      switch (type) {
        case vl.type.NOMINAL:
        case vl.type.ORDINAL:
          return {
            enabled: true,
            field: field,
            in: Dataset.domain(field)
          };
        case vl.type.QUANTITATIVE:
          return {
            enabled: true,
            field: field,
            range: [
              Dataset.schema.stats({field: field}).min,
              Dataset.schema.stats({field: field}).max
            ]
          };
        case vl.type.TEMPORAL:
          return {
            enabled: true,
            field: field,
            range: [
              Dataset.schema.stats({field: field}).min,
              Dataset.schema.stats({field: field}).max
            ]
          };
      }
    }

    // FIXME remove
    this.update = function(field, filter) {
      // self.filterIndex[field] = filter;
    };
  });
