const nforce8 = require('nforce8');
// Uncomment when nforce8 2.0.8 is available
//const API_VERSION = nforce8.API_VERSION;
const API_VERSION = 'v45.0';

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
  // Update configOptions from msg if there's incoming credentials
  const configOptions = mergeConfigOptionsWithMsg(configOptionsRaw, msg);

  // Now build the options we use to create the SFDC connection
  const orgOptions = {
    apiVersion: configOptions.apiversion || API_VERSION,
    clientId: configOptions.consumerKey,
    clientSecret: configOptions.consumerSecret,
    environment: configOptions.environment,
    mode: 'multi',
    redirectUri: configOptions.callbackUrl
  };

  // Overwrite the endpoints eventually - access instance directly
  if (configOptions.usePotUrl) {
    orgOptions.authEndpoint = configOptions.poturl;
    orgOptions.testAuthEndpoint = configOptions.poturl;
  }

  // Callout to SFDC, getting org object back
  const sfdcOrg = nforce8.createConnection(orgOptions);

  const result = {
    org: sfdcOrg,
    config: configOptions
  };

  return result;
};

/**
 * wrapper around the org.authenticate function
 * @param {org} org  SFDC Org ready to authenticate
 * @param {configOptions} configOptions from config and msg
 */
const authenticate = (org, configOptions, oAuthCandidate) => {
  // Don't reauthenticate if we are still good
  if (oAuthCandidate && isValidOAuth(oAuthCandidate, org)) {
    return Promise.resolve(oAuthCandidate);
  }

  const authOptions = {
    username: configOptions.userName,
    password: configOptions.passWord
  };

  // Returns a promise
  return org.authenticate(authOptions);
};

// eslint-disable-next-line no-unused-vars
const isValidOAuth = async (candidate, org) => {
  // 3 cases
  // case 1: no access_token or candidate token is invalid
  // case 2: access_token but expired
  // case 3: valid access_token

  // case 1
    if (!candidate) return false;

    const requiredFields = [
      'access_token',
      'id',
      'instance_url',
      'issued_at',
      'signature',
      'token_type'
    ];

    // Check presence of all required fields
    for (const field of requiredFields) {
      if (!candidate[field]) {
        return false;
      }
    }

    // add expiry date if not in there
    if(!candidate["expires_at"]){
      // grab expiry token
      const baseAuth = Buffer.from(`${org.clientId}:${org.clientSecret}`, 'utf8').toString('base64');
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

      let exp = 0;
      //error handling if "introspect all tokens" is false
      if(!json.exp){
        const issued_at = parseInt(candidate.issued_at, 10);
        const time = 13 * 60 * 1000; // 15 minutes
        exp = issued_at + time;
      }
      else{
        exp = json.exp * 1000;
      }
      candidate.expires_at = exp.toString();
    }

    // case 2 and 3
    const expiresAt = parseInt(candidate.expires_at, 10);
    const now = Date.now();
    return now < expiresAt;
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
  force: nforce8,
  getOAuth: getOAuth,
  setOAuth: setOAuth,
  extractHeaders: extractHeaders,
  API_VERSION: API_VERSION
};
