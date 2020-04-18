import { NOT_LOADED, SKIP_BECAUSE_BROKEN, LOAD_SOURCE_CODE, NOT_BOOTSTRAPED, LOAD_ERROR } from "../application/state";
import { isPromise, flattenPromiseArray } from "../utils";
import { getProps } from "../application/app";
import { ensureAppTimeouts } from "../application/timeout";

const lifecyleHooks = ['bootstrap', 'mount', 'unmount']



export function toLoadPromise(app) {
    if (app.status !== NOT_LOADED) {
        return Promise.resolve(app)
    }
    // 下载代码阶段
    app.status = LOAD_SOURCE_CODE;
    const loadPromise = app.loadApp(getProps(app))
    
    if (!isPromise(loadPromise)) {
        app.status = SKIP_BECAUSE_BROKEN
        return Promise.reject(new Error('loadApp is not a Promise'));
    }
    const errors = []
    return loadPromise.then(appConfig => {
        lifecyleHooks.forEach(lifecyle => {
            if (!appConfig[lifecyle]) {
                errors.push(`lifecyle: ${lifecyle} is not exist`)
            }
        })

        if (errors.length) {
            app.status === SKIP_BECAUSE_BROKEN
            throw new Error(errors)
        }

        app.status = NOT_BOOTSTRAPED;
        app.bootstrap = flattenPromiseArray(appConfig.bootstrap);
        app.mount = flattenPromiseArray(appConfig.mount);
        app.unmont = flattenPromiseArray(appConfig.unmount);

        app.timeouts= ensureAppTimeouts(appConfig.timeouts)

        return app;
    }).catch(error=>{
        console.log(error)
        app.status = LOAD_ERROR
        return  app
    })
}