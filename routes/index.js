var express = require('express');
var router = express.Router();
var ws = require('../services/watchout.js');
var wsStatus = require('../services/watchoutStatus.js');

var intro_duration = 1 * 60 + 30;
var room_duration = 15 * 60;

var corresp_lang = {
  "FR": "FRENCH",
  "EN": "ENGLISH",
  "AR": "ARABIC",
  "HE": "HEBREW",
  "SP": "SPANISH",
  "IT": "ITALIAN",
  "DE": "GERMAN",
  "PT": "PORTUGUESE",
  "RU": "RUSSIAN",
  "PL": "POLISH",
  "JA": "JAPANESE",
  "RO_IT": "ROMANIAN_ITALIAN",
  "ZH_EN": "CHINESE_ENGLISH",
  "LT_EN": "LITHUANIAN_ENGLISH"
}

var SIMUL = false; // si true, on n'evoie pas les commandes à watchout

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {
    title: 'CIMDN Show',
    shows: [],
    simul: SIMUL
  });
});


router.get('/play', function(req, res, next) {
  var ifsimul = (!SIMUL) ? "" : " (simul)";
  var show = req.query.show;
  var langue = req.query.lang;
  // rooms 1, 2, 3 or 4
  if (show == "1" || show == "2" || show == "3" || show == "4") {
    console.log("Play Room " + show + " in " + langue + ifsimul);
    if (!SIMUL) ws.playRoom(show, langue);
    res.send({
      'room': show,
      'lang': langue
    });
    // the full show with entrance intro music
  } else if (show == "0") {
    console.log("Play Full Show in " + langue + +" " + +ifsimul);
    if (!SIMUL) ws.run("Full Show " + corresp_lang[langue]);
    res.send({
      'room': show,
      'lang': langue
    });
    // alignments
  } else if (show == "Alignements") {
    console.log("Play Alignements" + ifsimul);
    if (!SIMUL) ws.run("Alignements");
    res.send({
      'room': show
    });
  } else {
    console.log("Unknown command play" + ifsimul, show, langue)
  }
});

router.get('/pause', function(req, res, next) {
  var ifsimul = (!SIMUL) ? "" : " (simul)";
  var show = req.query.show;
  var langue = req.query.lang;
  if (show == "1" || show == "2" || show == "3" || show == "4") {
    console.log("Pause Room " + show + " in " + langue + ifsimul);
    if (!SIMUL) ws.pauseRoom(show, langue);
    res.send({
      'room': show,
      'lang': langue
    });
  }
});

router.get('/stop', function(req, res, next) {
  var ifsimul = (!SIMUL) ? "" : " (simul)";
  var show = req.query.show;
  var langue = req.query.lang;
  if (show == "1" || show == "2" || show == "3" || show == "4") {
    console.log("Stop Room " + show + " in " + langue + ifsimul);
    if (!SIMUL) ws.stopRoom(show, langue);
    res.send({
      'room': show,
      'lang': langue
    });
    // the full show with entrance intro music
  } else if (show == "0") {
    console.log("Stop Full Show in " + langue + ifsimul);
    if (!SIMUL) {
      ws.kill("Full Show " + corresp_lang[langue]);
      ws.kill("Entrance - INT");
    }
    res.send({
      'room': show,
      'lang': langue
    });
    // alignments
  } else if (show == "Alignements") {
    console.log("Stop Alignements" + ifsimul);
    if (!SIMUL) ws.kill("Alignements");
    res.send({
      'room': 'Alignements',
      'state': 0
    });
  }
});

router.get('/door/open', (req, res, next) => {
  var ifsimul = (!SIMUL) ? "" : " (simul)";
  var type = req.query.type;
  var num = req.query.num;
  console.log("Door open " + type + " " + num + ifsimul);
  if (!SIMUL) ws.openDoor(type, num);
  res.send({
    'door': num,
    'type': type,
    'state': 'open'
  });
})

router.get('/door/close', (req, res, next) => {
  var ifsimul = (!SIMUL) ? "" : " (simul)";
  var type = req.query.type;
  var num = req.query.num;
  console.log("Door close " + type + " " + num + ifsimul);
  if (!SIMUL) ws.closeDoor(type, num);
  res.send({
    'door': num,
    'type': type,
    'state': 'close'
  });
})


// get the status of all the shows currently running
router.get('/status', (req, res, next) => {
  var num_room = req.query.room;
  if (SIMUL) {
    var statuses = {
      name: "Room " + num_room + " - IT",
      room: num_room,
      lang: "IT",
      time1: "2",
      time2: ((3 * 60 + 25) * 1000 + 323).toString()
    };
    res.send(statuses)
  } else {
    wsStatus.getStatusRoom(num_room).then(statuses => {
      if (!statuses) res.send({})
      else res.send(statuses)
    }).catch(e => {
      if (!e) e = {};
      e.error = true;
      res.send(e)
    })
  }
})

router.get('/watchoutstatus', (req, res, next) => {
  var action = req.query.action;
  if (action == 'ping' || action == 'status') {
    wsStatus.ping().then(status => {
      if (status) res.send("online");
      else res.send("offline")
    }).catch(e => {
      res.send("offline")
    })
  } else if (action == 'online') {
    ws.setOnline();
    setTimeout(_ => {
      wsStatus.ping().then(status => {
        if (status) res.send("online")
        else res.send({error: true, descr: "couldn't set watchout online :("})
      }).catch(e => {
        res.send({error: true})
      })
    }, 300)
  } else if (action == 'offline') {
    ws.setOffline();
    res.send('offline'); // TODO s'assurer que la commande s'est bien passée avant de renvoyer offline
  } else {
    console.log("ERROR : command watchoutstatus " + action + " is not valid")
  }
})

module.exports = router;
