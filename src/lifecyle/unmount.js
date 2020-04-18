import { MOUNTED, UNMOUNTING, SKIP_BECAUSE_BROKEN, NOT_MOUNTED } from "../application/state";
import { reasonableTime } from "../application/timeout";
import { getProps } from "../application/app";

export function toUnmountPromise(app) {
    if (app.status !== MOUNTED) {
        return Promise.resolve(app)
    }
    app.status = UNMOUNTING
    return reasonableTime(app.unmount(getProps(app)), app.timeouts.unmount).then(() => {
        app.status = NOT_MOUNTED
    }).catch(error => {
        app.status = SKIP_BECAUSE_BROKEN;
        throw error
    })

}