# @presenti/web
@presenti/web is a lightweight wrapper around [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js) that aims to bridge the gap between middleware and performance.

### What it does
It provides abstractions on top of the existing request/response objects provided by uWebSockets that improve the performance.

It allows for asynchronous route handling while taking care of `onEnded` and other mandatory handlers that are typically registered in a synchronous execution environment.

It creates optimized middleware stacks at runtime.

It provides decorators and a base class for defining your routes.

### What it does not
Though it may seem similar to `express`, *it is not.* The goal of this project is not to be another [nanoexpress](https://nanoexpress.js.org/), though that project does have it's uses. **The goal of this project is to provide a highly customizable, low-level wrapper around the uWebSockets.js library while dealing with and preventing use-after-free errors.**