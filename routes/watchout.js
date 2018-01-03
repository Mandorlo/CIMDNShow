var express = require('express');
var router = express.Router();
var ws = require('../services/watchout.js');


router.get('/', function(req, res, next) {
  res.send({'coco': riri});
});

module.exports = router;
