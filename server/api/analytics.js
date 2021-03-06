/*
 * An API that facilitates requests to an analytical model.
 */
const router = require('express').Router();
const bodyParser = require('body-parser');
const uuid = require('uuid-random');
const analyticsModel = require('../service/analytics-model');

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

/* Logging method for this api. */
function log(requestType, msg) {
  console.log(`/api/analytics:${requestType}: ${msg}`);
}

/* Initialize user session. */
function initUserSession(req) {
  if (!req.session.user) {
    req.session.user = {};
  }

  if (!req.session.user.analytics) {
    req.session.user.analytics = [];
  }
}

/* Retrieve a model request by id. */
function getModelRequest(req, id) {
  for (const key of Object.keys(req.session.user.analytics)) { // eslint-disable-line
    if (req.session.user.analytics[key].modelId === id) {
      return req.session.user.analytics[key];
    }
  }

  return null;
}

/* Update an existing model request with new data received. */
function updateModelRequestWithResponse(req, modelId, newStatus, data) {
  req.session.reload((err) => {
    if (err) throw err;
    // session updated
    for (let key of Object.keys(req.session.user.analytics)) { // eslint-disable-line
      const thisItem = req.session.user.analytics[key];
      if (thisItem.modelId === modelId) {
        thisItem.status = newStatus;
        thisItem.data = data;
        req.session.user.analytics[key] = thisItem;
        req.session.save();
        log('POST|PUT', `Processed model response for: ${req.session.user.analytics[key].modelId} with status ${newStatus}`);
        return;
      }
    }
  });
}

/* Update an existing model request with new parameters. */
function updateModelRequestWithNewRequest(req, modelId, newStatus, params) {
  for (let key of Object.keys(req.session.user.analytics)) { // eslint-disable-line
    const thisItem = req.session.user.analytics[key];
    if (thisItem.modelId === modelId) {
      thisItem.request_date = new Date();
      thisItem.status = newStatus;
      thisItem.data = [];
      if (!thisItem.historical_params) {
        thisItem.historical_params = [];
      }
      thisItem.historical_params.push(thisItem.params);
      thisItem.params = params;
      req.session.user.analytics[key] = thisItem;
      req.session.save();
      log('PUT', `Updated model request for:  ${req.session.user.analytics[key].modelId} with status ${newStatus}`);
      return;
    }
  }
}

/* Retrieve the list of known analytics model requests. */
router.get('/', (req, res) => {
  initUserSession(req);

  const allRequests = [];
  Object.keys(req.session.user.analytics).forEach((key) => {
    const item = Object.assign({}, req.session.user.analytics[key]);
    // remove data from list request - only present for specific /:{modelId} requests
    item.data = undefined;
    allRequests.push(item);
  });

  res.status(200).json(allRequests);
  return res.end();
});

/* Create a new analytic model request. */
router.post('/', (req, res) => {
  initUserSession(req);
  const modelRequest = {
    modelId: uuid(),
    status: 'new',
    request_date: new Date(),
    params: req.body.params,
  };

  req.session.user.analytics.push(modelRequest);

  res.status(200).json(modelRequest);
  res.end();

  // start an async request to the model
  Promise.resolve()
    .then(() => {
      analyticsModel.invokeModelRequest(modelRequest.params, (err, responseJson) => {
        if (err) {
          updateModelRequestWithResponse(req, modelRequest.modelId, 'failed', { error_msg: err });
        } else {
          updateModelRequestWithResponse(req, modelRequest.modelId, 'completed', responseJson);
        }
      });
    });
});

/* Get an existing analytic model request. */
router.get('/:modelId', (req, res) => {
  initUserSession(req);

  const { modelId } = req.params;
  const modelRequest = getModelRequest(req, modelId);

  if (!modelRequest) {
    res.status(404).json({ error_msg: 'Unknown modelId' });
    res.end();
    return;
  }

  res.status(200).json(modelRequest);
  res.end();
});

/* Update an existing analytic model request. */
router.put('/:modelId', (req, res) => {
  initUserSession(req);

  const { params } = req.body;
  const { modelId } = req.params;
  let modelRequest = getModelRequest(req, modelId);
  if (!modelRequest) {
    res.status(404);
    res.send(JSON.stringify({ error_msg: 'Unknown modelId' }));
    res.end();
    return;
  }

  updateModelRequestWithNewRequest(req, modelId, 'new', params);

  modelRequest = getModelRequest(req, modelId);

  res.status(200).json(modelRequest);
  res.end();

  // start an async model request
  Promise.resolve()
    .then(() => {
      analyticsModel.invokeModelRequest(params, (err, responseJson) => {
        if (err) {
          updateModelRequestWithResponse(req, modelId, 'failed', { error_msg: err });
        } else {
          updateModelRequestWithResponse(req, modelId, 'completed', responseJson);
        }
      });
    });
});

/*
 * Persist an existing analytic model request against the current user.
 * Must have a current user context.
 */
router.post('/:modelId/persist', (req, res) => {
  // invoke picklet persist?
  res.send('Not implemented');
  res.end();
});

module.exports = router;
