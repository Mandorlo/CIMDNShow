// inspiration : https://gist.github.com/tedmiston/5935757
// all commands sent to watchout have to end with a \n
// watchout commands : http://www.eurolocation.fr/docs/watchout4.pdf page 221

var net = require('net');
var _ = require('lodash');
var moment = require('moment');

var client = new net.Socket();

client.connect(3040, '192.168.100.53', function() {
  console.log('Client Connected on ' + moment().format("DD-MM-YYYY HH:mm:ss"));
});

client.on('data', function(data) {
  console.log('Client Received: ' + data);
  //client.destroy(); // kill client after server's response
});

client.on('close', function() {
  console.log('Client Connection closed');
});

client.on('error', e => {
  console.log("Socket error : ", e);
  client.connect(3040, '192.168.100.53', function() {
    console.log('Client Connected after error');
  });
})

client.on('disconnect', r => { // TODO : TO BE TESTED, don't know if this 'disconnect' actually exists
  console.log("Socket disconnected:", r);
  client.connect(3040, '192.168.100.53', function() {
    console.log('Client Connected again after disconnection');
  });
})

function quit() {
  client.destroy();
  console.log("Client destroyed")
}

function send(message) {
  try {
    var response = client.write(message);
    console.log("Sent : " + message);
  } catch (exception) {
    console.log(exception);
  }
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
  // states = _.filter(states, ['name', timeline]);
  // writeStates().catch(e => console.log("Error writing states after kill:", e));
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
  // states.push({
  //   'name': timeline,
  //   'start': moment()
  // });
  // writeStates().catch(e => console.log("Error writing states after run:", e));
}

function halt(timeline) {
  send('halt \"' + timeline + '\"\n');
  // states = _.filter(states, ['name', timeline]);
  // writeStates().catch(e => console.log("Error writing states after halt:", e));
}

function gotoControlCue(timeline, command) {
  send('gotoControlCue \"' + command + '\" false ' + timeline + '\n');
}

module.exports = {
  client: client,
  send: send,
  toggle: toggle,
  kill: kill,
  run: run,
  playRoom: playRoom,
  pauseRoom: pauseRoom,
  stopRoom: stopRoom,
  openDoor: openDoor,
  closeDoor: closeDoor,
  halt: halt,
  gotoControlCue: gotoControlCue
}
