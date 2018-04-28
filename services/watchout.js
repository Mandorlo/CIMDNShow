// inspiration : https://gist.github.com/tedmiston/5935757
// all commands sent to watchout have to end with a \n
// watchout commands : http://www.eurolocation.fr/docs/watchout4.pdf page 221

const CMDLINE_USAGE = false // set to true if you want to use this module from the cmd line
const IP_ADDR = '192.168.100.53'
const PORT = 3040

let net = require('net')
let _ = require('lodash')
let moment = require('moment')
let process = require('process')
process.setMaxListeners(2);

let client = new net.Socket()
let connected = false
let errorQueue = {}

connect()

function connect() {
  if (!client.connecting) {
    errorQueue = {}
    client.connect(PORT, IP_ADDR);
  }
}

client.on('connect', function() {
  console.log('Client Connected on ' + moment().format("DD-MM-YYYY HH:mm:ss"));
  connected = true;
  return connected
})

client.on('data', function(data) {
  console.log('Client Received: ' + data);
  //client.destroy(); // kill client after server's response
})

client.on('close', function() {
  connected = false
  let h = moment().hours()
  let ms = (h > 8 && h < 22) ? 2000 : 10800000
  setTimeout(connect, ms)
});

client.on('error', e => {
  let h = moment().hours()
  let ms = (h > 8 && h < 22) ? 2000 : 10800000

  if (e.errno && e.errno == "ECONNRESET") {
    printText("Trying to reconnect...")
  } else if (e.errno && e.errno == "ETIMEDOUT") {
    errorQueue['timedout'] = true;
    printText(`Timeout to connect to watchout server, Waiting ${ms/1000}s before connection retry...`)
  } else if (e.errno && e.errno == "EHOSTUNREACH") {
    errorQueue['hostunreach'] = true
    printText(`Unable to reach watchout server, waiting ${ms/1000}s before connection retry...`)
  } else {
    console.log("Socket watchoutStatus error : ", e)
    console.log(`Waiting ${ms/1000}s before connection retry...`)
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

function printText(texte) {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  process.stdout.write(texte);
}


// ====== TERMINATE GRACEFULLY =====
if (process.platform === "win32" && !CMDLINE_USAGE) {
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
