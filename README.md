# middlewary
utilies to add middleware functionalities to a project

## Description
This module exports 2 classes, Layer and Router, to add middleware capabilities to your project.  
A Layer is an object that uses a middleware to handle a request or an error. The layer's path, set by the router's hierarchy must match the request path in order to trigger the middleware.  
A Router can add layers to its stack and use them to handle a request or an error in order and synchronously.  
Since routers are also layers, a Router can add them to its stack and send them the request for handling by their stack. In this case the callback from the subrouter is asynchronous.  
  
## Usage
```javascript
const router = new Router();
const funcOne = () => true;
const funcTwo = () => true;
const funcThree = () => true;
const funcFour = () => true;
// router add one layer by middleware to its stack
router.use(funcOne, funcTwo, funcThree, funcFour);
router.handle({ path: ''}, () => finish())
```

```javascript
const router = new Router();
const funcOne = () => true;
const funcTwo = () => true;
// router add one router with two layers that matches the "subrouter" path
router.use('subrouter', funcOne, funcTwo);
router.handle({ path: 'subrouter'}, () => finish())
```

```javascript
const router = new Router();
const layer = new Layer();
const subrouter = new Router();
subrouter.route = 'test';
const funcOne = () => true;

router.use(layer, subrouter, funcOne);
router.handle({ path: 'test'}, () => finish())
```
  
# Documentation
## Layer
### `constructor(options)`
Layer's constructor accepts an options object for the regex matching mechanism with these default value:
```javascript
{
  sensitive: true,
  strict: true,
  delimiter: '.'
}
```
### `path` (property)
When the path is set, it updates the regex used for matching the layer with the request, using the `path-to-regexp` module.  
### `use(...fns)`
Function called to add a middleware to the layer. Only the first parameter is kept and it should be a function or the object will throw an error.  
### `handle(...args)`
Function called to trigger the layer's middleware with the provided arguments. The first argument must be the "request" object and may declare a path property to check if it matches the layer's path. If the layer's path contains parameter, they will be extracted from the request path and added to the request object.  
The last argument is the "next" callback.  
All arguments will be passed through to the middleware, whatever the number, as long as there are at least 2 and that the middleware doesn't declare more arguments than the number coming from the layer.  
### `handleError(...args)`
Function called to trigger the layer's middleware with the provided arguments in case of an error. The first argument must be the error object, the second one the "request" object and the last one is the "next" callback. If the request declares a path, it must match the layer's path.  
All arguments will be passed through to the middleware, whatever the number, as long as there are at least 3 and that the middleware declares exactly the same number of arguments than the number coming from the layer.  
  
## Router
### `constructor(options)`
Router's constructor accepts an options object for the regex matching mechanism and the classes that will be used to create the routers and layers inside the `use()` function. The default values:
```javascript
{
  sensitive: true,
  strict: true,
  delimiter: '.',
  RouterClass: Router,
  LayerClass: Layer
}
```
### `route` (property)
The route property is used to build a router's layers path.  
The default value is the delimiter.  
### `parent` (property)
When a router adds another router to its stack, it sets its `parent` property to itself.  
A router can only have one parent and should not be used by multiple routers.  
### `use(...fns)`
Function called to add routers, layers or middlewares.  
The arguments can be any combination of these 3 types:  
- routers will be added directly to this router's stack and "mounted"  
- layers will be added to the stack  
- middlewares will create a new layer that will then be added to the stack  
When the first argument is a string this router will create a subrouter to `use` all the rest of the arguments and then add it to its stack.  
```javascript
router.use(middleware);
router.use(layer);
router.use(router);
router.use('path', middleware);
```
When a layer is added to the stack, the router set its path.  
When a router is added to the stack, the router set its parent property and `mount` it.
### `mount()`
Force the router to iterate through its stack to update the paths of its layers and `mount()` its subrouters.
### `handle(...args)`
Function to start the handling of a request by this router stack, i.e. layers and subrouters in order.   
The first argument must be the "request" object and the last argument is the "next" callback that will be asynchronously called whan the stack has finished handling this request.  
Here is created the `next` callback that will be used through this router stack.  
### `handleError(...args)`
Function to start the handling of an error request by this router stack, i.e. layers and subrouters in order.  
The first argument must be the error object, the second one the "request" object and the last one is the "next" callback that will be asynchronously called whan the stack has finished handling this error request.  
Here is created the `next` callback that will be used through this router stack.  
