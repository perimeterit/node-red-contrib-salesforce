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
        const headers = msg.headers || {};

        if (!/^(GET|DELETE)$/i.test(method)) {
          headers['content-type'] = 'application/json';
        }


        const fullUrl = !config.customurl ? `/services/apexrest${uri.startsWith('/') ? uri : '/' + uri}` : uri.startsWith('/') ? uri : '/' + uri;

        conn.request({
            method,
            url: fullUrl,
            headers,
            body: ['POST', 'PATCH', 'PUT'].includes(method) ? JSON.stringify(body) : undefined
        }).then((response) => {
          if(config.response === "json"){
            resolve(JSON.parse(response));
          }
          else{
            resolve(response);
          }
        }).catch((err) => {
          reject(err);
        });

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
