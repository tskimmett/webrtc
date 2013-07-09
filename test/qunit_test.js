test('basic test', function () {
  expect(1);
  ok(true, 'this had better work.');
});


test('can access the DOM', function () {
  expect(1);
  var fixture = document.getElementById('qunit-fixture');
  equal(fixture.innerText, 'this had better work.', 'should be able to access the DOM.');
});

var USER_1 = "USER_SOURCE",
    USER_2 = "USER_ECHO",
    API_TEST_CHANNEL = "api-test-channel",
    API_MSG_SEQ = ["START", "TEST1", { a: 3, b: [1, 3, 5] }, "END"],
    P = PUBNUB.init({
      publish_key: 'pub-c-b2d901ee-2a0f-4d89-8cd3-63039aa6dd90',
      subscribe_key: 'sub-c-c74c7cd8-cc8b-11e2-a2ac-02ee2ddab7fe',
      uuid: USER_1
    });

/**
 * Re-used variables for this module
 **/
var CORE_TEST_CHANNEL, CORE_TEST_MSG;
/**
 * Begin core tests
 **/
module("pubnub-core-integrity", {
  setup: function () {
    CORE_TEST_CHANNEL = "webrtc-testing",
    CORE_TEST_MSG = "Hello this is a test",
    // Give each test 5 seconds to complete
    setTimeout(start, 5000);
  }
});

asyncTest("channel pub/sub", 1, function () {
  P.subscribe({
    channel: CORE_TEST_CHANNEL,
    callback: function (msg) {
      P.unsubscribe({
        channel: CORE_TEST_CHANNEL
      });
      equal(msg, CORE_TEST_MSG, "Should receive the message we sent");
    },
    connect: function () {
      P.publish({
        channel: CORE_TEST_CHANNEL,
        message: CORE_TEST_MSG
      });
    }
  });
});

asyncTest("channel presence", 1, function () {
  var presenceWorking = false;
  P.subscribe({
    channel: CORE_TEST_CHANNEL,
    callback: function () { },
    presence: function (e) {
      if (!presenceWorking) {
        presenceWorking = true;
        P.unsubscribe({
          channel: CORE_TEST_CHANNEL
        });
        ok(true, "Presence working");
      }
    }
  });
});
// end core tests

// Now test WebRTC stuff
// How to do in a single window? Make an iframe to hold RTC partner and echo our messages
module("pubnub-webrtc-api", {
  setup: function () {
    // Give each test 5 seconds to complete
    setTimeout(start, 5000);
  }
});
asyncTest("subscribe/publish", API_MSG_SEQ.length, function () {
  var step = 0;
  P.subscribe({
    user: USER_2,
    callback: function (msg) {
      // The partner will echo whatever we send, so it should be equal to
      deepEqual(msg, API_MSG_SEQ[step++]);
      if (API_MSG_SEQ[step]) {
        P.publish({
          user: USER_2,
          message: API_MSG_SEQ[step]
        });
      }
    }
  });

  P.publish({
    user: USER_2,
    message: API_MSG_SEQ[step]
  });
});