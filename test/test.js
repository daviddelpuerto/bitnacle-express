const { expect } = require('chai');
const httpMocks = require('node-mocks-http');
const { stdout, stderr } = require('test-console');
const bitnaclExpress = require('../index');
const fs = require('fs');

function route(req, res){
    let data = [];

    req.on("data", chunk => {
        data.push(chunk)
        data = [
            ...data,
            chunk
        ];
    });

    req.on("end", () => {
        data = Buffer.concat(data);
        res.write(data);
        res.end();
    });
};

describe('#logger()', async function() {

    it('should throw if options.constructor.name equals "IncomingMessage"', function() {
        expect(() => bitnaclExpress.logger({
            constructor: { name: 'IncomingMessage' }
        })).to.throw();
    });

    it('should throw if options is not an object', function() {
        expect(() => bitnaclExpress.logger('not an object')).to.throw();
    });

    it('should throw if options.format is not a Bitnacle format', function() {
        expect(() => bitnaclExpress.logger({
            format: 'Invalid format'
        })).to.throw();
    });

    it('should throw if options.streams includes non writable streams', function() {
        expect(() => bitnaclExpress.logger({
            streams: [
                'Invalid stream'
            ]
        })).to.throw();

        const sampleLogFile = './sampleLogFile.txt';
        const readableStream = fs.createReadStream(sampleLogFile);

        expect(() => bitnaclExpress.logger({
            streams: [
                readableStream
            ]
        })).to.throw();

        readableStream._write = () => {};
        readableStream._writableState = 'fake prop'

        expect(() => bitnaclExpress.logger({
            streams: [
                readableStream
            ]
        })).to.throw();
    });

    it('should throw if options.streams is not an array', function() {
        expect(() => bitnaclExpress.logger({
            streams: 'invalid streams'
        })).to.throw();
    });

    it('should write to given stream if there are streams', function() {
        const writableStream = fs.createWriteStream('./log.txt', { flags: 'a' });
        expect(() => bitnaclExpress.logger({
            streams: [
                writableStream
            ]
        }));
    });

    it('should write to given stream if there are streams', function() {
        expect(() => bitnaclExpress.logger());
    });

    
    describe('- Formats:', function() {

        describe('"simple', function() {

            const req = httpMocks.createRequest({
                method: 'GET',
                originalUrl: '/api/users',
                id: '9ff20b68-f46d-4eb5-9ef3-9cb077de1677',
                hostname: 'localhost',
                remoteAddress: '::1', 
                headers: {
                    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.61 Safari/537.36',
                }
            });
            
            const res = httpMocks.createResponse({
                eventEmitter: require('events').EventEmitter
            });

            it('should log a well formatted message', function(done) {
                
                res.on('end', async function() {

                    const simpleFormatCallback = bitnaclExpress.logger();
                    const inspect = stdout.inspect();
                    await simpleFormatCallback(req, res, () => {});
                    inspect.restore();
                    const logMessage = inspect.output[0];
                    const wellFormattedLog = /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}:\d{3}[+-]\d{4}\]\s\[[\w]*\]\s\[[\w]*\]\s\[[/\w]*\]\s\[(.*?)\]\s\[[-\w]*\]\s\[[1-5]\d{2}\]\s\[[\d*]ms\]/.test(logMessage);
                    
                    expect(wellFormattedLog).to.be.true;

                    done();

                });
                
                route(req,res);
                req.send();
                
            });

        });

        describe('"json"', function() {

            const req = httpMocks.createRequest({
                method: 'GET',
                originalUrl: '/api/users',
                id: '9ff20b68-f46d-4eb5-9ef3-9cb077de1677',
                hostname: 'localhost',
                remoteAddress: '::1'
            });
            
            const res = httpMocks.createResponse({
                eventEmitter: require('events').EventEmitter
            });
                
            it('should log a well formatted message with all properties', function(done) {
                    
                res.on('end', async function() {
                    
                    const writableStream = fs.createWriteStream('./log.txt');
                    const jsonFormatCallback = bitnaclExpress.logger({ 
                        format: 'json',
                        streams: [writableStream]
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
                
                route(req,res);
                req.send();
                
            });

        });

    });

});

describe('#errorLogger()', function() {

    const req = httpMocks.createRequest({
        method: 'GET',
        originalUrl: '/api/users',
        id: '9ff20b68-f46d-4eb5-9ef3-9cb077de1677',
        hostname: 'localhost',
        remoteAddress: '::1'
    });

    it('should log a well formatted error log', async function(done) {
        const errorCallback = bitnaclExpress.errorLogger();
        const inspectError = stderr.inspect();
        errorCallback({}, req, {}, () => {});
        inspectError.restore();
        const errorLog = inspectError.output[0];
        const wellFormattedErrorLog = /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}:\d{3}[+-]\d{4}\]\s\[ERROR\]\s\[[\w]*]\s\[[/\w]*\]\s\[[\w-]*\]/.test(errorLog);

        expect(wellFormattedErrorLog).to.be.true;

        done();
    });

});