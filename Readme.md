# bitnacle-express

```bitnacle-express``` is a dead simple middleware logger to use with [Express](https://www.npmjs.com/package/express) apps.

It is compatible with [request-ip](https://www.npmjs.com/package/request-ip) and [express-request-id](https://www.npmjs.com/package/express-request-id), if you are using them **make sure** to use ```bitnacle-express``` **after** them.

## Installation

```
npm i bitnacle-express
```

## Quick start

```javascript
const app = require('express')();
const bitnaclExpress = require('bitnacle-express');

app.use(bitnaclExpress.logger()); // use default "simple" format 
```

## Usage

- ### Log incoming HTTP requests using ```logger```:

    You can specify 3 different formats: ```simple``` (default), ```json``` and ```extended```
    ```javascript
    app.use(bitnaclExpress.logger({
        format: 'json' // optional: default is "simple"
    }));  
    ```

    > **Note**: ```json``` format outputs a _JSON-stringified_ log message and ```extended``` format _outputs a **raw object**_

    These are the outputs for the 3 different formats, ```simple```, ```json``` and ```extended``` respectively:

    ```
    [2019-08-25T17:03:24:461+0200] [INFO] [GET] [/] [::1] [adb91efc-f05d-486e-809f-6ced2d3d046c] [304] [10ms]
    ```

    ```json
    {"time":"2019-08-25T17:04:47:603+0200","level":"INFO","method":"GET","endpoint":"/","remoteAddress":"::1","id":"6c09133d-ffa3-4ad3-af3b-8e5c78ee73ad","statusCode":304,"elapsedTime":"18ms"}
    ```

    ```javascript
    { 
        time: '2019-08-25T17:13:52:079+0200',
        level: 'INFO',
        hostname: 'localhost',
        req: { 
            method: 'GET',
            endpoint: '/',
            headers: { 
                host: 'localhost:3100',
                connection: 'keep-alive',
                'cache-control': 'max-age=0',
                'upgrade-insecure-requests': '1',
                'user-agent':
                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36',
                'sec-fetch-mode': 'navigate',
                'sec-fetch-user': '?1',
                accept:
                'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
                'sec-fetch-site': 'none',
                'accept-encoding': 'gzip, deflate, br',
                'accept-language': 'es-ES,es;q=0.9,en;q=0.8',
                cookie: 'io=ohrfY8fxk-ZqSXbYAAAC',
                'if-none-match': 'W/"424-gtDsLN/eQBxV76fISNK6wSdFMmY"' 
            },
            remoteAddress: '::1',
            params: 0,
            query: 0,
            id: '9ff20b68-f46d-4eb5-9ef3-9cb077de1677' 
        },
        statusCode: 200,
        elapsedTime: '2ms' 
    }
    ```

    > **IMPORTANT**: As noted before, if you are using **request-ip** and/or **express-request-id** in your app, you must use ```bitnacle-express``` **after** them:

    ```javascript
    const app = require('express')();

    ... 

    app.use(requestIp.mw())
    app.use(addRequestId())
    app.use(bitnaclExpress.logger())
    ```

- ### Log errors using ```errorLogger```

    The ```errorLogger``` only supports the ```simple``` and ```json``` formats. Your app must use it **after** the routes declaration.

    ```javascript
    const router = require('./router');

    app.use(router);

    app.use(bitnaclExpress.errorLogger({
        format: 'json' // optional: default is "simple"
    }));
    ```

    > **IMPORTANT**: ```errorLogger``` **doesn't handle** the **errors/exceptions**, it **only logs** them, so place it **before** your error handlers.

    I personally recommend to ```try/catch``` your routes and handle errors locally unless you have a general handler for some or all of your routes. You can use [bitnacle logger]() along with ```bitnacle-express``` to log your errors on the ```catch``` block of your routes.

## Log levels

```bitnacle-express.logger``` will use predefined log levels based on the ```response.statusCode```.

- ```statusCode``` >= **500** will use ```[ERROR]``` level
- ```statusCode``` >= **400** will use ```[WARNING]``` level
- ```statusCode``` >= **100** will use ```[INFO]``` level