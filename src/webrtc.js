(function (window, PUBNUB) {
  var PREFIX = "pn_",               // Prefix for subscribe channels
      PEER_CONNECTIONS = {},        // Connection storage by uuid
      RTC_CONFIGURATION = null,     // Global config for RTC's
      UUID = null,                  // The current user's UUID
      PUBLISH_QUEUE = {},           // The queue of messages to send by UUID
      PUBLISH_TYPE = {              // Publish type enum
        STREAM: 1,
        MESSAGE: 2
      };

  // Global error handling function
  function error(message) {
    console['error'](message);
  };

  // Extend function for adding to existing objects
  function extend(obj, other) {
    for(var key in other) {
      obj[key] = other[key];
    }
    return obj;
  };

  // Initializes the WebRTC specific object variables.
  // This is put out here so we can call it on all instances as well as
  // the global PUBNUB instance.
  function initialize(uuid) {
    PEER_CONNECTIONS = {};
    RTC_CONFIGURATION = null;
    UUID = uuid;
    PUBLISH_QUEUE = {};

    UUID = uuid;

    var self = this;

    // Subscribe to our own personal channel to listen for data.
    this.subscribe({
      channel: PREFIX + uuid,
      callback: function (message) {
        message = JSON.parse(message);
        
        if (message.uuid != null) {
          var connected = PEER_CONNECTIONS[message.uuid];

          // Setup the connection if we do not have one already.
          if (connected == false) self.createP2PConnection(message.uuid);

          var connection = PEER_CONNECTIONS[message.uuid];

          if (message.sdp != null) {
            connection.connection.setRemoteDescription(new RTCSessionDescription(message.sdp));

            // Add ice candidates we might have gotten early.
            for (var i = 0; i < connection.candidates; i++) {
              connection.connection.addIceCandidate(new RTCIceCandidate(connection.candidates[i]));
              connection.candidates = [];
            }

            // If we did not create the offer then create the answer.
            if (connected == false) {
              var self = this;
              connection.connection.createAnswer(function (description) {
                self.gotDescription(description, connection);
              });
            }
          } else {
            if (connection.connection.remoteDescription != null) {
              connection.connection.addIceCandidate(new RTCIceCandidate(message.candidate));
            } else {
              // This is to prevent adding ice candidates before the remote description
              connection.candidates.push(message.candidate);
            }
          }
        }
      }
    });
  };

  // Polyfill support for web rtc protocols
  var RTCPeerConnection = window.webkitRTCPeerConnection ||
    window.mozRTCPeerConnection ||
    RTCPeerConnection;

  // SignalingChannel
  // The signaling channel handles sending data to and from a specific user channel.
  function SignalingChannel(pubnub, selfUuid, otherUuid) {
    // The send function is here so we do not count a reference to PubNub preventing its destruction.
    this.send = function (message) {
      message.uuid = selfUuid;
      message = JSON.stringify(message);
      pubnub.publish({
        channel: PREFIX + otherUuid,
        message: message
      });
    };
  };

  // Store out API so we can extend it on all instnaces.
  var API = {};

  // PUBNUB._gotDescription
  // This is the handler for when we get a SDP description from the WebRTC API.
  API['gotDescription'] = function (description, connection) {
    connection.connection.setLocalDescription(description);
    connection.signalingChannel.send({
      "sdp": description
    });
  };

  // PUBNUB.createP2PConnection
  // Signals and creates a P2P connection between two users.
  API['createP2PConnection'] = function (uuid) {
    if (PEER_CONNECTIONS[uuid] == null) {
      var pc = new RTCPeerConnection(RTC_CONFIGURATION, {optional:[{RtpDataChannels:true}]});
      var dc = pc.createDataChannel("pubnub", { reliable: false });
      var signalingChannel = new SignalingChannel(this, UUID, uuid);

      pc.onicecandidate = function (event) {
        signalingChannel.send({ "candidate": event.candidate });
      };

      pc.oniceconnectionstatechange = function (event) {
        console.log("connection state changed", event);
      };

      PUBLISH_QUEUE[uuid] = [];

      PEER_CONNECTIONS[uuid] = {
        stream: null,
        callback: null,
        dataChannel: dc,
        connection: pc,
        candidates: [],
        connected: false,
        signalingChannel: signalingChannel
      };

      var self = this;
      pc.createOffer(function (description) {
        self.gotDescription(description, PEER_CONNECTIONS[uuid]);
      });
    } else {
      error("Trying to connect to already connected user: " + uuid);
    }
  };

  // Helper function for sending messages with different types.
  function handleMessage(pc, message) {
    if (message.type == PUBLISH_TYPE.STREAM) {
      pc.connection.addStream(message.stream);
    } else if (message.type == PUBLISH_TYPE.MESSAGE) {
      pc.dataChannel.send(message.message);
    } else {
      error("Unrecognized RTC message type: " + message.type);
    }
  };

  // PUBNUB._peerPublish
  // Handles requesting a peer connection and emptying the queue when connected.
  API['_peerPublish'] = function (uuid) {
    if (PUBLISH_QUEUE[uuid] && PUBLISH_QUEUE[uuid].length > 0) {
      if (PEER_CONNECTIONS[uuid].connected == true) {
        handleMessage(pc, message);
        this._peerPublish(uuid);
      } else {
        // Set on connect handler
        var self = this;
        PEER_CONNECTIONS[uuid].connection.oniceconnectionstatechange = function (event) {
          // TODO: Figure out status type codes that come back from this event
          console.log("Connected state change: ", event);
          self._peerPublish(uuid);
        };
      }
    } else {
      // Nothing to publish
      return;
    }
  };

  // PUBNUB.publish overload
  API['publish'] = (function (_super) {
    return function (options) {
      if (options == null) {
        error("You must send an object when using PUBNUB.publish!");
      }

      if (options.user != null) {
        if (options.stream != null) {
          PUBLISH_QUEUE[uuid].push({
            type: PUBLISH_TYPE.STREAM,
            stream: options.stream
          });
          //PEER_CONNECTIONS[uuid].connection.addStream(options.stream);
        } else if (options.message != null) {
          PUBLISH_QUEUE[uuid].push({
            type: PUBLISH_TYPE.MESSAGE,
            message: options.message
          });
          //PEER_CONNECTIONS[uuid].dataChannel.send(options.message);
        } else {
          error("Stream or message key not found in argument object. One or the other must be provided for RTC publish calls!");
        }

        this._peerPublish(uuid);
      } else {
        _super.apply(this, arguments);
      }
    };
  })(PUBNUB['publish']);

  // PUBNUB.subscribe overload
  API['subscribe'] = (function (_super) {
    return function (options) {
      if (options == null) {
        error("You must send an object when using PUBNUB.subscribe!");
      }

      if (options.user != null) {
        var self = this,
            connection = PEER_CONNECTIONS[uuid];

        if (options.stream) {
          // Setup the stream added listener
          connection.stream = options.stream;
          connection.connection.onaddstream = function (event) {
            connection.stream(event.stream, event);
          };
        }

        if (options.callback) {
          // Setup the data channel callback listener
          connection.callback = options.stream;
          connection.dataChannel.onmessage = function (event) {
            connection.callback(event.data, event);
          };
        }
      } else {
        _super.apply(this, arguments);
      }
    }
  });

  // PUBNUB init overload
  PUBNUB['init'] = (function (_super) {
    return function (options) {
      // Grab the UUID
      var uuid = options.uuid || PUBNUB.uuid();
      options.uuid = uuid;

      // Create pubnub object
      var pubnub = _super.apply(this, [options]);

      // Initialize WebRTC variables
      initialize.call(pubnub, uuid);

      // Extend the WebRTC API
      pubnub = extend(pubnub, API);
      return pubnub;
    };
  })(PUBNUB['init']);

  extend(PUBNUB, API);

  // Also initialize the global PUBNUB object
  initialize.call(PUBNUB);

})(window, PUBNUB);