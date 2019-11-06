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
  const realAction = (org, payload, nforce) => {
    return new Promise((resolve, reject) => {
      const sobj = nforce.force.createSObject('FeedItem');
      sobj.set('Body', msg.payload);
      // Additional fields for addressing the chatter post properly
      if (msg.ParentId) {
        sobj.set('ParentId', msg.ParentId);
      } else {
        // Attach to current user
        sobj.set('ParentId', extractUserid(payload));
      }

      if (msg.RelatedRecordId) {
        sobj.set('RelatedRecordId', msg.RelatedRecordId);
      }

      if (msg.title) {
        sobj.set('title', msg.title);
      }
      payload.sobject = sobj;

      org
        .insert(payload)
        .then((sfdcResult) => {
          let result = {
            success: true,
            object: 'feeditem',
            action: 'insert',
            id: sfdcResult.id ? sfdcResult.id : msg.externalId ? msg.externalId : msg.payload.id
          };
          resolve(result);
        })
        .catch((err) => reject(err));
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
