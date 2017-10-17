exports.DataSet = require('./lib/DataSet');
exports.Timeline = require('./lib/timeline/Timeline');

/*
  Core is the base prototype from a Timeline
  
  interesting accessible methods: 
  - getVisibleItems returns an array composed of all visible items
  - 

  Build: browserify index-timeline-deckard.js -t [ babelify --presets [es2015] ] -o dist/vis-deckard.js -s vis
  Minify: uglifyjs dist/vis-deckard.js -o dist/vis-deckard.min.js

*/