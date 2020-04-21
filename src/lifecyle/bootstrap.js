import { NOT_BOOTSTRAPED, BOOTSTRAPING, SKIP_BECAUSE_BROKEN, NOT_MOUNTED } from "../application/state";
import { reasonableTime } from "../application/timeout";
import { getProps } from "../application/app";

export function toBootstrapPromise(app) {
    if (app.status !== NOT_BOOTSTRAPED) {
        return Promise.resolve(app)
    }
    app.status = BOOTSTRAPING
    return reasonableTime(app.bootstrap(getProps(app)), app.timeouts.bootstrap).then(() => {
        app.status = NOT_MOUNTED
        return app
    }).catch(error => {
        console.log(error)
        app.status = SKIP_BECAUSE_BROKEN
        throw error;
    })

}