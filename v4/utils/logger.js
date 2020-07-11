/**
 * Configurations of logger.
 */
const winston = require('winston');
const winstonRotator = require('winston-daily-rotate-file');

const consoleConfig = [
    new winston.transports.Console({
        'colorize': true
    })
];

const createLogger = new winston.Logger({
    'transports': consoleConfig
});

const EwLogs = createLogger;
EwLogs.add(winstonRotator, {
    'name': 'expand-worker',
    'level': 'info',
    'filename': '../logs/expandWorker.log',
    'json': false,
    'datePattern': 'yyyy-MM-dd-',
    'prepend': true
});

const dispatcherLog = createLogger;
dispatcherLog.add(winstonRotator, {
    'name': 'dispatcher',
    'level': 'info',
    'filename': '../logs/dispatcher.log',
    'json': false,
    'datePattern': 'yyyy-MM-dd-',
    'prepend': true
});

module.exports = {
    'expandWorkerLogging': EwLogs,
    'dispatcherLogging': dispatcherLog
};