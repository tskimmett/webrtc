PubNub WebRTC Beta API v0.0.1
======

PubNub now offers a new API for enhancing your WebRTC applications with the power of PubNub. Our WebRTC API will perform signaling between users and also add features such as history, presence, and more.

# Installation

Currently the API is only available through GitHub. This is because the API is changing daily and we would like everyone to be on the latest version. Just clone this repo and copy the `webrtc.beta.pubnub-*.*.*.js` from the bin/ folder into your app to get started. Be sure to add this after you include the PubNub API like so:

```html
<script type='text/javascript' src='http://cdn.pubnub.com/pubnub-*.*.*.min.js'></script>
<script type='text/javascript' src='/path/to/webrtc.beta.pubnub-*.*.*.min.js'></script>
```

# Getting Started

Here is the three minute getting started example. This will initialize the PubNub API, setup a RTCPeerConnection with a user, and publish a message to that user.

```javascript
var pubnub = PUBNUB.init({
  publish_key: 'demo',
  subscribe_key: 'demo'
});

// Here is where you can use PubNub Presence to get the UUID of the other user
// var uuid = 'ABC123'

var peerConnection = pubnub.createP2PConnection(uuid); // This will happen automatically in later versions

pubnub.subscribe({
  user: uuid, // This tells PubNub to use WebRTC Data Channel
  callback: function (message) {
    console.log("I got the message: ", message);
  }
});

pubnub.publish({
  user: uuid, // This tells PubNub to use WebRTC Data Channel
  message: "Hello World!"
});
```

# API Reference

## pubnub.createP2PConnection(uuid)

This sets up a P2P connection to the given unique user ID. The UUID is the one given by the PubNub API after initializing and can either be set in `PUBNUB.init` or grabbed from a PubNub presence call. This will more than likely be taken out in later versions of the API and automatically get called in the `publish` and `subscribe` calls. It is in here to eliminate race condition handling up front.

## pubnub.publish(options)

This publishes a message to a given user if the `user` key is used instead of `channel`.

Options:
* user: The unique user ID to send the message to
* [message]: The string to send using WebRTC Data Channel
* [stream]: The video or audio stream to add to the peer connection

Example:
```javascript
pubnub.publish({
  user: 'ABC123',
  message: 'Hello there!'
});
```

## pubnub.subscribe(options)

This subscribes to messages from the given user if the `user` key is used instead of `channel`.

Options:
* user: The unique user ID to listen to
* [callback]: The function to call when a data message is received
* [stream]: The function to call when a video or audio stream is added to the connection

Example:
```javascript
pubnub.subscribe({
  user: 'ABC123',
  callback: function (message) {
    console.log('I got the message ', message);
  }
});
```

# Using the PubNub API

As a note you can still use the regular PubNub API like normal. It will pass through any `publish` and `subscribe` calls to the original API if they are not using the `user` key. This way you can use channel presence to find the right user to connect to.

# User Channel Names

In an effort to reduce pollution this API will make a subscribe call to a channel called `pn_<uuid>`. This is how the API sends the handshake and ICE server data to other users. Keep this in mind when subscribe to channels as these will be in use by the API.
