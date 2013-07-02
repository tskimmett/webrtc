var canvas = document.getElementById("pongTable"),
    body = document.body;

/***
  MULTIPLAYER COMMUNICATION
 ***/
var CHANNEL = "rtc-pong-test";
var pubnub = PUBNUB.init({
  publish_key: 'pub-c-b2d901ee-2a0f-4d89-8cd3-63039aa6dd90',
  subscribe_key: 'sub-c-c74c7cd8-cc8b-11e2-a2ac-02ee2ddab7fe'
});

var opponent = {
  uuid: null,
  paddle: null
};
var me = {
  uuid: pubnub.UUID,
  paddle: null
};
var started = oppReady = false;

pubnub.subscribe({
  channel: CHANNEL,
  callback: function (msg) {

  },
  presence: function (msg) {
    console.log("Presence: ", msg);
    if (opponent.uuid === null && msg.uuid !== me.uuid) {
      console.log("Starting game with: ", msg.uuid);
      setupGame(msg.uuid);
    }
  }
});

function setupGame(uuid) {
  opponent.uuid = uuid;
  pubnub.subscribe({
    user: uuid,
    callback: handleGameMsg
  });
  pubnub.history({
    user: uuid,
    callback: function (messages) {
      console.log("History: " + messages);
      messages = messages[0];
      messages.forEach(handleGameMsg);
    }
  });
  if (!started) {
    var msg = {
      type: "start",
    };
    msg[me.uuid] = "p1";
    pubnub.publish({
      user: uuid,
      message: msg
    });
    started = true;
  };
};

function sendUpdate() {
  pubnub.publish({
    user: opponent.uuid,
    message: {
      type: "update",
      p: {
        x: me.paddle.x,
        y: me.paddle.y,
        delta: me.paddle.delta
      }
    }
  });
};

function handleGameMsg(msg) {
  console.log("Game message: ", msg);
  if (msg.type === "start") {
    started = true;
    oppReady = true;
    pubnub.publish({
      user: opponent.uuid,
      message: {
        type: "ready"
      }
    });
    if (me.uuid > opponent.uuid) {
      me.paddle = p1;
      opponent.paddle = p2;
    }
    else {
      me.paddle = p2;
      opponent.paddle = p1;
    }
    started = true;
    drawLoop = setInterval(draw, FRAME_RATE);
    ball.x = msg.ball.x;
    ball.y = msg.ball.y;
    ball.delta = msg.ball.delta;
  }
  else if (msg.type === "ready") {
    oppReady = true;
    if (me.uuid > opponent.uuid) {
      me.paddle = p1;
      opponent.paddle = p2;
    }
    else {
      me.paddle = p2;
      opponent.paddle = p1;
    }
    resetBall();
  }
  else if (msg.type === "update") {
    opponent.paddle.x = msg.p.x;
    opponent.paddle.y = msg.p.y;
    //opponent.paddle.delta = msg.p.delta;
  }
  else if (msg.type === "reset") {
    ball.x = msg.ball.x;
    ball.y = msg.ball.y;
    ball.delta = msg.ball.delta;
  }
};

var FRAME_RATE = 1000 / 60;   // 60 FPS
var HIT_TOLERANCE = 5;
var drawLoop;

var TABLE = {
  w: 900,
  h: 500,
  color: "black"
};
var PADDLE = {
  w: 20,
  h: 60,
  offset: 8,
  step: 15,
  color: "white"
};
var BALL = {
  rad: 8,
  color: "white"
};

function randomNegative() {
  var n = Math.floor(Math.random() * 2);
  if (n === 1) {
    return 1;
  }
  else {
    return -1;
  }
};
function Drawable(params) {
  var defaults = {
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    delta: { x: 0, y: 0 },
    context: null
  };
  for (var p in defaults) {
    this[p] = defaults[p]
  }
  for (var p in params) {
    this[p] = params[p];
  }
};

// Create the table base
var table = canvas.getContext("2d");
table.fillStyle = TABLE.color;

/***
  Setup the paddles
 ***/
// Left side
var p1 = new Drawable({
  context: canvas.getContext("2d"),
  x: PADDLE.offset,
  y: 0,
  w: PADDLE.w,
  h: PADDLE.h,
  name: "p1"
});

// Right side
var p2 = new Drawable({
  context: canvas.getContext("2d"),
  x: TABLE.w - PADDLE.w - PADDLE.offset,
  y: TABLE.h - PADDLE.h,
  w: PADDLE.w,
  h: PADDLE.h,
  name: "p2"
});

var ball = new Drawable({
  context: canvas.getContext("2d"),
  x: TABLE.w / 2,
  y: TABLE.h / 2,
  w: BALL.rad,
  h: BALL.rad
});

/***
  Manipulate game objects
 ***/
function movePaddle(p, up) {
  console.log("Moving paddle: ", p);
  var mult = (up === true ? -1 : 1);
  p.delta.y = mult * PADDLE.step;
  sendUpdate();
};

function stopPaddle(p) {
  p.delta.y = 0;
  sendUpdate();
};

function constrain(drawable) {
  var right = drawable.x + drawable.w,
      bottom = drawable.y + drawable.h;
  if (drawable.x < 0) {
    drawable.x = 0;
  }
  else if (right > TABLE.w) {
    drawable.x = TABLE.w - drawable.w;
  }
  if (drawable.y < 0) {
    drawable.y = 0;
  }
  else if (bottom > TABLE.h) {
    drawable.y = TABLE.h - drawable.h;
  }
};

function areTouching(a, b) {
  return (Math.abs(a - b) <= HIT_TOLERANCE);
};

function insideRange(r1, r2, test) {
  return (Math.max(r1, r2) >= test && Math.min(r1, r2) <= test);
};

function bounce(b) {
  var top = b.y - b.h,
      left = b.x - b.w,
      right = b.x + b.w,
      bottom = b.y + b.h;
  // Did we hit a wall?
  if (areTouching(top, 0) || areTouching(bottom, TABLE.h)) {
    // Bounce off wall (reverse delta-y)
    b.delta.y *= -1;
  }
  // See if we hit left paddle
  if (insideRange(p1.y, p1.y + p1.h, b.y) && areTouching(p1.x + p1.w, left)) {
    b.delta.x *= -1;
  }
  if (insideRange(p2.y, p2.y + p2.h, b.y) && areTouching(p2.x, right)) {
    b.delta.x *= -1;
  }

  if (b.x < 0 || b.x > TABLE.w) {
    resetBall();
  }
};

function resetBall() {
  var msg = {
    type: "reset",
    ball: {
      delta: {
        x: ((Math.random() * 10) + 1) * randomNegative(),
        y: ((Math.random() * 10) + 1) * randomNegative()
      },
      x: TABLE.w/2,
      y: TABLE.h/2
    }
  };
  pubnub.publish({
    user: opponent.uuid,
    message: msg
  });
  handleGameMsg(msg);
};

function draw() {
  // Clear the canvas
  table.clearRect(0, 0, TABLE.w, TABLE.h);

  // Re-fill table
  table.fillStyle = TABLE.color;
  table.fillRect(0, 0, TABLE.w, TABLE.h);

  /****
    Re-draw objects by calculating positions based on current delta
   ****/
  p1.y += p1.delta.y;
  constrain(p1);
  p1.context.fillStyle = PADDLE.color;
  p1.context.fillRect(p1.x, p1.y, PADDLE.w, PADDLE.h);

  p2.y += p2.delta.y;
  constrain(p2);
  p2.context.fillStyle = PADDLE.color;
  p2.context.fillRect(p2.x, p2.y, PADDLE.w, PADDLE.h);

  if (me.paddle.delta.y !== 0) {
    sendUpdate();
  }

  ball.x += ball.delta.x;
  ball.y += ball.delta.y;
  bounce(ball);
  ball.fillStyle = BALL.color;
  ball.context.beginPath();
  ball.context.arc(ball.x, ball.y, ball.w, 0, 2 * Math.PI);
  ball.context.stroke();
  ball.context.fill();
};

/***
  Register event handlers
 ***/
var keys = {
  up: 38,
  down: 40,
  left: 37,
  right: 39,
  escape: 27
};

body.addEventListener("keydown", function (e) {
  console.log("keydown: " + e.which);
  // Move the paddle
  if (e.which === keys.up || e.which === keys.left) {
    movePaddle(me.paddle, true);
  }
  else if (e.which === keys.down || e.which === keys.right) {
    movePaddle(me.paddle, false);
  }
});

body.addEventListener("keyup", function (e) {
  // Move the paddle
  if (e.which === keys.up || e.which === keys.down || e.which === keys.left || e.which === keys.right) {
    stopPaddle(me.paddle);
  }
});

body.addEventListener("keyup", function (e) {
  if (e.which === keys.escape) {
    clearInterval(drawLoop);
  }
});
