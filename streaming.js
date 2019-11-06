const actionHelper = require('./lib/action_helper');

//array to back-up the node & disconnect the streaming client when redeploying flow
const clients = {};

/**
 * Configure and/or reset a subscription node
 * @param {NodeRED node} node - the Subscription Node
 * @param {Node configuration object} config the stored configuration
 */
const setupSubscriptionNode = (node, config) => {
  node.config = config;
  node.subscriptionActive = false;
  node.client = {}; // The faye client
  // back-up the node and disconnect/clean-up when
  // redeploying flow to avoid duplicated subscription
  if (!clients[node.id]) {
    clients[node.id] = node;
    node.startSubscriptionId = config.replayId;
  } else {
    // On redeployment we want to start
    node.startSubscriptionId = clients[node.id].lastReceivedId || config.replayId;
    if (clients[node.id].client.disconnect) {
      clients[node.id].client.disconnect();
      clients[node.id] = node;
    }
  }
};

const handleStreamError = (node, err) => {
  node.log('Subscription error!!!');
  actionHelper.error(node, err.message, err);
  node.client.disconnect();
  node.subscriptionActive = false;
  return node.error(err, err.message);
};

const handleStreamData = (node, data) => {
  const lastReplayId = node.lastReplayId || node.startSubscriptionId;
  const newReplayId = data.event.replayId;
  if (lastReplayId === newReplayId) {
    // TODO: should a duplicate replay Error be swallowed?
    const err = new Error('Duplicate replay id');
    actionHelper.error(node, newReplayId, err);
    return;
  }
  actionHelper.receiving(node);
  node.send({
    payload: data
  });
  actionHelper.subscribed(node, node.subscriptionMessage);
};

const createSubscription = (subscribeOptions) => {
  const node = subscribeOptions.node;
  if (node.subscriptionActive) {
    if (node.config.resubScribeOnDoubeSubscription) {
      // Terminate subscription first, ignore the resolve/reject
      terminateSubscription(node, () => {}, () => {});
    } else {
      // We don't subscribe again
      subscribeOptions.resolve();
      return;
    }
  }
  const config = node.config;
  const msg = subscribeOptions.msg;
  const streamOpts = {
    // Topic in message takes priority over configuration
    topic: msg.topic || config.pushTopic,
    replayId: msg.replayId || node.startSubscriptionId,
    oauth: subscribeOptions.oauth
  };

  try {
    const org = subscribeOptions.org;
    node.subscriptionMessage = 'Subscribed to:' + streamOpts.topic;
    const fayeOptions = {
      oauth: subscribeOptions.oauth
      //timeout: 90,
      //retry: 60
    };
    node.client = org.createStreamClient(fayeOptions);
    const stream = node.client.subscribe(streamOpts);
    node.log(node.subscriptionMessage);
    node.subscriptionActive = true;
    stream.on('error', (err) => handleStreamError(node, err));
    stream.on('data', (data) => handleStreamData(node, data));
  } catch (ex) {
    subscribeOptions.reject(ex);
  }

  actionHelper.subscribed(node, node.subscriptionMessage);
  subscribeOptions.resolve();
};

const terminateSubscription = (subscribeOptions) => {
  const node = subscribeOptions.node;
  if (node.subscriptionActive) {
    try {
      if (node.client.disconnect) {
        node.client.disconnect();
      }
    } catch (err) {
      subscribeOptions.reject(err);
    }
  }
  // Terminate in any case
  node.subscriptionActive = false;
  actionHelper.idle(node);
  subscribeOptions.resolve();
};

const handleInput = (node, msg) => {
  const action = msg.action || (node.subscriptionActive ? 'unsubscribe' : 'subscribe');
  const realAction = (org, payload, nforce) => {
    return new Promise((resolve, reject) => {
      const subscribeOptions = {
        node,
        org,
        msg,
        oauth: payload.oauth,
        nforce,
        resolve,
        reject
      };
      if (action === 'subscribe') {
        createSubscription(subscribeOptions);
      } else {
        terminateSubscription(subscribeOptions);
      }
    });
  };
  actionHelper.inputToSFAction(node, msg, realAction);
};

// Make available to NodeRED
module.exports = function(RED) {
  function Streaming(config) {
    const node = this;
    RED.nodes.createNode(node, config);    
    node.connection = RED.nodes.getNode(config.connection);
    setupSubscriptionNode(node, config);
    node.on('input', (msg) => handleInput(node, msg));
    actionHelper.idle(node);
  }
  RED.nodes.registerType('streaming', Streaming);
};
