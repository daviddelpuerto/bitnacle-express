const stream = require('stream');

const { bitnacleFormats, bitnacleLevels, bitnacleTimer } = require('bitnacle-helpers');

function checkLoggerCall(options) {
  if (options.constructor.name === 'IncomingMessage') throw new Error('It seems you are using bitnacle middleware this way "app.use(binacleMw)", but it should be used "app.use(bitnacleMw())".');

  if (typeof options !== 'object') throw new Error('Invalid argument type, you must pass and object to bitnacleExpress middlewares.');

  if (options.format && bitnacleFormats[options.format] === undefined) throw new Error('Invalid format for bitnacleExpress, use one of the following: simple, json or extended.');
}

function getRequestProperties(req) {
  const {
    hostname, headers, id, method,
  } = req;

  const userAgent = headers['user-agent'];

  return {
    hostname,
    userAgent,
    headers,
    id,
    method,
    params: req.params && Object.keys(req.params).length,
    query: req.query && Object.keys(req.query).length,
    remoteAddress: req.clientIp || req.ip,
    endpoint: req.url || req.originalUrl,
  };
}

function getElapsedTime(requestStartTime) {
  return `${Date.now() - requestStartTime}ms`;
}

function getLogMessageObject(time, level, statusCode, { hostname, userAgent, ...req }, elapsedTime) {
  return {
    time,
    level,
    hostname,
    userAgent,
    req,
    statusCode,
    elapsedTime,
  };
}

function isWritableStream(obj) {
  return obj instanceof stream.Stream
        && typeof obj._write === 'function'
        && typeof obj._writableState === 'object';
}

function logger(options = {}) {
  checkLoggerCall(options);

  let appStreams = [];

  const format = options.format || 'simple';
  const { streams } = options;

  if (streams && streams.length) {
    appStreams = streams.map((appStream, index) => {
      if (isWritableStream(appStream)) return appStream;
      throw new Error(`stream[${index}] is not a writable stream\n`);
    });
  }

  return (req, res, next) => {
    const formattedRequestTime = bitnacleTimer.getRequestTime();
    const requestStartTime = Date.now();

    function afterResponse() {
      return new Promise((resolve) => {
        res.removeListener('finish', afterResponse);
        res.removeListener('close', afterResponse);

        const { statusCode } = res;
        const level = bitnacleLevels.getLogLevel(res);
        const requestProperties = getRequestProperties(req);
        const elapsedTime = getElapsedTime(requestStartTime);

        const logMessageObject = getLogMessageObject(formattedRequestTime, level, statusCode, requestProperties, elapsedTime);

        const logMessage = `${bitnacleFormats[format](logMessageObject)}\n`;

        process.stdout.write(logMessage);

        if (appStreams.length) {
          appStreams.forEach((appStream) => {
            appStream.write(logMessage);
          });
        }

        resolve();
      });
    }

    res.on('finish', afterResponse);
    res.on('close', afterResponse);

    next();
  };
}

function errorLogger(options = {}) {
  checkLoggerCall(options);

  const format = options.format || 'simple';

  return (err, req, res, next) => {
    const errorMessageObject = {
      time: bitnacleTimer.getRequestTime(),
      level: 'ERROR',
      req: {
        method: req.method,
        endpoint: req.url || req.originalUrl,
        remoteAddress: req.ip || req.clientIp,
        id: req.id,
      },
      message: err,
    };

    const errorMessage = bitnacleFormats[format](errorMessageObject);

    process.stderr.write(`${errorMessage}\n`);

    next(err);
  };
}

module.exports = {
  checkLoggerCall,
  logger,
  errorLogger,
};
