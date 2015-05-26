'use strict';
/* globals window, angular */

angular.module('vlui', [
  'LocalStorageModule',
  'angular-websql'
  ])
  .constant('_', window._)
  // datalib, vegalite, vega
  .constant('dl', window.dl)
  .constant('vl', window.vl)
  .constant('vg', window.vg)
  // Papa
  .constant('Papa', window.Papa)
  .constant('Blob', window.Blob)
  .constant('URL', window.URL)
  // Drop
  .constant('Drop', window.Drop)
  .constant('PriorityQueue', window.PriorityQueue)
  // constants
  .constant('consts', {
    addCount: true, // add count field to Dataset.dataschema
    debug: true,
    useUrl: true,
    logging: false,
    defaultConfigSet: 'large',
    appId: 'vlui'
  });
  // .config(function(uiZeroclipConfigProvider) {
  //   // config ZeroClipboard
  //   uiZeroclipConfigProvider.setZcConf({
  //     swfPath: 'bower_components/zeroclipboard/dist/ZeroClipboard.swf'
  //   });
  // });
