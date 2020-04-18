import { invoke } from "./navigation/invoke"

let started = false


export function start() {
    started = true
    return invoke()
}

export function isStarted() {
    return started
}