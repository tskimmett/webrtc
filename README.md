PubNub WebRTC SDK v0.4.3
======

PubNub now offers a new API for enhancing your WebRTC applications with the power of PubNub. Our WebRTC API will perform signaling between your users to allow them to connect with a RTCPeerConnection. From there you can use the PubNub API to enhance your peer application with features such as presence and history. PubNub Presence will allow you to find what users are connected to your application and give you a phonebook of people to connect to. You can also use history to see what connections you have made and reconnect to people from the past.

Read more about the [PubNub API](http://pubnub.com)

# Installation

As a prequisite you will need a PubNub API account. You can sign up for a free account at [pubnub.com](http://pubnub.com). From there you will also need to use the administration tool to enable history, presence, and elastic message sizes. Then grab your publish and subscribe key and follow the instructions below.

Currently the API is only available through GitHub. This is because the API is changing daily and we would like everyone to be on the latest version. Just clone this repo and copy the `webrtc.beta.pubnub-*.*.*.js` from the bin/ folder into your app to get started. Add this after adding the standard PubNub library like so:

```html
<script type='text/javascript' src='http://cdn.pubnub.com/pubnub-*.*.*.min.js'></script>
<script type='text/javascript' src='/path/to/webrtc-beta-pubnub-*.*.*.min.js'></script>
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

## How it Works

We utilize the standard PubNub framework to perform signaling between your peer users. This manages the sending of ICE candidates as well as SDP offers. It also gives you an easy unique identifier for every user so it is easy to list and request connections from other users.

## Using UUIDs

Every user on the PubNub network gets assigned a unique user ID. We can use this user ID to send data between our users to establish a RTCPeerConnection. We can use PubNub presence to get these user ID's when it fires join and leave events from the APi. You can read more about presence [here](http://www.pubnub.com/solutions/features).

# API Reference

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

## pubnub.unsubscribe(options)

This unsubscribes from a user and closes the data channel and peer connection to the other user.

Options:
* user: The unique user ID to unsubscribe from

Example:
```javascript
pubnub.subscribe({
  user: 'ABC123'
});
```

## pubnub.peerConnection(uuid, callback)

This will return the RTCPeerConnection object for the user ID given. If there is no RTCPeerConnection with the given user it will call the callback with `null`.

Options:
* uuid: The unique user ID to get the RTCPeerConnection for
* callback: The function that accepts one argument which is the RTCPeerConnection object

Example:
```javascript
pubnub.peerConnection('ABC123', function (pc) {
  
});
```

## pubnub.dataChannel(uuid, callback)

This will return the RTCDataChannel object for the user ID given. If there is no RTCDataChannel with the given user it will call the callback with `null`.

Options:
* uuid: The unique user ID to get the RTCDataChannel for
* callback: The function that accepts one argument which is the RTCDataChannel object

Example:
```javascript
pubnub.peerConnection('ABC123', function (dc) {
  
});
```

## pubnub.configurePeerConnection(rtcConfig, pcConfig)

This will change the configuration options when internally creating a RTCPeerConnection. The two arguments are the first and second argument in the creation code specifically.

Options:
* rtcConfig: The first argument when creating a new RTCPeerConnection
* pcConfig: The second argument when creating a new RTCPeerConnection

Example:
```javascript
pubnub.configurePeerConnection({
  iceServers: [{ 'url': 'stun:stun.l.google.com:19302' }]
}, {
  optional: [{ RtpDataChannels: true }]
});
```

# Using the PubNub API

As a note you can still use the regular PubNub API like normal. It will pass through any `publish` and `subscribe` calls to the original API if they are not using the `user` key. This way you can use channel presence to find the right user to connect to.

# User Channel Names

In an effort to reduce pollution this API will make a subscribe call to a channel called `pn_<uuid>`. This is how the API sends the handshake and ICE server data to other users. Keep this in mind when subscribe to channels as these will be in use by the API.
