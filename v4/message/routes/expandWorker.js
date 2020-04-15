const express = require('express');
const router = express.Router();

var expandWorkerController = require('../controllers/expandWorker');

// Handle incoming POST request to the expandWorker
router.post('/*',expandWorkerController);
// router.post('/v1',expandWorkerController);




module.exports = router;