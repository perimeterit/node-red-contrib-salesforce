const actionHelper = require('./lib/action_helper');

/**
 * Executes a SOSL query based on configuration and msg
 *
 * @param {node-red-node} node the current node
 * @param {msg} msg the incoming message
 */
const handleInput = (node, msg) => {
  const config = node.config;
   const realAction = (conn, payload) => {
    return new Promise((resolve, reject) => {
      const queryString = config.query;

      const options = {};
      if (config.fetchAll) {
        // Use autoFetch in jsforce to fetch all records across pages
        options.autoFetch = true;
        options.maxFetch = 10000; // or some safe upper limit
      }

      conn.search(queryString, options)
        .then((results) => {
          console.log(results);
          resolve(results.searchRecords); // already plain JS objects
        })
        .catch((err) => {
          console.log(err);
          reject(err);}
        );
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
