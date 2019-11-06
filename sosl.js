const actionHelper = require('./lib/action_helper');

/**
 * Executes a SOSL query based on configuration and msg
 *
 * @param {node-red-node} node the current node
 * @param {msg} msg the incoming message
 */
const handleInput = (node, msg) => {
  const config = node.config;
  const realAction = (org, payload) => {
    return new Promise((resolve, reject) => {
      Object.assign(payload, {
        fetchAll: config.fetchAll,
        search: msg.query || config.query
      });
      org
        .query(payload)
        .then((results) => {
          const finalResults = results.records.map((r) => r.toJSON());
          resolve(finalResults);
        })
        .catch((err) => reject(err));
    });
  };

  actionHelper.inputToSFAction(node, msg, realAction);
};

/* Make code available */
module.exports = function(RED) {
  function SoslQuery(config) {
    const node = this;
    RED.nodes.createNode(node, config);
    node.connection = RED.nodes.getNode(config.connection);
    node.config = config;
    node.on('input', (msg) => handleInput(node, msg));
  }
  RED.nodes.registerType('sosl', SoslQuery);
};
