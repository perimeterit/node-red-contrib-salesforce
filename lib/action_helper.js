/**
 * Contains common code pattern for Salesforce actions.
 * Used by actual nodes to achieve DRY
 */
const sf = require('./jsforce_wrapper');

const redError = (redNode, msg, err) => {
  redNode.status({ fill: 'red', shape: 'dot', text: 'Error:' + err.message });
  redNode.log(err, msg);
  redNode.error(err, msg);
};

const redConnect = (redNode, text) => {
  redNode.status({ fill: 'green', shape: 'ring', text: text });
};

const redIdle = (redNode) => {
  redNode.status({ fill: 'gray', shape: 'ring', text: 'idle' });
};

const redReceiving = (redNode) => {
  redNode.status({ fill: 'green', shape: 'dot', text: 'Receiving data' });
};

const redSubscribed = (redNode, text) => {
  redNode.status({ fill: 'blue', shape: 'dot', text: text });
};

const inputToSFAction = async (node, msg, payloadHelper) => {
  const connection = node.connection;

  // show initial status of progress
  redConnect(node, 'connecting...');

  try {
    // Create connection and get config
    const orgResult = sf.createConnection(connection, msg);
    const conn = orgResult.org;           // This is now a jsforce.Connection
    const orgConfig = orgResult.config;

    // Get existing token (if any)
    const existingOAuth = sf.getOAuth(orgConfig);

    // Authenticate with Salesforce (may reuse token)
    const oauth = await sf.authenticate(conn, orgConfig, existingOAuth);

    // Cache the token
    sf.setOAuth(oauth, orgConfig);

    // Prepare payload for helper
    const rawPayload = {
      oauth: oauth,
      apiVersion: orgConfig.apiversion,
      conn: conn // optionally include the jsforce.Connection for advanced use
    };

    // Call your custom logic
    const results = await payloadHelper(conn, rawPayload, sf);

    if (results) {
      msg.payload = results;
      node.send(msg);
      const nodeStatus = Object.assign({}, results.nodeStatus || {});
      node.status(nodeStatus);
    }
  } catch (err) {
    redError(node, msg, err);
  }
};

module.exports = {
  inputToSFAction,
  error: redError,
  connect: redConnect,
  idle: redIdle,
  receiving: redReceiving,
  subscribed: redSubscribed
};
