// inspiration : https://gist.github.com/tedmiston/5935757
// all commands sent to watchout have to end with a \n
// watchout commands : http://www.eurolocation.fr/docs/watchout4.pdf page 221

var CMDLINE_USAGE = false; // set to true if you want to use this module from the cmd line

var net = require('net');
var _ = require('lodash');
var moment = require('moment');

var client = new net.Socket();
var connected = false;
var errorQueue = {};

connect();

function connect() {
  return new Promise((resolve, reject) => {
    client.connect(3040, '192.168.100.53', function() {
      console.log('Client Connected on ' + moment().format("DD-MM-YYYY HH:mm:ss"));
      connected = true;
      resolve(true)
    });
  })

  var myClock = setInterval(_ => {
    if (!connected && errorQueue['timedout']) {
      errorQueue['timedout'] = undefined;
      clearInterval(myClock);
      reject(false)
    } else if (connected) {
      clearInterval(myClock);
      return
    }
  }, 200)
}

client.on('data', function(data) {
  console.log('Client Received: ' + data);
  //client.destroy(); // kill client after server's response
});

client.on('close', function() {
  console.log('Client Connection closed');
});

client.on('error', e => {
  if (e.errno && e.errno == "ECONNRESET") {
    connected = false;
    console.log("Trying to reconnect...")
    connect()
  } else if (e.errno && e.errno == "ETIMEDOUT") {
    connected = false;
    errorQueue['timedout'] = true;
    console.log('Unable to connect to watchout server (time out)')
  } else {
    console.log("Socket watchoutStatus error : ", e)
  }
})

function quit() {
  client.destroy();
  console.log("Client destroyed")
  connected = false
}

function send(message) {
  try {
    var response = client.write(message);
    console.log("Sent : " + message);
  } catch (exception) {
    console.log(exception);
  }
}

function setOnline() { // sets the watchout in the online status
  send('online true\n')
}

function setOffline() { // sets the watchout in the offline status
  send('online false\n')
}

function toggle(timeline) {
  if (states[timeline]) {
    halt(timeline);
  } else {
    run(timeline);
  }
}

function kill(timeline) {
  send('kill \"' + timeline + '\"\n');
}

function playRoom(n, lang) {
  var timeline = 'Room ' + n + " - " + lang;
  run(timeline)
}

function pauseRoom(n, lang) {
  var timeline = 'Room ' + n + " - " + lang;
  halt(timeline)
}

function stopRoom(n, lang) {
  var timeline = 'Room ' + n + " - " + lang;
  kill(timeline)
}

function openDoor(type, n) { // type = "entrance" || "exit"
  var name = "R" + n + " open " + type + " door";
  send('run \"' + name + '\"\n');
}

function closeDoor(type, n) { // type = "entrance" || "exit"
  var name = "R" + n + " close " + type + " door";
  send('run \"' + name + '\"\n');
}

function run(timeline) {
  send('run \"' + timeline + '\"\n');
}

function halt(timeline) {
  send('halt \"' + timeline + '\"\n');
}

function gotoControlCue(timeline, command) {
  send('gotoControlCue \"' + command + '\" false ' + timeline + '\n');
}


// ====== TERMINATE GRACEFULLY =====
if (process.platform === "win32"  && !CMDLINE_USAGE) {
  var rl = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on("SIGINT", function() {
    process.emit("SIGINT");
  });
}

process.on("SIGINT", function() {
  console.log("exiting watchout client...")
  quit()
  process.exit()
});


// ===== EXPORT USEFUL FUNCTIONS =====
module.exports = {
  client: client,
  send: send,
  connected: connected,
  toggle: toggle,
  kill: kill,
  run: run,
  playRoom: playRoom,
  pauseRoom: pauseRoom,
  stopRoom: stopRoom,
  openDoor: openDoor,
  closeDoor: closeDoor,
  halt: halt,
  gotoControlCue: gotoControlCue,
  setOnline: setOnline,
  setOffline: setOffline,
  quit: quit
}
