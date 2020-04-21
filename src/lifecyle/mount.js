import { NOT_MOUNTED, MOUNTING, SKIP_BECAUSE_BROKEN, MOUNTED } from "../application/state";
import { reasonableTime } from "../application/timeout";
import { getProps } from "../application/app";
import { toUnmountPromise } from "./unmount";


export function toMountPromise(app) {
    if (app.status !== NOT_MOUNTED) {
        return Promise.resolve(app)
    }
    app.status = MOUNTING

    return reasonableTime(app.mount(getProps(app)), app.timeouts.mount).then(() => {
        app.status = MOUNTED
        return app
    }).catch(error => {
        app.status = MOUNTED
        // 如果挂在失败  立即执行unmount
        return toUnmountPromise(app)
        .catch(()=>{
            console.log(error)
        }).then(() => {
            app.status = SKIP_BECAUSE_BROKEN
            return app
        })
    })

}