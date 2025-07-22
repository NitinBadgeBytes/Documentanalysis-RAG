const cds = require('@sap/cds');
const bodyParser = require('body-parser');

cds.on('bootstrap', app => {
  // Increase limit to 5MB (or more)
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.raw({ limit: '10mb', type: '*/*' }));
});

module.exports = cds.server;
