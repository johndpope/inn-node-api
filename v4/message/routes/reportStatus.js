const express = require('express');
const router = express.Router();

var reportStatusController = require('../controllers/reportStatus');

// Handle incoming POST request to the reportStatus
router.post('/*',reportStatusController);




module.exports = router;