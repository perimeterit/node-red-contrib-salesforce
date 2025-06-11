const actionHelper = require('./lib/action_helper');

/**
 * Executes an Apex REST call using jsforce
 *
 * @param {node-red-node} node the current node
 * @param {msg} msg the incoming message
 */
const handleInput = (node, msg) => {
  const config = node.config;

  const realAction = async (conn, payload) => {
    try {
      const method = (msg.method || config.method || 'GET').toUpperCase();
      const uri = msg.uri || config.uri;

      if (!uri) {
        throw new Error('Missing URI for Apex REST call');
      }

      const body = msg.body || {};
      const headers = msg.headers || {};

      // Salesforce expects relative paths for Apex calls (starting after /services/apexrest)
      const fullUrl = `/services/apexrest${uri.startsWith('/') ? uri : '/' + uri}`;

      const response = await conn.request({
        method,
        url: fullUrl,
        headers,
        body: ['POST', 'PATCH', 'PUT'].includes(method) ? body : undefined
      });

      return response;

    } catch (err) {
      throw err;
    }
  };

  actionHelper.inputToSFAction(node, msg, realAction);
};

/* Make code available */
module.exports = function(RED) {
  function ApexRest(config) {
    const node = this;
    RED.nodes.createNode(node, config);
    node.connection = RED.nodes.getNode(config.connection);
    node.config = config;
    node.on('input', (msg) => handleInput(node, msg));
  }
  RED.nodes.registerType('apexrest', ApexRest);
};
