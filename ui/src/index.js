import React from 'react';
import ReactDOM from 'react-dom';
import { createStore, applyMiddleware, compose } from 'redux';
// import { composeWithDevTools } from 'redux-devtools-extension';
import { Provider } from 'react-redux';
import createSagaMiddleware from 'redux-saga';
import rootReducer from './reducers';
import rootSaga from './sagas';
import { loadStateFromSessionStorage, saveStateToSessionStorage } from './loadState';
import throttle from 'lodash/throttle';

import App from './containers/App';
import './scss/index.scss';

import * as serviceWorker from './serviceWorker';

const sagaMiddleware = createSagaMiddleware();

// dev tools middleware
// https://github.com/zalmoxisus/redux-devtools-extension#12-advanced-store-setup
const composeEnhancers =
  typeof window === 'object' &&
  window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ?   
    window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({
      // Specify extension’s options like name, actionsBlacklist, actionsCreators, serialize...
    }) : compose;

const enhancer = composeEnhancers(
  applyMiddleware(sagaMiddleware),
  // other store enhancers if any
);

// const persistedState = loadStateFromSessionStorage();

const store = createStore(
  rootReducer,
  enhancer,
);

sagaMiddleware.run(rootSaga);

// Subscribe to changes to the state store and save them to local storage
store.subscribe(throttle(() => {
  saveStateToSessionStorage({
    // model: store.getState().model,
  });
}, 1000));

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
