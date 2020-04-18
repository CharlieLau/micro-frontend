import {
    NOT_LOADED,
    noSkip,
    noLoadError,
    isntLoaded,
    shouldBeActivity,
    isActive,
    shouldntBeActive,
    isLoaded,
    isntActive
} from './state'
import { invoke } from '../navigation/invoke'

const APPS = []

export function registerApplication(appName, applicationOrLoadFunction, activityWhen, customProps) {
    if (typeof applicationOrLoadFunction !== 'function') {
        applicationOrLoadFunction = () => Promise.resolve(applicationOrLoadFunction)
    }

    APPS.push({
        name: appName,
        loadApp: applicationOrLoadFunction,
        activityWhen,
        status: NOT_LOADED,
        customProps
    })

    return invoke()
}


export function getAppsToLoad() {
    return APPS.filter(noSkip)
        .filter(noLoadError)
        .filter(isntLoaded)
        .filter(shouldBeActivity)
}

export function getAppsToUnmount() {
    return APPS.filter(noSkip)
        .filter(isActive)
        .filter(shouldntBeActive)
}


export function getAppsToMount() {
    return APPS.filter(noSkip)
        .filter(isLoaded)
        .filter(isntActive)
        .filter(shouldBeActivity)
}


export function getMountedApps(){
    return APPS.filter(isActive).map(item => item.name);
}


export function getProps(app) {
    return {
        name: app.name,
        ...app.customProps
    }
}

