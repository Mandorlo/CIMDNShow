// watchout commands used here can be found at http://www.eurolocation.fr/docs/watchout4.pdf page 228

var CMDLINE_USAGE = false; // set to true if you want to use this module from the cmd line

var net = require('net');
var _ = require('lodash');
var moment = require('moment');
var fs = require('fs');
var path = require('path');

var client = new net.Socket();
var connected = false;
var errorQueue = {};

var waitStatuses = 0;
var waitStatusRoom = [0, 0, 0, 0, 0];
var waitPing = false;
var showStatus = [
  [],
  [],
  [],
  [],
  []
];
var lastUpdate = null;

// on construit la liste des shows
var lang_list = ["FR", "EN", "AR", "HE", "ES", "IT", "DE", "PT", "RU", "PL", "JA", "RO_IT", "ZH_EN", "LT_EN"];
var shows_list = _.flatten(_.map([1, 2, 3, 4], num => {
  return _.map(lang_list, lang => "Room " + num + " - " + lang)
}));

connect()
  .then(r => console.log('First time connection successful for watchoutStatus'))
  .catch(e => console.log('First time connection impossible for watchoutStatus :('));

// connect the socket to the watchout server
function connect() {
  return new Promise((resolve, reject) => {
    client.connect(3039, '192.168.100.33', function() {
      console.log('Client watchoutStatus Connected on ' + moment().format("DD-MM-YYYY HH:mm:ss") + ', authenticating now...');
      send("authenticate 1\n");
      connected = true;
      resolve(true)
    });

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
  })
}

client.on('data', function(data) {
  if (/Ready/gi.test(data)) {
    // console.log("watchoutStatus client is ready : " + data);
    waitPing = false;
    return
  }

  var s = parseStatus(data);
  if (s) {
    if (s.time1 != '0' || s.time2 != '0') {
      if (s.room) {
        showStatus[parseInt(s.room)] = s;
        waitStatusRoom[parseInt(s.room)]--
          // console.log("waitS=", waitStatusRoom[parseInt(s.room)])
      } else if (/Error 7 0 \"Command\: getStatus\;/gi.test(data)) {
        console.log("Error in getStatus...", data)
      } else {
        console.log("Error in getStatus, curr status=", s)
      }
    } else {
      if (s.room) waitStatusRoom[parseInt(s.room)]--;
    }
    waitStatuses--;
  } else console.log('Client Received: ' + data);
});

client.on('close', function() {
  connected = false;
  console.log('Client WatchoutStatus Connection closed');
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

function parseStatus(data) {
  var res = /Status "TaskList\:mItemList\:mItems\:TimelineTask \\\"([^\\]+)\\\"\"\s+([0-9]+)\s+([0-9]+)/.exec(data)
  if (res && res.length > 3) {
    var o = {
      name: res[1],
      time1: res[2],
      time2: res[3]
    }
    var res2 = /Room\s+([0-9]+)\s+\-\s+([A-Z]+)/.exec(res[1]);
    if (res2 && res2.length > 2) {
      o.room = res2[1];
      o.lang = res2[2];
    } else if (res[1] == "Entrance - INT") {
      o.room = "0";
      o.lang = null;
    } else {
      console.log("Problem parsing status : ", res2, o)
    }
    return o
  } else {
    console.log("data received is not a status")
    return null;
  }
}

function quit() {
  client.destroy();
  console.log("Client destroyed")
  connected = false;
}

function send(message) {
  if (!connected && !/authenticate/gi.test(message)) {
    console.log("Not connected to watchout server, cannot send message : ", message);
    return
  }
  try {
    var response = client.write(message);
    // console.log("Sent : " + message);
  } catch (exception) {
    console.log(exception);
  }
}

function getStatus(show_name) {
  send('getStatus 2 \"TaskList:mItemList:mItems:TimelineTask \\"' + show_name + '\\"\"\n');
}

function getStatusRoom(n) {
  if (!connected) return Promise.reject({
    error: true,
    description: "not connected to watchout server :(",
    errno: "WSOFFLINE"
  });
  if (n < 0 || n > 4) return Promise.reject({
    error: true,
    description: "Room '" + JSON.stringify(n) + "' is not a valid room number :("
  });

  var timeout_secondes = 5; // nb secondes au bout desquelles la fonction timeout et rejette la Promise
  var c = 0;
  var myList = _.map(lang_list, lang => "Room " + n + " - " + lang);
  if (n == 0) myList = ["Entrance - INT"];
  waitStatusRoom[n] = myList.length;
  showStatus[n] = null;
  var tic = moment();
  myList.forEach((show_name, i) => {
    setTimeout(() => {
      getStatus(show_name);
      if (i == myList.length - 1) tic = moment();
    }, parseInt(Math.random() * 800))
  })
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      var clock = setInterval(() => {
        c++
        if (waitStatusRoom[n] <= 0) {
          clearInterval(clock);
          if (showStatus[n] && showStatus[n].time2) showStatus[n].time2 = Math.max(0, showStatus[n].time2 - moment().diff(tic));
          resolve(showStatus[n])
        } else if (c > timeout_secondes * 10) {
          clearInterval(clock);
          console.log("getStatusRoom TIMEOUT :( " + JSON.stringify(showStatus[n]));
          reject(showStatus[n])
        }
      }, 100)
    }, 500)
  })
}

function getStatusAll() {
  if (!connected) return Promise.reject("not connected to watchout server :(");

  lastUpdate = moment();
  showStatus = [];
  waitStatuses = shows_list.length;
  shows_list.forEach(show_name => {
    setTimeout(() => {
      getStatus(show_name)
    }, parseInt(Math.random() * 4000))
  });
  var c = 0;
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      var clock = setInterval(() => {
        c++
        if (waitStatuses <= 0) {
          clearInterval(clock);
          resolve(showStatus)
        } else if (c > 200) {
          clearInterval(clock);
          console.log("getStatusAll TIMEOUT :( " + JSON.stringify(showStatus));
          reject(showStatus)
        }
      }, 100)
    }, 500)
  })
}

function ping() {
  if (!connected) {
    console.log("cannot ping because not connected to watchout server")
    return Promise.reject(false);
  }

  send("ping\n")

  waitPing = true;
  var c = 0;
  var c_interval = 100;

  return new Promise((resolve, reject) => {
    var myClock = setInterval(_ => {
      if (!waitPing) {
        clearInterval(myClock);
        resolve(true)
      } else if (c > 10) {
        waitPing = false;
        reject(false)
      }
      c++
    }, c_interval)
  })
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
  console.log("exiting watchoutStatus client...")
  quit()
  process.exit()
});



// ===== EXPORT USEFUL FUNCTIONS =====

module.exports = {
  quit: quit,
  send: send,
  connected: connected,
  getStatus: getStatus,
  getStatusAll: getStatusAll,
  getStatusRoom: getStatusRoom,
  lastUpdate: lastUpdate,
  ping: ping
}
