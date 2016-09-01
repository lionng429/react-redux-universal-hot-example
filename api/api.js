import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import config from '../src/config';
import * as actions from './actions/index';
import {mapUrl} from 'utils/url.js';
import PrettyError from 'pretty-error';
import http from 'http';
import SocketIo from 'socket.io';

const pretty = new PrettyError();
const app = express();

const server = new http.Server(app);

const io = new SocketIo(server).path('/ws/queue');
const lockIo = new SocketIo(server).path('/ws/lock');

app.use(session({
  secret: 'react and redux rule!!!!',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 60000 }
}));
app.use(bodyParser.json());

app.get('/admin/:type/search', function (req, res) {
  const { type } = req.params;
  const { currentPage = 1, itemCountPerPage = 10 } = req.query;
  const fromIndex = Math.max((currentPage - 1), 0) * itemCountPerPage;
  const toIndex = fromIndex + itemCountPerPage;

  // TODO: replace the following with real API call
  const collection = [];

  for (let i = 1; i <= 25; i++) {
    collection.push({
      type: 'entry',
      id: `${type}-${Math.floor(Math.random() * 10000)}-${Math.floor(Math.random() * 10000)}`,
      name: `Resource ${i}`,
    })
  }

  setTimeout(() => {
    res.status(200).json({
      collection: collection.slice(fromIndex, toIndex),
      paging: {
        currentPage,
        currentItemCount: collection.slice(fromIndex, itemCountPerPage).length,
        itemCountPerPage,
        totalItemCount: collection.length,
        totalPageCount: Math.ceil(collection.length / itemCountPerPage),
      },
      sorting: {
        sort: 'id',
        order: 'DESC',
      },
    });
  }, 1000);
});

app.use((req, res) => {
  const splittedUrlPath = req.url.split('?')[0].split('/').slice(1);

  const {action, params} = mapUrl(actions, splittedUrlPath);

  if (action) {
    action(req, params)
      .then((result) => {
        if (result instanceof Function) {
          result(res);
        } else {
          res.json(result);
        }
      }, (reason) => {
        if (reason && reason.redirect) {
          res.redirect(reason.redirect);
        } else {
          console.error('API ERROR:', pretty.render(reason));
          res.status(reason.status || 500).json(reason);
        }
      });
  } else {
    res.status(404).end('NOT FOUND');
  }
});


const bufferSize = 100;
const messageBuffer = new Array(bufferSize);
let messageIndex = 0;

if (config.apiPort) {
  const runnable = app.listen(config.apiPort, (err) => {
    if (err) {
      console.error(err);
    }
    console.info('----\n==> 🌎  API is running on port %s', config.apiPort);
    console.info('==> 💻  Send requests to http://%s:%s', config.apiHost, config.apiPort);
  });

  const queueSystemEvents = require('../queueSystem/server')(io);
  const lockSystemEvents = require('../lockSystem/server')(lockIo);

  io.listen(runnable);
  lockIo.listen(runnable);
} else {
  console.error('==>     ERROR: No PORT environment variable has been specified');
}
