'use strict';

const { bitnacleFormats, bitnacleLevels, bitnacleTimer} = require('bitnacle-helpers');

const checkLoggerCall = function(options) {
    if (options.constructor.name === 'IncomingMessage') {
        throw new Error('It seems you are using bitnacle middleware this way "app.use(binacleMw)", but it should be used "app.use(bitnacleMw())".');
    }

    if (typeof options !== 'object') {
        throw new Error('Invalid argument type, you must pass and object to bitnacleExpress middlewares.');
    }

    if (options.format && bitnacleFormats[options.format] === undefined) {
        throw new Error('Invalid format for bitnacleExpress, use one of the following: simple, json or extended.');
    }
}

const logger = function(options = {}) {

    try {

        checkLoggerCall(options);
    
        const format = options.format || 'simple';
    
        return (req, res, next) => {
            
            const time = bitnacleTimer.getRequestTime();
            const start = Date.now();
            
            function afterResponse() {
                
                res.removeListener('finish', afterResponse);
                res.removeListener('close', afterResponse);
                
                const level = bitnacleLevels.getLogLevel(res);
    
                const { hostname, headers, id, method } = req;
                const params = req.params && Object.keys(req.params).length;
                const query = req.query && Object.keys(req.query).length;
                const { statusCode } = res;
                const remoteAddress = req.clientIp || req.ip;
                const endpoint = req.originalUrl || req.url;
    
                const elapsedTime = `${Date.now() - start}ms`;
    
                const logMessageObject = {
                    time,
                    level,
                    hostname,
                    req: {
                        method,
                        endpoint,
                        headers,
                        remoteAddress,
                        params,
                        query,
                        id,
                    },
                    statusCode,
                    elapsedTime
                };
                
                const logMessage = bitnacleFormats[format](logMessageObject);
    
                console.log(logMessage);
            }
            
            res.on('finish', afterResponse);
            res.on('close', afterResponse);
            
            next();
        }
    }
   
    catch (err) {
        console.error('An error on bitnacle-express.logger occurred, please report this error');
        console.error(err);   
    }

}

const errorLogger = function(options = {}) {

    try {

        checkLoggerCall(options);
    
        const format = options.format || 'simple';

        return function(err, req, res, next) {

            const time = bitnacleTimer.getRequestTime();
            const level = 'ERROR';
            const { method, id } = req;
            const remoteAddress = req.ip || req.clientIp;
            const endpoint = req.originalUrl || req.url;
            const message = err;

            const errorMessageObject = {
                time, 
                level,
                req: {
                    method, 
                    endpoint,
                    remoteAddress,   
                    id
                },
                message
            }

            const errorMessage = bitnacleFormats[format](errorMessageObject);

            console.log(errorMessage);

            next(err);

        }

    } catch (error) {
        console.error('An error on bitnacle-express.errorLogger occurred, please report this error');
        console.error(err);   
    }   

}

module.exports = {
    logger,
    errorLogger
}