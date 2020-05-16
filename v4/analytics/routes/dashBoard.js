const express = require('express');
const router = express.Router();

var dashBoardController = require('../controllers/dashBoard');

// Handle incoming POST request to the dashBoard
router.post('/*',dashBoardController);

module.exports = router;