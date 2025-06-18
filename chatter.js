const actionHelper = require('./lib/action_helper');

// Little hack to get current user ID for chatter messages
const extractUserid = (payload) => {
  const oauth = payload.oauth;
  if (oauth.id) {
    const id = oauth.id;
    const lastSlash = id.lastIndexOf('/');
    return id.substring(lastSlash + 1);
  }
  return null;
};

const handleInput = (node, msg) => {
  const realAction = (conn, payload) => {
    return new Promise(async (resolve, reject) => {
      const feedItem = {
        Body: msg.payload,
        ParentId: msg.ParentId || extractUserid(payload)
      };

      if (msg.RelatedRecordId) {
        feedItem.RelatedRecordId = msg.RelatedRecordId;
      }

      if (msg.title) {
        feedItem.Title = msg.title;
      }

      
      conn.sobject('FeedItem').create(feedItem)
      .then((result) => {
        const response = {
          success: result.success,
          object: 'feeditem',
          action: 'insert',
          id: result.id || msg.externalId || msg.payload.id
        };

        resolve(response);
      })
      .catch((e) => reject(e));
    });
  };

  actionHelper.inputToSFAction(node, msg, realAction);
};

module.exports = function(RED) {
  function Chatter(config) {
    const node = this;
    RED.nodes.createNode(node, config);
    node.connection = RED.nodes.getNode(config.connection);
    node.config = config;
    node.on('input', (msg) => handleInput(node, msg));
  }
  RED.nodes.registerType('chatter', Chatter);
};
