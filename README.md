# middlewary
utilies to add middleware functionalities to a project

## Description
This module exports 2 classes, Layer and Router, for you to add middleware capabilities to your project.  
Layers always match your middlewares one for one.  
Routers add layers or routers to their stack to propagate your request to matching middlewares, in order.  
Routers and layers accept any number of arguments to pass to the middlewares as long as they accept at least two (the first object is your request and the last is the next function).  
Your request object must declare a "path" property to match the layer's path, for the routing.  
  
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
If you want to see more, look at the test files.  
