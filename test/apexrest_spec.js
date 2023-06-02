/**
 * Tests for the connection configuration object
 */
const should = require('should');
const helper = require('node-red-node-test-helper');
const apexrestNode = require('../apexrest.js');

helper.init(require.resolve('node-red'));

describe('Salesforce Apex REST Node', function() {
  beforeEach(function(done) {
    helper.startServer(done);
  });

  afterEach(function(done) {
    helper.unload().then(function() {
      helper.stopServer(done);
    });
  });

  it('should be loaded', function(done) {
    const flow = [{ id: 'n1', type: 'apexrest', name: 'apexrest' }];
    helper.load(apexrestNode, flow, function() {
      const n1 = helper.getNode('n1');
      should(n1).have.property('name', 'apexrest');
      done();
    });
  });

  /*
   * TODO:
   * Execute Apex REST to mock server
   */
});
