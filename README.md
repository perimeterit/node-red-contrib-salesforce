# node-red-contrib-salesforce

[![Greenkeeper badge](https://badges.greenkeeper.io/Stwissel/node-red-contrib-salesforce.svg)](https://greenkeeper.io/)

![Build status of master branch](https://travis-ci.org/Stwissel/node-red-contrib-salesforce.svg?branch=master)

A set of [Node-RED](http://www.nodered.org) nodes to interact with Salesforce and Force.com.

## Install

Run the following command in the root directory of your Node-RED install

```bash
npm install -s node-red-contrib-salesforce
```

## Usage

Each node uses a connection object to hold and share Salesforce connected app settings (consumer key, consumer secret, username, etc.). This determines the org that each node operates against. Credential information can alternatively been supplied by environment variables (Heroku, Bluemix, Azure friendly) or in the msg object.

### SOQL

Executes a SOQL query

```sql
select id, name
from contact
limit 2
```

If "Return JSON only" is selected, message.payload contains an array of result objects.
Otherwise the resulting message has the following properties:

- msg.payload.size - the number of records returned from the query
- msg.payload.records - the array of javascript nForce objects returned from the query. The nforce objects are useful for doing updates etc., as they have dirty checking and are already structured for an DML update, but do not match what Node-Red debug window shows.

The query can be configured in the node, however if left blank, the query should be set in an incoming message on `msg.query`. See the [Salesforce SOQL documentation](https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl) for more information.

### SOSL

Executes a SOSL query

```sql
FIND {united*} IN ALL FIELDS
RETURNING Account (Id, Name), Contact (Id, Name)
```

The resulting message has the following properties:

- msg.payload.size - the number of records returned from the query.
- msg.payload.records - the array of records returned from the query.

The query can be configured in the node, however if left blank, the query should be set in an incoming message on `msg.query`. See the [Salesforce SOSL documentation](https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl/sforce_api_calls_sosl.htm)or more information.

### DML

Executes an insert, update, upsert or delete DML statement.

The action and object can be configured in the node, however if left blank, the following should be set in an incoming message:

- `msg.action` - the DML action to perform
- `msg.object` - the sObject for the DML action

#### Insert Action

This action inserts the contents of `msg.payload` and returns the newly created ID.

```json
{
  "firstname": "Nikola",
  "lastname": "Tesla"
}
```

#### Update Action

This action updates the specified record with the the contents of `msg.payload`. It assumes that the payload contains an `id` property with the id of the record to be updated.

```json
{
  "id": "00337000002uFbW",
  "firstname": "Nikola",
  "lastname": "Tesla"
}
```

#### Upsert Action

The upsert action matches contents of the `msg.payload` with existing records by comparing values of one field. If you don’t specify a field when calling this action, the operation uses the id value in the `msg.payload` to match with existing records to update. Alternatively, you can specify a field to use for matching in `msg.externalId`. This field must be marked as external ID. If a matching record is not found, a new records is inserted.

Sample `msg.payload` to be used with an external id.

```json
{
  "firstname": "Nikola",
  "lastname": "Tesla"
}
```

Sample `msg.externalId` specifying the field and value to be used for matching.

```json
{
  "field": "Ext_ID_c",
  "value": "12345"
}
```

If record(s) are updated, the resulting payload will resemble:

```json
{
  "payload": {
    "success": true,
    "object": "contact",
    "id": {
      "field": "Ext_ID__c",
      "value": "12345"
    },
    "action": "update"
  }
}
```

If a new record is inserted, the resulting payload will resemble the following containing the id of the newly created record:

```json
{
  "payload": {
    "success": true,
    "object": "contact",
    "id": "00337000002uwUVAAY",
    "action": "insert"
  }
}
```

#### Delete Action

This action deletes the record specified by the id property in `msg.payload`.

```json
{
  "id": "00337000002uwUVAAY"
}
```

See the [Apex DML Operations](https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_dml_section.htm#apex_dml_insert) for more information.

### Streaming

Creates a client that subscribes to topics for the Streaming API.

Subscription starts once a msg is received as input. The msg object payload gets ignored, but the following properties are used when present:

- `action`: `subscribe` or `unsubscribe` When no action is configured it defaults to subscribe. An unknown value for action is interpreted as unsubscribe
- `topic`: the subscription topic to listen to, defaults to the one from configuration. Topic needs to be complete and start with `/`. See inline help for options
- `sf` : object with Salesforce credentials: `username`, `password`, `clientSecret`, `clientToken`. Can have just one of these. Uses configuration values as default

#### Supported events to subscribe

- Platform events: `/event/[NameOfPlatformEvent]` -> Listen to the Platform event API
- Push Topic: `/topic/[NameOfPushTopic]` -> Listen to changes in sObjects
- Streaming (Generic): `/u/notifications/[SomeChannelName]` -> Listen to generic Push Topics (deprecated)
- Change Data Capture:
  - All configured changes: `/data/ChangeEvents`
  - Opportunity: `/data/OpportunityChangeEvent` (Same for other Standard objects)
  - Custom object: `Custom__ChangeEvent` (replacing `__c` with `__ChangeEvent`

Check the [Developer guide for more details](https://developer.salesforce.com/docs/atlas.en-us.218.0.change_data_capture.meta/change_data_capture/cdc_subscribe_channels.htm").
When the client receives a message it sends `msg.payload` with the following:

- `msg.payload.event` - the information on the event that was received.
- `msg.payload.sobject` - the sobject information received.

Assuming a PushTopic was created with the query `SELECT Id, Name FROM Contact`, then a resulting message would look like:

```json
{
  "event": {
    "type": "updated",
    "createdDate": "2015-07-31T18:38:21.000+0000"
  },
  "sobject": {
    "Name": "Nikola Tesla",
    "Id": "a0037000001pplrZZZ"
  }
}
```

See the [Quick Start Using Workbench](https://developer.salesforce.com/docs/atlas.en-us.api_streaming.meta/api_streaming/quick_start_workbench.htm) to get started or the [Streaming API documentation](https://developer.salesforce.com/docs/atlas.en-us.api_streaming.meta/api_streaming/) for complete details.

### Outbound Messages (OBM)

When used with an http in node, parses the XML from a Salesforce Outbound Message to a JSON object.
The resulting `msg.payload` should look something like:

```json
{
  "organizationId": "00D37000000PdLZAE1",
  "actionId": "04k370000008OrqZZE",
  "sobject": {
    "type": "Contact",
    "id": "a0037000001I1EvWWO",
    "name": "Nikola Tesla",
    "firstname": "Nikola",
    "lastname": "Tesla"
  },
  "sessionId": "00D37000000PdLB!"
}
```

Connect this node downstream from a POST http input node to parse the XML received from an Outbound Message call from Salesforce. Use the URL from the http in node for the Endpoint URL for your Outbound Message. See the [Salesforce Setting Up Outbound Messaging documentation](https://developer.salesforce.com/docs/atlas.en-us.api.meta/api/sforce_api_om_outboundmessaging_setting_up.htm) for more information.

### Chatter

Posting chatter messages to users or objects. The msg payload turns into the body of the chatter message. Currently only plain text is supported.

```json
{
  "payload": "Hello World",
  "title": "Message title",
  "ParentId": "ID of object",
  "RelatedRecordId": "RelatedRecord"
}
```

When `ParentId` is not supplied, the user specified in the configuration is used. `RelatedRecordId` is optional.

Return value is similar (for now) to object insert

### Apex REST

Executes a Apex REST uri

An HTTP method and uri should be provided in the Apex REST node. Example uri:

```
/HelloWorldTest
```

The resulting message will depend on the HTTP method and uri. Test the example uri given above using the Apex file (HelloWorldTest.apxc) provided in the 'examples' folder.
