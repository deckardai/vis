exports.DataSet = require('./lib/DataSet');
exports.Timeline = require('./lib/timeline/Timeline');

/*
  Core is the base prototype from a Timeline
  
  interesting accessible methods: 
  - getVisibleItems returns an array composed of all visible items
  - 

  Note:
  * Core:
    - setWindow is modifying this.range through setRange -> investigate there
    - zoomIn/zoomOut call setWindow so nothing to do there
    - in redraw, the components are being iteratively redraw at the end of the function,
      therefore, we should look there...
  * Timeline:
    - the items are stored in itemsData and itemSet is populated with the same
    - there is a Configurator that does something...
    - 
  * ItemSet:
    - from getVisibleItems, we lean that each group has an array of visibleItems
    => our ClusterItem will therefore land here.
    - back @ redraw() method!

  Build: browserify index-timeline-deckard.js -t [ babelify --presets [es2015] ] -o dist/vis-deckard.js -s vis
  Minify: uglifyjs dist/vis-deckard.js -o dist/vis-deckard.min.js

*/