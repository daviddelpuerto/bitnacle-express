const { expect } = require('chai');
const httpMocks = require('node-mocks-http');
const { stdout, stderr } = require('test-console');
const bitnaclExpress = require('../index');

function route(req,res){
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
        describe('"simple"', function() {
            it('should leg a well formatted message', function() {
                
                res.on('end', async function() {
                    const bitnacleCallback = bitnaclExpress.logger();

                    const inspect = stdout.inspect();
                    await bitnacleCallback(req, res, () => {});
                    inspect.restore();
                    const wellFormattedLog = /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}:\d{3}[+-]\d{4}\]\s\[[\w]*\]\s\[[\w]*\]\s\[[/\w]*\]\s\[[-\w]*\]\s\[[1-5]\d{2}\]\s\[[\d*]ms\]/.test(inspect.output[0]);
                    
                    expect(wellFormattedLog).to.be.true;
                });
             
                route(req,res);
                req.send();
             
            });
        });
    });

});