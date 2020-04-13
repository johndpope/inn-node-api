const express = require('express');
const router = express.Router();

var expandWorkerController = require('../controllers/expandWorker');

router.post('/',expandWorkerController);