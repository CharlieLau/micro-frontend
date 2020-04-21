function _typeof(obj) {
  "@babel/helpers - typeof";

  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
    _typeof = function (obj) {
      return typeof obj;
    };
  } else {
    _typeof = function (obj) {
      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    };
  }

  return _typeof(obj);
}

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);

  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    if (enumerableOnly) symbols = symbols.filter(function (sym) {
      return Object.getOwnPropertyDescriptor(object, sym).enumerable;
    });
    keys.push.apply(keys, symbols);
  }

  return keys;
}

function _objectSpread2(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};

    if (i % 2) {
      ownKeys(Object(source), true).forEach(function (key) {
        _defineProperty(target, key, source[key]);
      });
    } else if (Object.getOwnPropertyDescriptors) {
      Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    } else {
      ownKeys(Object(source)).forEach(function (key) {
        Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
      });
    }
  }

  return target;
}

var NOT_LOADED = "NOT_LOADED";
var LOAD_SOURCE_CODE = 'LOAD_SOURCE_CODE';
var NOT_BOOTSTRAPED = 'NOT_BOOTSTRAPED';
var BOOTSTRAPING = 'BOOTSTRAPING';
var NOT_MOUNTED = 'NOT_MOUNTED';
var MOUNTING = 'MOUNTING';
var MOUNTED = 'MOUNTED';
var UNMOUNTING = 'UNMOUNTING';
var SKIP_BECAUSE_BROKEN = 'SKIP_BECAUSE_BROKEN';
var LOAD_ERROR = 'LOAD_ERROR';
function noSkip(app) {
  return app.status !== SKIP_BECAUSE_BROKEN;
}
function noLoadError(app) {
  return app.status !== LOAD_ERROR;
}
function isntLoaded(app) {
  return !isLoaded(app);
}
function isLoaded(app) {
  return app.status !== NOT_LOADED && app.status !== LOAD_ERROR;
}
function shouldBeActivity(app) {
  try {
    return app.activityWhen(window.location);
  } catch (error) {
    app.status = SKIP_BECAUSE_BROKEN;
    throw error;
  }
}
function isActive(app) {
  return app.status === MOUNTED;
}
function isntActive(app) {
  return !isActive(app);
}
function shouldntBeActive(app) {
  try {
    return !app.activityWhen(window.location);
  } catch (error) {
    app.status = SKIP_BECAUSE_BROKEN;
    throw error;
  }
}

var started = false;
function start() {
  started = true;
  return invoke();
}
function isStarted() {
  return started;
}

var isArray = Array.isArray;
var isPromise = function isPromise(promise) {
  if (promise instanceof Promise) {
    return true;
  }

  return _typeof(promise) === 'object' && typeof promise.then === 'function';
};
function flattenPromiseArray(promises) {
  if (!isArray(promises)) {
    promises = [promises];
  }

  if (promises.length === 0) {
    promises = [function () {
      return Promise.resolve();
    }];
  }

  return function (props) {
    return new Promise(function (resolve, reject) {
      waitForPromises(0);

      function waitForPromises(index) {
        var fn = promises[index](props);
        fn.then(function () {
          if (index >= promises.length - 1) {
            resolve();
          } else {
            waitForPromises(++index);
          }
        }).catch(reject);
      }
    });
  };
}

/**
 * promise 队列超时响应
 */
var DEFAULT_TIMEOUT = {
  bootstrap: {
    milliseconds: 3000,
    rejectwhenTimeout: false
  },
  mount: {
    milliseconds: 3000,
    rejectwhenTimeout: false
  },
  unmount: {
    milliseconds: 3000,
    rejectwhenTimeout: false
  },
  unload: {
    milliseconds: 3000,
    rejectwhenTimeout: false
  }
};
function ensureAppTimeouts(timeouts) {
  return _objectSpread2({}, DEFAULT_TIMEOUT, {}, timeouts);
}
function reasonableTime(promise, timeouts) {
  return new Promise(function (resolve, reject) {
    var finished = false;
    promise.then(function (data) {
      finished = true;
      resolve(data);
    }).catch(function (e) {
      finished = true;
      reject(e);
    });
    setTimeout(function () {
      return maybeTimeout();
    }, timeouts.milliseconds);

    function maybeTimeout() {
      if (finished) {
        return;
      }

      var error = "".concat(description, " did not resolve or reject for ").concat(timeouts.milliseconds, " milliseconds");

      if (timeouts.rejectWhenTimeout) {
        reject(new Error(error));
      } else {
        console.warn(error);
      }
    }
  });
}

var lifecyleHooks = ['bootstrap', 'mount', 'unmount'];
function toLoadPromise(app) {
  if (app.status !== NOT_LOADED) {
    return Promise.resolve(app);
  } // 下载代码阶段


  app.status = LOAD_SOURCE_CODE;
  var loadPromise = app.loadApp(getProps(app));

  if (!isPromise(loadPromise)) {
    app.status = SKIP_BECAUSE_BROKEN;
    return Promise.reject(new Error('loadApp is not a Promise'));
  }

  var errors = [];
  return loadPromise.then(function (appConfig) {
    lifecyleHooks.forEach(function (lifecyle) {
      if (!appConfig[lifecyle]) {
        errors.push("lifecyle: ".concat(lifecyle, " is not exist"));
      }
    });

    if (errors.length) {
      app.status === SKIP_BECAUSE_BROKEN;
      throw new Error(errors);
    }

    app.status = NOT_BOOTSTRAPED;
    app.bootstrap = flattenPromiseArray(appConfig.bootstrap);
    app.mount = flattenPromiseArray(appConfig.mount);
    app.unmount = flattenPromiseArray(appConfig.unmount);
    app.timeouts = ensureAppTimeouts(appConfig.timeouts);
    return app;
  }).catch(function (error) {
    console.log(error);
    app.status = LOAD_ERROR;
    return app;
  });
}

function toUnmountPromise(app) {
  if (app.status !== MOUNTED) {
    return Promise.resolve(app);
  }

  app.status = UNMOUNTING;
  return reasonableTime(app.unmount(getProps(app)), app.timeouts.unmount).then(function () {
    app.status = NOT_MOUNTED;
  }).catch(function (error) {
    app.status = SKIP_BECAUSE_BROKEN;
    throw error;
  });
}

function toMountPromise(app) {
  if (app.status !== NOT_MOUNTED) {
    return Promise.resolve(app);
  }

  app.status = MOUNTING;
  return reasonableTime(app.mount(getProps(app)), app.timeouts.mount).then(function () {
    app.status = MOUNTED;
    return app;
  }).catch(function (error) {
    app.status = MOUNTED; // 如果挂在失败  立即执行unmount

    return toUnmountPromise(app).catch(function () {
      console.log(error);
    }).then(function () {
      app.status = SKIP_BECAUSE_BROKEN;
      return app;
    });
  });
}

function toBootstrapPromise(app) {
  if (app.status !== NOT_BOOTSTRAPED) {
    return Promise.resolve(app);
  }

  app.status = BOOTSTRAPING;
  return reasonableTime(app.bootstrap(getProps(app)), app.timeouts.bootstrap).then(function () {
    app.status = NOT_MOUNTED;
    return app;
  }).catch(function (error) {
    console.log(error);
    app.status = SKIP_BECAUSE_BROKEN;
    throw error;
  });
}

var EVENT_NAME = /^(hashchange|popstate)$/i;
var EVENTS_POOL = {
  hashchange: [],
  popstate: []
};

function reroute() {
  for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  invoke([], args);
}

window.addEventListener('hashchange', reroute);
window.addEventListener('popstate', reroute); // 拦截

var originalAddEventListener = window.addEventListener;
var originalRemoveEventListener = window.removeEventListener;

window.addEventListener = function (eventName, handler, args) {
  if (eventName && EVENT_NAME.test(eventName) && typeof handler === 'function') {
    EVENTS_POOL[eventName].indexOf(handler) === -1 && EVENTS_POOL[eventName].push(handler);
  }

  return originalAddEventListener.apply(this, arguments);
};

window.removeEventListener = function (eventName, handler) {
  if (eventName && HIJACK_EVENTS_NAME.test(eventName) && typeof handler === 'function') {
    var eventList = EVENTS_POOL[eventName];
    eventList.indexOf(handler) > -1 && (EVENTS_POOL[eventName] = eventList.filter(function (fn) {
      return fn !== handler;
    }));
  }

  return originalRemoveEventListener.apply(this, arguments);
};

var originalHistoryPushState = window.history.pushState;
var originalHistoryReplaceState = window.history.replaceState;

window.history.pushState = function (state, title, url) {
  var result = originalHistoryPushState.apply(this, arguments);
  reroute(mockPopStateEvent(state));
  return result;
};

window.history.replaceState = function (state, title, url) {
  var result = originalHistoryReplaceState.apply(this, arguments);
  reroute(mockPopStateEvent(state));
  return result;
};

function mockPopStateEvent(state) {
  return new PopStateEvent('popstate', {
    state: state
  });
}

function callCapturedEvents(eventArgs) {
  if (!eventArgs) {
    return;
  }

  if (Array.isArray(eventArgs)) {
    eventArgs = eventArgs[0];
  }

  var name = eventArgs.type;

  if (!EVENT_NAME.test(name)) {
    return;
  }

  EVENTS_POOL[name].forEach(function (handler) {
    return handler.apply(window, eventArgs);
  });
}

var appChangeUnderway = false;
var changesQueue = [];
function invoke() {
  var pendings = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var eventArgs = arguments.length > 1 ? arguments[1] : undefined;

  if (appChangeUnderway) {
    return new Promise(function (resolve, reject) {
      changesQueue.push({
        success: resolve,
        failure: reject
      });
    });
  }

  appChangeUnderway = true;

  if (isStarted()) {
    return performAppsChanged();
  }

  return loadApps();

  function loadApps() {
    var loadPromises = getAppsToLoad().map(toLoadPromise);
    Promise.all(loadPromises).then(function () {
      callAllLocationEvents();
      return finish();
    }).catch(function (e) {
      callAllLocationEvents();
      console.log(e);
    });
  }

  function performAppsChanged() {
    //unmount
    var unmountApps = getAppsToUnmount();
    var unmountPromise = Promise.all(unmountApps.map(toUnmountPromise)); // load

    var loadApps = getAppsToLoad();
    var loadPromises = loadApps.map(function (app) {
      return toLoadPromise(app).then(toBootstrapPromise).then(function () {
        return unmountPromise;
      }).then(function () {
        return toMountPromise(app);
      });
    }); // mount app

    var mountApps = getAppsToMount().filter(function (app) {
      return loadApps.indexOf(app) === -1;
    });
    var mountPromises = mountApps.map(function (app) {
      return toBootstrapPromise(app).then(function () {
        return unmountPromise;
      }).then(function () {
        return toMountPromise(app);
      });
    });
    unmountPromise.then(function () {
      callAllLocationEvents();
      var loadAndMountPromises = loadPromises.concat(mountPromises);
      return Promise.all(loadAndMountPromises).then(finish, function (ex) {
        pendings.forEach(function (item) {
          return item.reject(ex);
        });
        throw ex;
      });
    }).catch(function (e) {
      callAllLocationEvents();
      console.log(e);
      throw e;
    });
  }

  function finish() {
    var resolveValue = getMountedApps();

    if (pendings.length) {
      pendings.forEach(function (item) {
        return item.success(resolveValue);
      });
    }

    appChangeUnderway = false;

    if (changesQueue.length) {
      var backup = changesQueue;
      changesQueue = [];
      return invoke(backup);
    }

    return resolveValue;
  }

  function callAllLocationEvents() {
    pendings && pendings.length && pendings.filter(function (item) {
      return item.eventArgs;
    }).forEach(function (item) {
      return callCapturedEvents(item.eventArgs);
    });
    eventArgs && callCapturedEvents(eventArgs);
  }
}

var APPS = [];
function registerApplication(appName, _applicationOrLoadFunction, activityWhen, customProps) {
  if (typeof _applicationOrLoadFunction !== 'function') {
    _applicationOrLoadFunction = function applicationOrLoadFunction() {
      return Promise.resolve(_applicationOrLoadFunction);
    };
  }

  APPS.push({
    name: appName,
    loadApp: _applicationOrLoadFunction,
    activityWhen: activityWhen,
    status: NOT_LOADED,
    customProps: customProps
  });
  return invoke();
}
function getAppsToLoad() {
  return APPS.filter(noSkip).filter(noLoadError).filter(isntLoaded).filter(shouldBeActivity);
}
function getAppsToUnmount() {
  return APPS.filter(noSkip).filter(isActive).filter(shouldntBeActive);
}
function getAppsToMount() {
  return APPS.filter(noSkip).filter(isLoaded).filter(isntActive).filter(shouldBeActivity);
}
function getMountedApps() {
  return APPS.filter(isActive).map(function (item) {
    return item.name;
  });
}
function getProps(app) {
  return _objectSpread2({
    name: app.name
  }, app.customProps);
}

export { registerApplication, start };
//# sourceMappingURL=micro-frontend.js.map
