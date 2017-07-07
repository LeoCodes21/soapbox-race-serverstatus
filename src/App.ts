import * as express from "express";
import * as logger from "morgan";
import * as ejs from 'ejs';

import { getServers } from './ServerFetcher';

// Creates and configures an ExpressJS web server.
class App {

    // ref to Express instance
    public express: express.Application;

    //Run configuration methods on the Express instance.
    constructor() {
        this.express = express();
        this.express.set('views', __dirname);
        this.express.engine('ejs', ejs.renderFile);
        this.express.set('view engine', 'ejs');

        this.middleware();
        this.routes();
    }

    // Configure Express middleware.
    private middleware(): void {
        this.express.use(logger('dev'));
    }

    // Configure API endpoints.
    private routes(): void {
        /* This is just to get up and running, and to make sure what we've got is
         * working so far. This function will change when we start to add more
         * API endpoints */
        let router = express.Router();
        // placeholder route handler
        router.get('/', (req, res, next) => {
            getServers().then(servers => res.render('index', { servers }));
        });

        this.express.use('/', router);
    }

}

export default new App().express;