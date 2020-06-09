const fs = require('fs');
const eventEmitter = require('events').EventEmitter;
const { expect } = require('chai');
const httpMocks = require('node-mocks-http');
const { stdout, stderr } = require('test-console');
const bitnaclExpress = require('../index');

const LOG_FILE = './test/sample.log';

fs.writeFileSync(LOG_FILE);

function route(req, res) {
  let data = [];

  req.on('data', (chunk) => {
    data.push(chunk);
    data = [
      ...data,
      chunk,
    ];
  });

  req.on('end', () => {
    data = Buffer.concat(data);
    res.write(data);
    res.end();
  });
}

describe('#logger()', async () => {
  it('should throw if options.constructor.name equals "IncomingMessage"', () => {
    expect(() => bitnaclExpress.logger({
      constructor: { name: 'IncomingMessage' },
    })).to.throw();
  });

  it('should throw if options is not an object', () => {
    expect(() => bitnaclExpress.logger('not an object')).to.throw();
  });

  it('should throw if options.format is not a Bitnacle format', () => {
    expect(() => bitnaclExpress.logger({
      format: 'Invalid format',
    })).to.throw();
  });

  it('should throw if options.streams includes non writable streams', () => {
    expect(() => bitnaclExpress.logger({
      streams: [
        'Invalid stream',
      ],
    })).to.throw();

    const readableStream = fs.createReadStream(LOG_FILE);

    expect(() => bitnaclExpress.logger({
      streams: [
        readableStream,
      ],
    })).to.throw();

    readableStream._write = () => {};
    readableStream._writableState = 'fake prop';

    expect(() => bitnaclExpress.logger({
      streams: [
        readableStream,
      ],
    })).to.throw();
  });

  it('should throw if options.streams is not an array', () => {
    expect(() => bitnaclExpress.logger({
      streams: 'invalid streams',
    })).to.throw();
  });

  it('should write to given stream if there are streams', () => {
    const writableStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
    expect(() => bitnaclExpress.logger({
      streams: [
        writableStream,
      ],
    }));
  });

  it('should write to given stream if there are streams', () => {
    expect(() => bitnaclExpress.logger());
  });


  describe('- Formats:', () => {
    describe('"simple', () => {
      const req = httpMocks.createRequest({
        method: 'GET',
        originalUrl: '/api/users',
        id: '9ff20b68-f46d-4eb5-9ef3-9cb077de1677',
        hostname: 'localhost',
        remoteAddress: '::1',
        headers: {
          'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.61 Safari/537.36',
        },
      });

      const res = httpMocks.createResponse({
        eventEmitter,
      });

      it('should log a well formatted message', (done) => {
        res.on('end', async () => {
          const simpleFormatCallback = bitnaclExpress.logger();
          const inspect = stdout.inspect();
          await simpleFormatCallback(req, res, () => {});
          inspect.restore();
          const logMessage = inspect.output[0];
          const wellFormattedLog = /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}:\d{3}[+-]\d{4}\]\s\[[\w]*\]\s\[[\w]*\]\s\[[/\w]*\]\s\[(.*?)\]\s\[[-\w]*\]\s\[[1-5]\d{2}\]\s\[[\d*]ms\]/.test(logMessage);

          expect(wellFormattedLog).to.equal(true);

          done();
        });

        route(req, res);
        req.send();
      });
    });

    describe('"json"', () => {
      const req = httpMocks.createRequest({
        method: 'GET',
        originalUrl: '/api/users',
        id: '9ff20b68-f46d-4eb5-9ef3-9cb077de1677',
        hostname: 'localhost',
        remoteAddress: '::1',
      });

      const res = httpMocks.createResponse({
        eventEmitter,
      });

      it('should log a well formatted message with all properties', (done) => {
        res.on('end', async () => {
          const writableStream = fs.createWriteStream(LOG_FILE);
          const jsonFormatCallback = bitnaclExpress.logger({
            format: 'json',
            streams: [writableStream],
          });
          const inspect = stdout.inspect();
          await jsonFormatCallback(req, res, () => {});
          inspect.restore();
          const logMessage = JSON.parse(inspect.output[0]);

          expect(logMessage).to.be.an('object').to.have.property('time');
          expect(logMessage).to.be.an('object').to.have.property('level', 'INFO');
          expect(logMessage).to.be.an('object').to.have.property('method', req.method);
          expect(logMessage).to.be.an('object').to.have.property('endpoint', req.originalUrl);
          expect(logMessage).to.be.an('object').to.have.property('id', req.id);
          expect(logMessage).to.be.an('object').to.have.property('statusCode');
          expect(logMessage).to.be.an('object').to.have.property('elapsedTime');

          done();
        });

        route(req, res);
        req.send();
      });
    });
  });
});

describe('#errorLogger()', () => {
  const req = httpMocks.createRequest({
    method: 'GET',
    originalUrl: '/api/users',
    id: '9ff20b68-f46d-4eb5-9ef3-9cb077de1677',
    hostname: 'localhost',
    remoteAddress: '::1',
  });

  it('should log a well formatted error log', async (done) => {
    const errorCallback = bitnaclExpress.errorLogger();
    const inspectError = stderr.inspect();
    errorCallback({}, req, {}, () => {});
    inspectError.restore();
    const errorLog = inspectError.output[0];
    const wellFormattedErrorLog = /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}:\d{3}[+-]\d{4}\]\s\[ERROR\]\s\[[\w]*]\s\[[/\w]*\]\s\[[\w-]*\]/.test(errorLog);

    expect(wellFormattedErrorLog).to.equal(true);

    done();
  });
});
