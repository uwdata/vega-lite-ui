'use strict';

describe('Directive: nullFilterDirective', function () {

  // load the directive's module
  beforeEach(module('vlui'));

  var element,
    scope;

  beforeEach(inject(function ($rootScope) {
    scope = $rootScope.$new();
  }));

  it('should make hidden element visible', inject(function ($compile) {
    element = angular.element('<null-filter-directive></null-filter-directive>');
    element = $compile(element)(scope);
    expect(element.length).to.eql(1);
  }));
});