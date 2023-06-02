/**
 * Tests for the connection configuration object
 */
const should = require('should');
const helper = require('node-red-node-test-helper');
const graphqlNode = require('../graphql.js');

helper.init(require.resolve('node-red'));

describe('Salesforce GraphQL Node', function() {
  beforeEach(function(done) {
    helper.startServer(done);
  });

  afterEach(function(done) {
    helper.unload().then(function() {
      helper.stopServer(done);
    });
  });

  it('should be loaded', function(done) {
    const flow = [{ id: 'n1', type: 'graphql', name: 'graphql' }];
    helper.load(graphqlNode, flow, function() {
      const n1 = helper.getNode('n1');
      should(n1).have.property('name', 'graphql');
      done();
    });
  });

  /*
   * TODO:
   * Execute GraphQL to mock server
   */
});
