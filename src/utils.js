
export const isArray = Array.isArray

export const isPromise = (promise) => {
    if (promise instanceof Promise) {
        return true
    }

    return typeof promise === 'object' && typeof promise.then === 'function';
}

export function flattenPromiseArray(promises) {
    if (!isArray(promises)) {
        promises = [promises]
    }
    if (promises.length === 0) {
        promises = [() => Promise.resolve()];
    }
    return function (props) {
        return new Promise((resolve, reject) => {
            waitForPromises(0)
            function waitForPromises(index) {
                let fn = promises[index](props);
                fn.then(() => {
                    if (index >= promises.length - 1) {
                        resolve()
                    } else {
                        waitForPromises(++index)
                    }
                }).catch(reject)
            }
        })

    }
}