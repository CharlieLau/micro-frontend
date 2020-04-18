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
        rejectwhenTimeout: false,
    },
    unmount: {
        milliseconds: 3000,
        rejectwhenTimeout: false
    },
    unload: {
        milliseconds: 3000,
        rejectwhenTimeout:false
    }
}

export function ensureAppTimeouts(timeouts) {
    return {
        ...DEFAULT_TIMEOUT,
        ...timeouts
    }
}


export function reasonableTime(promise, timeouts) {

    return new Promise((resolve, reject) => {
        let finished = false;
        promise.then(data => {
            finished = true;
            resolve(data);
        }).catch(e => {
            finished = true;
            reject(e);
        });

        setTimeout(() => maybeTimeout(), timeouts.milliseconds)
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
    })
}