const actionHelper = require('./lib/action_helper');

/**
 * Executes a DML operation using jsforce
 *
 * @param {node-red-node} node the current node
 * @param {msg} msg the incoming message
 */
const handleInput = (node, msg) => {
  const config = node.config;

  const realAction = async (conn, payload) => {
    try {
      const theAction = msg.action || config.action;
      const theObject = msg.object || config.object;
      const data = msg.payload || {};

      let dmlResult;
      switch (theAction) {
        case 'insert':
          dmlResult = await conn.sobject(theObject).create(data);
          break;

        case 'update':
          dmlResult = await conn.sobject(theObject).update(data);
          break;

        case 'upsert':
          if (!msg.externalId || !msg.externalId.field || !msg.externalId.value) {
            throw new Error('Missing externalId info for upsert');
          }
          dmlResult = await conn
            .sobject(theObject)
            .upsert(data, msg.externalId.field);
          break;

        case 'delete':
          dmlResult = await conn.sobject(theObject).destroy(data.id);
          break;

        default:
          throw new Error('Unknown DML action: ' + theAction);
      }

      // Build response
      const id =
        dmlResult.id || data.id || (msg.externalId && msg.externalId.value);

      return {
        success: true,
        object: theObject.toLowerCase(),
        action: theAction,
        id: id
      };

    } catch (err) {
      throw err;
    }
  };

  actionHelper.inputToSFAction(node, msg, realAction);
};


module.exports = function (RED) {
  function Dml(config) {
    const node = this;
    RED.nodes.createNode(node, config);
    node.connection = RED.nodes.getNode(config.connection);
    node.config = config;
    node.on('input', (msg) => handleInput(node, msg));
  }
  RED.nodes.registerType('dml', Dml);
};
