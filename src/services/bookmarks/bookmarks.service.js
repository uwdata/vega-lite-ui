'use strict';

/**
 * @ngdoc service
 * @name vlui.Bookmarks
 * @description
 * # Bookmarks
 * Service in the vlui.
 */
angular.module('vlui')
  .service('Bookmarks', function(_, vl, localStorageService, Logger, Dataset) {
    var Bookmarks = function() {
      this.list = [];
      this.dict = {};
      this.isSupported = localStorageService.isSupported;
    };

    var proto = Bookmarks.prototype;

    proto.save = function() {
      localStorageService.set('bookmarkList', this.list);
    };

    proto.saveAnnotations = _.throttle(function(shorthand) {
      _.find(this.list, function(bookmark) { return bookmark.shorthand === shorthand; })
        .chart.annotation = this.dict[shorthand].annotation;
      this.save();
    }, 1000, {"trailing": true});

    // export all bookmarks and annotations
    proto.export = function() {
      var dictionary = this.dict;

      // prepare export data
      var exportSpecs = [];
      _.forEach(this.list, function(bookmark) {
        var spec = bookmark.chart.vlSpec;
        spec.description = dictionary[bookmark.shorthand].annotation;
        exportSpecs.push(spec);
      });

      // write export data in a new tab
      var exportWindow = window.open();
      exportWindow.document.open();
      exportWindow.document.write('<html><body><pre>' + JSON.stringify(exportSpecs, null, 2) + '</pre></body></html>');
      exportWindow.document.close();
    };

    proto.load = function() {
      this.list = localStorageService.get('bookmarkList') || [];

      // populate this.dict
      var dictionary = this.dict;
      _.forEach(this.list, function(bookmark) {
        dictionary[bookmark.shorthand] = _.cloneDeep(bookmark.chart);
      });
    };

    proto.clear = function() {
      this.list.splice(0, this.list.length);
      this.dict = {};
      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_CLEAR);
    };

    proto.add = function(chart, listTitle) {
      var shorthand = chart.shorthand;
      chart.timeAdded = (new Date().getTime());

      // FIXME: this is not always a good idea
      chart.schema = Dataset.schema;

      this.dict[chart.shorthand] = _.cloneDeep(chart);

      this.list.push({
        shorthand: shorthand,
        list: listTitle,
        chart: _.cloneDeep(chart)
      });

      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_ADD, shorthand, {
        list: listTitle
      });
    };

    proto.remove = function(chart) {
      var shorthand = chart.shorthand;

      // remove bookmark from this.list
      var index = this.list.findIndex(function(bookmark) { return bookmark.shorthand === shorthand; });
      var removed;
      if (index >= 0) {
        removed = this.list.splice(index, 1)[0];
      }

      // remove bookmark from this.dict
      delete this.dict[chart.shorthand];

      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_REMOVE, shorthand, {
        list: (removed || {}).list
      });
    };

    proto.reorder = function() {
      this.save();
    };

    proto.isBookmarked = function(shorthand) {
      return this.dict.hasOwnProperty(shorthand);
    };

    proto.logBookmarksClosed = function() {
      Logger.logInteraction(Logger.actions.BOOKMARK_CLOSE);
    };

    return new Bookmarks();
  });
