const actionHelper = require('./lib/action_helper');

/**
 * Executes a apex rest call based on configuration and msg
 *
 * @param {node-red-node} node the current node
 * @param {msg} msg the incoming message
 */
const handleInput = (node, msg) => {
  const config = node.config;

  const realAction = (org, payload) => {
    return new Promise((resolve, reject) => {
      // console.log("MSG:");
      // console.log(msg);
      // console.log("CONFIG:");
      // console.log(config);

      Object.assign(payload, {
        method: msg.method || config.method,
        uri: msg.uri || config.uri
      });

      org
        .apexRest(payload)
 	      .then((results) => {
          resolve(results);
        })
        .catch((err) => reject(err));
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
