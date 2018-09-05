import express  from 'express';
import path from 'path';

import React    from 'react';
import ReactDOMServer from 'react-dom/server'
import Index from './components/templates/pages/Index'

import { StaticRouter } from 'react-router-dom';
import { matchRoutes, renderRoutes } from 'react-router-config';

import manifest from '../build/manifest.json';

import routes from './routes';
// Добавляем инициализацию redux в серверную часть приложения
import { Provider } from 'react-redux';
import configureStore from './store';
import { testToken } from './actions';
import { getDomains } from './actions/domain';
import { getChannels } from './actions/channel';

import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';

const app = express();
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(express.static(path.join(__dirname, '../build')));

app.use((req, res, next) => {
  const branch = matchRoutes(routes, req.url);
  const store = configureStore({}, 'server');

  const { token } = req.cookies;
  store.dispatch(testToken(token)).then(() => store.dispatch(getDomains())).then(() => store.dispatch(getChannels()))
    .then(() => {
      let context = {};
      const componentHTML = ReactDOMServer.renderToString(
        <Provider store={store}>
          <StaticRouter location={req.url} context={context}>
            {renderRoutes(routes)}
          </StaticRouter>
        </Provider>
      );
      if (context.status === 404) {
        res.status(404);
      }
      if (context.status === 302) {
        return res.redirect(302, context.url);
      }
      console.log(context);
      return res.end(renderHTML(componentHTML, store.getState()));
    })
});

const cssPath = process.env.NODE_ENV === 'production' ? `/${manifest['main.css']}` : 'http://localhost:8050/styles.css';
const jsPath = process.env.NODE_ENV === 'production' ? `/${manifest['main.js']}` : 'http://localhost:8050/bundle.js';

function renderHTML(componentHTML, initialState = {}) {
  return `
    <!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hello React</title>
    <link rel="stylesheet" href="${cssPath}">
    <script type="application/javascript">window.REDUX_INITIAL_STATE = ${JSON.stringify(initialState)};</script>
  </head>
  <body>
    <div id="root">${componentHTML}</div>
    ${ process.env.NODE_ENV === 'production' ? '': '<div id="dev-tools"></div>'}
    <script type='application/javascript' src="${jsPath}"></script>
  </body>
</html>
  `;
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server listening on: ${PORT}`);
});
