'use strict';

/* global vl:true */

describe('Directive: fieldInfo', function () {

  // load the directive's module
  beforeEach(module('vlui'));

  var element,
    scope;


  beforeEach(module('vlui', function($provide) {
    $provide.constant('vl', vl); // vl is loaded by karma
    $provide.constant('Dataset', {
      schema: {
        stats: function() { return {}; }
      }
    });
  }));

  beforeEach(inject(function ($rootScope) {
    scope = $rootScope.$new();
  }));

  it('should appear', inject(function ($compile) {
    element = angular.element('<field-info field-def="{field:\'a\'}"></field-info>');
    element = $compile(element)(scope);
    scope.$digest();
    expect(element.find('.hflex')).to.be.ok;
  }));
});