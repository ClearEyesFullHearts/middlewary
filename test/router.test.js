const {
  describe, expect, test,
} = require('@jest/globals');

const Router = require('../src/router');
const Layer = require('../src/layer');

describe('Router tests', () => {
  test('Routers can be instantiated', () => {
    const router = new Router();
    expect(router).toBeInstanceOf(Router);
    expect(router.options.delimiter).toBe('.');
    expect(router.route).toBe('.');
  });

  test('Router uses as many middlewares as provided', () => {
    const router = new Router();
    const funcOne = () => true;
    const funcTwo = () => true;
    const funcThree = () => true;
    const funcFour = () => true;
    router.use(funcOne, funcTwo, funcThree, funcFour);

    expect(router.stack.length).toBe(4);
    expect(router.stack[0]).toBeInstanceOf(Layer);
    expect(router.stack[0].name).toBe('funcOne');
    expect(router.stack[1]).toBeInstanceOf(Layer);
    expect(router.stack[1].name).toBe('funcTwo');
    expect(router.stack[2]).toBeInstanceOf(Layer);
    expect(router.stack[2].name).toBe('funcThree');
    expect(router.stack[3]).toBeInstanceOf(Layer);
    expect(router.stack[3].name).toBe('funcFour');
  });
  test('Router uses a provided router', () => {
    const router = new Router();
    const subrouter = new Router();

    router.use(subrouter);
    expect(router.stack.length).toBe(1);
    expect(router.stack[0]).toBeInstanceOf(Router);
  });
  test('Router uses a provided layer', () => {
    const router = new Router();
    const layer = new Layer();

    router.use(layer);
    expect(router.stack.length).toBe(1);
    expect(router.stack[0]).toBeInstanceOf(Layer);
  });
  test('Router uses a string as first argument to create a sub-router', () => {
    const router = new Router();
    const funcOne = () => true;
    router.use('subrouter', funcOne);
    expect(router.stack.length).toBe(1);
    const [subrouter] = router.stack;
    expect(subrouter).toBeInstanceOf(Router);
    expect(subrouter.stack.length).toBe(1);
    expect(subrouter.stack[0]).toBeInstanceOf(Layer);
    expect(subrouter.stack[0].name).toBe('funcOne');
  });
  test('Router uses a mix of middleware, layer and router', () => {
    const router = new Router();
    const layer = new Layer();
    const subrouter = new Router();
    const funcOne = () => true;

    router.use(layer, subrouter, funcOne);
    expect(router.stack.length).toBe(3);
    expect(router.stack[0]).toBeInstanceOf(Layer);
    expect(router.stack[0].name).toBe('<anonymous>');
    expect(router.stack[1]).toBeInstanceOf(Router);
    expect(router.stack[2]).toBeInstanceOf(Layer);
    expect(router.stack[2].name).toBe('funcOne');
  });
  test('Router uses routers and set layers\' paths', () => {
    const router = new Router();
    router.route = '.';
    const subrouter = new Router();
    subrouter.route = '.';
    const lvl0 = new Router();
    lvl0.route = '.home';
    const lvl1 = new Router();
    lvl1.route = 'sweet.';
    const lvl2 = new Router();
    lvl2.route = '';
    const lvl3 = new Router();
    lvl3.route = 'home';
    const lvl4 = new Router();
    lvl4.route = '.alabama.';
    const funcOne = () => true;

    router.use(subrouter);
    subrouter.use(lvl0);
    lvl0.use(lvl1);
    lvl1.use(lvl2);
    lvl2.use(lvl3);
    lvl3.use(lvl4);
    lvl4.use(funcOne);

    expect(router.getLayerPath()).toBe('.');
    expect(subrouter.getLayerPath()).toBe('.');
    expect(lvl0.getLayerPath()).toBe('home');
    expect(lvl1.getLayerPath()).toBe('home.sweet');
    expect(lvl2.getLayerPath()).toBe('home.sweet');
    expect(lvl3.getLayerPath()).toBe('home.sweet.home');
    expect(lvl4.getLayerPath()).toBe('home.sweet.home.alabama');
    const [layer] = lvl4.stack;
    expect(layer.path).toBe('home.sweet.home.alabama');
  });
  test('Router uses routers and set layers\' paths on mount', () => {
    const router = new Router();
    router.route = undefined;
    const lvl0 = new Router();
    lvl0.route = '.house';
    const lvl1 = new Router();
    lvl1.route = 'sweet.';
    const lvl2 = new Router();
    lvl2.route = 'home';
    const lvl3 = new Router();
    lvl3.route = '.alabama.';
    const funcOne = () => true;

    router.use(lvl0);
    lvl0.use(lvl1);
    lvl2.use(lvl3);
    lvl3.use(funcOne);

    expect(router.getLayerPath()).toBe('');
    expect(lvl0.getLayerPath()).toBe('house');
    expect(lvl1.getLayerPath()).toBe('house.sweet');
    expect(lvl2.getLayerPath()).toBe('home');
    expect(lvl3.getLayerPath()).toBe('home.alabama');
    const [layer] = lvl3.stack;
    expect(layer.path).toBe('home.alabama');

    lvl1.use(lvl2);

    expect(router.getLayerPath()).toBe('');
    expect(lvl0.getLayerPath()).toBe('house');
    expect(lvl1.getLayerPath()).toBe('house.sweet');
    expect(lvl2.getLayerPath()).toBe('house.sweet.home');
    expect(lvl3.getLayerPath()).toBe('house.sweet.home.alabama');
    expect(layer.path).toBe('house.sweet.home.alabama');
  });

  test('Router restores object', (done) => {
    const router = new Router();
    const obj = {
      prop: 'for test',
      next: 'home',
    };

    const out = () => {
      expect(obj.prop).toBe('for test');
      expect(obj.next).toBe('home');
      done();
    };

    const myrestorefunction = router.restore(out, obj, 'prop', 'next');

    obj.prop = 'wrong';
    obj.next = 'alabama';

    myrestorefunction();
  });
});
