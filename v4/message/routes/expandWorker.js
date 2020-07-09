const express = require('express');
const router = express.Router();

var expandWorkerController = require('../controllers/expandWorker');
var expandWorkerController2 = require('../controllers/ew');

// Handle incoming POST request to the expandWorker
router.post('/*',expandWorkerController);
router.post('/*',expandWorkerController2);




module.exports = router;