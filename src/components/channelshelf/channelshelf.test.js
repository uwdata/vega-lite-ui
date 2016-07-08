'use strict';

/* global vl:true, vlSchema:true */

describe('Directive: channelShelf', function() {

  // load the directive's module
  beforeEach(module('vlui', function($provide) {
    $provide.constant('vl', vl);
    $provide.constant('vlSchema', vlSchema);
    $provide.constant('Drop', function() {});
  }));

  var element, scope, $compile;

  beforeEach(module('vlui', function($provide) {
    var mockDataset = {
      schema: {
        stats: function() {return {}; }
      },
      onUpdate: []
    };
    $provide.value('Dataset', mockDataset);
  }));

  beforeEach(inject(function($rootScope, _$compile_) {
    scope = $rootScope.$new();
    scope.channelId = 'x';
    scope.encoding = {'x': {}};

    $compile = _$compile_;
  }));

  it('should show title', function() {
    element = angular.element('<channel-shelf channel-id="channelId" encoding="encoding" schema="{properties:{}}"></channel-shelf>');
    element = $compile(element)(scope);
    scope.$digest();
    expect(element.find('.shelf-label').text().trim()).to.eql('x');
  });

  describe('fieldDrop', function() {
    it('should initially have placeholder', function() {
      element = angular.element('<channel-shelf channel-id="channelId" encoding="encoding" schema="schema"></channel-shelf>');
      element = $compile(element)(scope);
      scope.$digest();
      expect(element.find('.placeholder').length).to.eql(1);
    });

    it('should show correct field name when dropped', function() {
      // jshint unused:false
      //TODO
    });
  });

  describe('shelfProperties', function() {
    it('should change properties correctly', function() {
      // jshint unused:false
      //TODO
    });
  });

  describe('shelfFunctions', function() {
    it('should change function correctly', function() {
      // jshint unused:false
      //TODO
    });
  });
});
