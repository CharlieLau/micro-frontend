import { isStarted } from "../start"
import { getAppsToLoad, getAppsToUnmount, getAppsToMount, getMountedApps } from "../application/app"
import { toLoadPromise } from '../lifecyle/load'
import { toMountPromise } from "../lifecyle/mount"
import { toBootstrapPromise } from "../lifecyle/bootstrap"
import { toUnmountPromise } from '../lifecyle/unmount'



let appChangeUnderway = false
let changesQueue = []

export function invoke(pendings = []) {
    if (appChangeUnderway) {
        return new Promise((resolve, reject) => {
            changesQueue.push({
                success: resolve,
                failure: reject
            })
        })
    }
    appChangeUnderway = true
    if (isStarted()) {
        return performAppsChanged()
    }
    return loadApps()



    function loadApps() {
        const loadPromises = getAppsToLoad().map(toLoadPromise)
        Promise.all(loadPromises).then(() => {
            return finish()
        })
    }

    function performAppsChanged() {
        //unmount
        const unmountApps = getAppsToUnmount()
        const unmountPromise = Promise.all(unmountApps.map(toUnmountPromise))

        // load
        const loadApps = getAppsToLoad()
        const loadPromises = loadApps.map(app => {
            return toLoadPromise(app)
                .then(toBootstrapPromise)
                .then(() => unmountPromise)
                .then(toMountPromise)
        })

        // mount app
        let mountApps = getAppsToMount().filter(app => loadApps.indexOf(app) === -1);
        const mountPromises = mountApps.map(app => {
            return toBootstrapPromise(app)
                .then(() => unmountPromise)
                .then(toMountPromise)
        })


        unmountPromise.then(() => {
            let loadAndMountPromises = loadPromises.concat(mountPromises);
            return Promise.all(loadAndMountPromises).then(finish, ex => {
                pendings.forEach(item => item.reject(ex));
                throw ex;
            });
        })
    }

    function finish() {
        let resolveValue = getMountedApps()
        if (pendings.length) {
            pendings.forEach(item => item.success(resolveValue))
        }

        appChangeUnderway = false
        if (changesQueue.length) {
            let backup = changesQueue;
            changesQueue = []
            return invoke(backup)
        }

        return resolveValue
    }
}