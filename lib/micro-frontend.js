const NOT_LOADED = "NOT_LOADED";
const LOAD_SOURCE_CODE = 'LOAD_SOURCE_CODE';
const NOT_BOOTSTRAPED = 'NOT_BOOTSTRAPED';
const BOOTSTRAPING = 'BOOTSTRAPING';
const NOT_MOUNTED = 'NOT_MOUNTED';
const MOUNTING = 'MOUNTING';
const MOUNTED = 'MOUNTED';
const UNMOUNTING = 'UNMOUNTING';
const SKIP_BECAUSE_BROKEN = 'SKIP_BECAUSE_BROKEN';
const LOAD_ERROR = 'LOAD_ERROR';
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

let started = false;
function start() {
  started = true;
  return invoke();
}
function isStarted() {
  return started;
}

const isArray = Array.isArray;
const isPromise = promise => {
  if (promise instanceof Promise) {
    return true;
  }

  return typeof promise === 'object' && typeof promise.then === 'function';
};
function flattenPromiseArray(promises) {
  if (!isArray(promises)) {
    promises = [promises];
  }

  if (promises.length === 0) {
    promises = [() => Promise.resolve()];
  }

  return function (props) {
    return new Promise((resolve, reject) => {
      waitForPromises(0);

      function waitForPromises(index) {
        let fn = promises[index](props);
        fn.then(() => {
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
const DEFAULT_TIMEOUT = {
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
  return { ...DEFAULT_TIMEOUT,
    ...timeouts
  };
}
function reasonableTime(promise, timeouts) {
  return new Promise((resolve, reject) => {
    let finished = false;
    promise.then(data => {
      finished = true;
      resolve(data);
    }).catch(e => {
      finished = true;
      reject(e);
    });
    setTimeout(() => maybeTimeout(), timeouts.milliseconds);

    function maybeTimeout() {
      if (finished) {
        return;
      }

      let error = `${description} did not resolve or reject for ${timeouts.milliseconds} milliseconds`;

      if (timeouts.rejectWhenTimeout) {
        reject(new Error(error));
      } else {
        console.warn(error);
      }
    }
  });
}

const lifecyleHooks = ['bootstrap', 'mount', 'unmount'];
function toLoadPromise(app) {
  if (app.status !== NOT_LOADED) {
    return Promise.resolve(app);
  } // 下载代码阶段


  app.status = LOAD_SOURCE_CODE;
  const loadPromise = app.loadApp(getProps(app));

  if (!isPromise(loadPromise)) {
    app.status = SKIP_BECAUSE_BROKEN;
    return Promise.reject(new Error('loadApp is not a Promise'));
  }

  const errors = [];
  return loadPromise.then(appConfig => {
    lifecyleHooks.forEach(lifecyle => {
      if (!appConfig[lifecyle]) {
        errors.push(`lifecyle: ${lifecyle} is not exist`);
      }
    });

    if (errors.length) {
      app.status === SKIP_BECAUSE_BROKEN;
      throw new Error(errors);
    }

    app.status = NOT_BOOTSTRAPED;
    app.bootstrap = flattenPromiseArray(appConfig.bootstrap);
    app.mount = flattenPromiseArray(appConfig.mount);
    app.unmont = flattenPromiseArray(appConfig.unmount);
    app.timeouts = ensureAppTimeouts(appConfig.timeouts);
    return app;
  }).catch(error => {
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
  return reasonableTime(app.unmount(getProps(app)), app.timeouts.unmount).then(() => {
    app.status = NOT_MOUNTED;
  }).catch(error => {
    app.status = SKIP_BECAUSE_BROKEN;
    throw error;
  });
}

function toMountPromise(app) {
  if (app.status !== NOT_MOUNTED) {
    return Promise.resolve(app);
  }

  app.status = MOUNTING;
  return reasonableTime(app.mount(getProps(app)), app.timeout.mount).then(() => {
    app.status = MOUNTED;
    return app;
  }).catch(error => {
    app.status = MOUNTED; // 如果挂在失败  立即执行unmount

    return toUnmountPromise(app).catch(() => {
      console.log(error);
    }).then(() => {
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
  return reasonableTime(app.bootstrap(getProps(app)), app.timeouts.bootstrap).then(() => {
    app.status = NOT_MOUNTED;
    return app;
  }).catch(error => {
    console.log(error);
    app.status = SKIP_BECAUSE_BROKEN;
    throw error;
  });
}

let appChangeUnderway = false;
let changesQueue = [];
function invoke(pendings = []) {
  if (appChangeUnderway) {
    return new Promise((resolve, reject) => {
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
    const loadPromises = getAppsToLoad().map(toLoadPromise);
    Promise.all(loadPromises).then(() => {
      return finish();
    });
  }

  function performAppsChanged() {
    //unmount
    const unmountApps = getAppsToUnmount();
    const unmountPromise = Promise.all(unmountApps.map(toUnmountPromise)); // load

    const loadApps = getAppsToLoad();
    const loadPromises = loadApps.map(app => {
      return toLoadPromise(app).then(toBootstrapPromise).then(() => unmountPromise).then(toMountPromise);
    }); // mount app

    let mountApps = getAppsToMount().filter(app => loadApps.indexOf(app) === -1);
    const mountPromises = mountApps.map(app => {
      return toBootstrapPromise(app).then(() => unmountPromise).then(toMountPromise);
    });
    unmountPromise.then(() => {
      let loadAndMountPromises = loadPromises.concat(mountPromises);
      return Promise.all(loadAndMountPromises).then(finish, ex => {
        pendings.forEach(item => item.reject(ex));
        throw ex;
      });
    });
  }

  function finish() {
    let resolveValue = getMountedApps();

    if (pendings.length) {
      pendings.forEach(item => item.success(resolveValue));
    }

    appChangeUnderway = false;

    if (changesQueue.length) {
      let backup = changesQueue;
      changesQueue = [];
      return invoke(backup);
    }

    return resolveValue;
  }
}

const APPS = [];
function registerApplication(appName, applicationOrLoadFunction, activityWhen, customProps) {
  if (typeof applicationOrLoadFunction !== 'function') {
    applicationOrLoadFunction = () => Promise.resolve(applicationOrLoadFunction);
  }

  APPS.push({
    name: appName,
    loadApp: applicationOrLoadFunction,
    activityWhen,
    status: NOT_LOADED,
    customProps
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
  return APPS.filter(isActive).map(item => item.name);
}
function getProps(app) {
  return {
    name: app.name,
    ...app.customProps
  };
}

export { registerApplication, start };
//# sourceMappingURL=micro-frontend.js.map
