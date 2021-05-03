'use strict';
const path = require('path');
const bindings = require('node-gyp-build')(path.join(__dirname, '..'));
module.exports = bindings.initializeBindings();
