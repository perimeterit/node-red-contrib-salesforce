const { JsonpTransport } = require('jsforce/lib/transport');
const actionHelper = require('./lib/action_helper');

/**
 * Executes an Apex REST call using jsforce
 *
 * @param {node-red-node} node the current node
 * @param {msg} msg the incoming message
 */
const handleInput = (node, msg) => {
  const config = node.config;

  const realAction = (conn, payload) => {
  return new Promise((resolve, reject) => {
    try {
      const method = (msg.method || config.method || 'GET').toUpperCase();
      const uri = msg.uri || config.uri;

      if (!uri) {
        return reject(new Error('Missing URI for Apex REST call'));
      }

      const body = msg.body || {};
      const fullPath = uri.startsWith('/') ? uri : '/' + uri;

      let promise;

      switch (method) {
        case 'GET':
          promise = conn.apex.get(fullPath);
          break;
        case 'POST':
          promise = conn.apex.post(fullPath, body);
          break;
        case 'PUT':
          promise = conn.apex.put(fullPath, body);
          break;
        case 'PATCH':
          promise = conn.apex.patch(fullPath, body);
          break;
        case 'DELETE':
          promise = conn.apex.delete(fullPath);
          break;
        default:
          return reject(new Error(`Unsupported HTTP method: ${method}`));
      }

      promise
        .then((response) => {
          if (config.response === "json") {
            try {
              resolve(JSON.parse(response));
            } catch (e) {
              reject(new Error("Failed to parse JSON response"));
            }
          } else {
            resolve(response);
          }
        })
        .catch((err) => reject(err));
        
    } catch (err) {
      reject(err);
    }
  });
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
