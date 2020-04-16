const express = require('express');
const router = express.Router();

var expandWorkerController = require('../controllers/expandWorker');

// Handle incoming POST request to the expandWorker
router.post('/*',expandWorkerController);




module.exports = router;