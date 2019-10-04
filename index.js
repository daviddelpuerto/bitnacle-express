'use strict';

const { bitnacleFormats, bitnacleLevels, bitnacleTimer} = require('bitnacle-helpers');

function checkLoggerCall(options) {
    if (options.constructor.name === 'IncomingMessage') throw new Error('It seems you are using bitnacle middleware this way "app.use(binacleMw)", but it should be used "app.use(bitnacleMw())".');

    if (typeof options !== 'object') throw new Error('Invalid argument type, you must pass and object to bitnacleExpress middlewares.');

    if (options.format && bitnacleFormats[options.format] === undefined) throw new Error('Invalid format for bitnacleExpress, use one of the following: simple, json or extended.');
};

function getRequestProperties(req) {
    const { hostname, headers, id, method } = req;

    return {
        hostname, 
        headers,
        id, 
        method,
        params: req.params && Object.keys(req.params).length,
        query: req.query && Object.keys(req.query).length,
        remoteAddress: req.clientIp || req.ip,
        endpoint: req.url || req.originalUrl
    };
};

function getElapsedTime(requestStartTime) {
    return `${Date.now() - requestStartTime}ms`;
};

function getLogMessageObject(time, level, statusCode, { hostname, ...req }, elapsedTime) {
    return {
        time,
        level,
        hostname,
        req,
        statusCode,
        elapsedTime
    };
};

function logger(options = {}) {

    checkLoggerCall(options);

    const format = options.format || 'simple';
    
    return (req, res, next) => {
        
        const formattedRequestTime = bitnacleTimer.getRequestTime();
        const requestStartTime = Date.now();
        
        function afterResponse() {

            return new Promise((resolve, reject) => {
                
                res.removeListener('finish', afterResponse);
                res.removeListener('close', afterResponse);
                
                const { statusCode } = res;
                const level = bitnacleLevels.getLogLevel(res);
                const requestProperties = getRequestProperties(req);
                const elapsedTime = getElapsedTime(requestStartTime);
                
                const logMessageObject = getLogMessageObject(formattedRequestTime, level, statusCode, requestProperties, elapsedTime);
                
                const logMessage = bitnacleFormats[format](logMessageObject);
                
                process.stdout.write(logMessage);
                
                resolve();

            });
        }
        
        res.on('finish', afterResponse);
        res.on('close', afterResponse);
        
        next();
    };

};

function errorLogger(options = {}) {

    checkLoggerCall(options);

    const format = options.format || 'simple';

    return function(err, req, res, next) {

        const errorMessageObject = {
            time: bitnacleTimer.getRequestTime(), 
            level: 'ERROR',
            req: {
                method: req.method, 
                endpoint: req.originalUrl || req.url,
                remoteAddress: req.ip || req.clientIp,   
                id: req.id
            },
            message: err
        };

        const errorMessage = bitnacleFormats[format](errorMessageObject);

        process.stderr.write(errorMessage);

        next(err);

    };

};

module.exports = {
    checkLoggerCall,
    logger,
    errorLogger
};