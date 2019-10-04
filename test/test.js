const { expect } = require('chai');
const httpMocks = require('node-mocks-http');
const { stdout, stderr } = require('test-console');
const bitnaclExpress = require('../index');

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

    it('should return a function', function() {
        expect(bitnaclExpress.logger()).to.be.a('function');
    });

    
    describe('- Formats:', function() {

        describe('"simple', function() {

            const req = httpMocks.createRequest({
                method: 'GET',
                originalUrl: '/api/users',
                id: '9ff20b68-f46d-4eb5-9ef3-9cb077de1677',
                hostname: 'localhost',
                remoteAddress: '::1', 
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
                    const wellFormattedLog = /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}:\d{3}[+-]\d{4}\]\s\[[\w]*\]\s\[[\w]*\]\s\[[/\w]*\]\s\[[-\w]*\]\s\[[1-5]\d{2}\]\s\[[\d*]ms\]/.test(logMessage);
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
                    
                    const jsonFormatCallback = bitnaclExpress.logger({ format: 'json' });
                    const inspect = stdout.inspect();
                    await jsonFormatCallback(req, res, () => {});
                    inspect.restore();
                    const logMessage = JSON.parse(inspect.output[0]);
                    
                    expect(logMessage).to.be.an('object').to.have.property('time');
                    expect(logMessage).to.be.an('object').to.have.property('level');
                    expect(logMessage).to.be.an('object').to.have.property('method');
                    expect(logMessage).to.be.an('object').to.have.property('endpoint');
                    expect(logMessage).to.be.an('object').to.have.property('id');
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