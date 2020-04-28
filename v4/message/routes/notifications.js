const express = require('express');
const router = express.Router();
//const Notif = require('../models/notification'); // notification model for the DB
//const mongoose = require('mongoose'); // mongoDB 

const NotController = require('../controllers/notifications');

// Handle incoming POST request to process the json to send to FCM
router.post('/' ,NotController.checkRequestFileds,NotController.checkCustomFields,NotController.checkEvents,NotController.checkEmojis, NotController.send2Fcm);
router.post('/persist' ,NotController.persist);











module.exports = router;