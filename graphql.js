const actionHelper = require('./lib/action_helper');

/**
 * Executes a SOQL query based on configuration and msg
 *
 * @param {node-red-node} node the current node
 * @param {msg} msg the incoming message
 */
const handleInput = (node, msg) => {
  const config = node.config;

  const realAction = (conn, payload) => {
    return new Promise((resolve, reject) => {

      var gqlUrl = "/services/data/v55.0/graphql"

      conn
        .requestPost(gqlUrl, {"query": config.query})
        .then((results) => {
          console.log(results)
          resolve(results);
        })
        .catch((err) => reject(err));
    });
  };

  actionHelper.inputToSFAction(node, msg, realAction);
};

/* Make code available */
module.exports = function(RED) {
  function GraphQLQuery(config) {

    const node = this;

    RED.nodes.createNode(node, config);    
    node.connection = RED.nodes.getNode(config.connection);
    node.config = config;

    // if api version not high enough for Salesforce implementation of GraphQL --> throw error
    var apiVersion = node.connection.apiversion;
    var versionNum = parseFloat(apiVersion.replaceAll('v', ''));
    if (versionNum < 49.0) {
      throw 'ERROR: Current API version ('+apiVersion+') not high enough for GraphQL use with Salesforce (>= v58.0 is required).';
    }

    node.on('input', (msg) => handleInput(node, msg));
  }
  RED.nodes.registerType('graphql', GraphQLQuery);
};
