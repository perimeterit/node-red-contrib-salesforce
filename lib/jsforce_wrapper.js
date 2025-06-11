const jsforce = require('jsforce');
// Uncomment when nforce8 2.0.8 is available
//const API_VERSION = nforce8.API_VERSION;
const API_VERSION = '45.0';

const oAuthMap = {}; // Capture oauth info for reuse

const getOAuth = (orgConfig) => {
  const curUser = orgConfig.userName;
  return oAuthMap[curUser];
};

const setOAuth = (oauth, orgConfig) => {
  const curUser = orgConfig.userName;
  oAuthMap[curUser] = oauth;
};

/**
 *
 * @param {configOptions} configOptionsRaw from setup node
 * @param {msg} msg incoming message that might have overwrites
 * @returns {org} SFDC Org to be able to authenticate
 *
 */
const prepareConnection = (configOptionsRaw, msg) => {
  const configOptions = mergeConfigOptionsWithMsg(configOptionsRaw, msg);
  const conn = new jsforce.Connection({
    loginUrl: configOptions.environment === 'sandbox'
      ? 'https://test.salesforce.com'
      : 'https://login.salesforce.com',
    clientId: configOptions.consumerKey,
    version: configOptions.apiVersion,
    clientSecret: configOptions.consumerSecret,
    redirectUri: configOptions.callbackUrl,
  });

  if (configOptions.usePotUrl && configOptions.poturl) {
    conn.instanceUrl = configOptions.poturl;
  }

  return {
    conn: conn,
    config: configOptions
  };
};


/**
 * wrapper around the org.authenticate function
 * @param {org} org  SFDC Org ready to authenticate
 * @param {configOptions} configOptions from config and msg
 */
const authenticate = async (conn, configOptions, oAuthCandidate) => {
  if (oAuthCandidate && await isValidOAuth(oAuthCandidate, conn)) {
    return Promise.resolve(oAuthCandidate);
  }

  return conn.login(configOptions.userName, configOptions.passWord)
    .then(userInfo => ({
      access_token: conn.accessToken,
      instance_url: conn.instanceUrl,
      id: userInfo.id,
      issued_at: Date.now().toString(),
      signature: '',
      token_type: 'Bearer',
    }));
};


// eslint-disable-next-line no-unused-vars
const isValidOAuth = async (candidate, conn, clientId, clientSecret) => {
  if (!candidate) return false;

  const requiredFields = [
    'access_token',
    'id',
    'instance_url',
    'issued_at',
    'signature',
    'token_type'
  ];

  for (const field of requiredFields) {
    if (!candidate[field]) {
      return false;
    }
  }

  if (!candidate.expires_at) {
    const baseAuth = Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64');
    const body = new URLSearchParams();
    body.append("token", candidate.access_token);

    const response = await fetch(candidate.instance_url + "/services/oauth2/introspect", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "Authorization": `Basic ${baseAuth}`
      },
      body: body.toString()
    });

    const json = await response.json();
    let exp = json.exp ? json.exp * 1000 : (parseInt(candidate.issued_at) + 13 * 60 * 1000);
    candidate.expires_at = exp.toString();
  }

  return Date.now() < parseInt(candidate.expires_at);
};


/**
 * Define config options from msg object
 * @param {configOptions} configOptions the current configuration settings
 * @param {msg} msg the actual incoming message that might contain identity information
 * @returns {configOptions} config options merged with what was found in the msg object
 */
const mergeConfigOptionsWithMsg = (configOptions, msg) => {
  const connectionOptionResult = { ...configOptions };
  //  Credentials from the msg object will always overwrite the stored
  // properties if the configuration allows that. We copy ALL properties
  // from the sf object
  if (connectionOptionResult.allowMsgCredentials && msg && msg.sf) {
    const sfProperties = msg.sf;
    for (let prop in sfProperties) {
      // We need to check for username/password separate
      // since they are camelCase starting v0.7
      if (prop.toLowerCase() === 'username') {
        connectionOptionResult.userName = sfProperties[prop];
      } else if (prop.toLowerCase() === 'password') {
        connectionOptionResult.passWord = sfProperties[prop];
      } else if (sfProperties.hasOwnProperty(prop)) {
        connectionOptionResult[prop] = sfProperties[prop];
      }
    }
  }
  return connectionOptionResult;
};

/**
 * Checks for Salesforce headers in msg object to send back to SF
 * @param {*} payload - the data to be posted
 * @param {*} msg - the incoming message
 */
const extractHeaders = (payload, msg) => {
  if (payload && msg && msg.sf && msg.sf.headers) {
    payload.headers = msg.sf.headers;
  }
};

module.exports = {
  createConnection: prepareConnection,
  authenticate: authenticate,
  force: jsforce,
  getOAuth: getOAuth,
  setOAuth: setOAuth,
  extractHeaders: extractHeaders,
  API_VERSION: API_VERSION
};
