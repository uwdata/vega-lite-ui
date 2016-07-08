'use strict';

/* global vl:true */

describe('Directive: schemaList', function() {

  // load the directive's module
  beforeEach(module('vlui', function($provide) {
    $provide.constant('vl', vl);
  }));

  var element,
    scope;

  beforeEach(module('vlui', function($provide) {
    var mockDataset = {
      schema: {
        stats: function() {return {}; }
      },
      onUpdate: []
    };
    $provide.value('Dataset', mockDataset);
  }));

  beforeEach(inject(function($rootScope) {
    scope = $rootScope.$new();
  }));

  it('should have field', inject(function($compile) {
    element = angular.element('<schema-list field-defs="[{field: \'foo\'}, {field: \'bar\'}, {field: \'baz\'}]"></schema-list>');
    element = $compile(element)(scope);
    scope.$digest();

    expect(element.find('schema-list-item').length).to.eql(3);
  }));
});
