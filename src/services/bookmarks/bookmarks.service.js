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
      this.annotations = {};
      this.length = 0;
      this.isSupported = localStorageService.isSupported;
    };

    var proto = Bookmarks.prototype;

    proto.updateLength = function() {
      this.length = this.list.length;
    };

    proto.save = function() {
      localStorageService.set('bookmarkList', this.list);
    };

    proto.saveAnnotations = function(shorthand) {
      _.find(this.list, function(bookmark) { return bookmark.shorthand === shorthand; })
        .chart.annotation = this.annotations[shorthand];
      this.save();
    }

    proto.load = function() {
      this.list = localStorageService.get('bookmarkList') || [];
      this.updateLength();

      // load annotations
      var annotations = this.annotations;
      _.forEach(this.list, function(bookmark) {
        annotations[bookmark.shorthand] = bookmark.chart.annotation;
      });
    };

    proto.clear = function() {
      this.list.splice(0, this.list.length);
      this.updateLength();
      this.annotations = {};
      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_CLEAR);
    };

    proto.toggle = function(chart) {

      var shorthand = chart.shorthand;

      if (this.isBookmarked(shorthand)) {
        this.remove(chart);
      } else {
        this.add(chart);
      }
    };

    proto.add = function(chart) {
      var shorthand = chart.shorthand;

      console.log('adding', chart.vlSpec, shorthand);

      chart.timeAdded = (new Date().getTime());

      chart.stats = Dataset.stats;

      chart.annotation = this.annotations[chart.shorthand];

      this.list.push({shorthand: shorthand, chart: _.cloneDeep(chart)});

      this.updateLength();
      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_ADD, shorthand);
    };

    proto.remove = function(chart) {
      var shorthand = chart.shorthand;

      console.log('removing', chart.vlSpec, shorthand);

      // remove bookmark from this.list
      var index = this.list.findIndex(function(bookmark) { return bookmark.shorthand === shorthand; });
      if (index >= 0) {
        this.list.splice(index, 1);
      }
      this.updateLength();

      // remove annotation
      delete this.annotations[chart.shorthand];

      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_REMOVE, shorthand);
    };

    proto.reorder = function() {
      this.save();
    }

    proto.isBookmarked = function(shorthand) {
      return _.some(this.list, function(bookmark) { return bookmark.shorthand === shorthand; });
    };

    return new Bookmarks();
  });
