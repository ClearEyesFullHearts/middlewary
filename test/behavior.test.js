const {
  describe, expect, test,
} = require('@jest/globals');
const Layer = require('../src/layer');
const Router = require('../src/router');
const {
  middlewareFactory,
  errorFactory,
  catchFactory,
  catchAndThrowFactory,
  GetMethodLayer,
  MethodRouter,
  PostMethodLayer,
} = require('./utils/fixtures');

describe('Behavior tests', () => {
  test('Routers can be added and responds', (done) => {
    /*
    R0 -> l0
       -> R1 -> l1-0
             -> l1-1
             -> l1-2
       -> l2
       -> l3
       -> R4 -> l4-0
             -> l4-1
             -> R5 -> l5-0
    */
    const zero = new Router();
    zero.route = 'hello';
    const lvl0Handle = middlewareFactory('0-0');
    zero.use(lvl0Handle);

    const lvl1 = new Router();
    const lvl10Handle = middlewareFactory('1-0');
    const lvl11Handle = middlewareFactory('1-1');
    const lvl12Handle = middlewareFactory('1-2');
    lvl1.use(lvl10Handle, lvl11Handle, lvl12Handle);
    zero.use(lvl1);

    const lvl2Handle = middlewareFactory('2-0');
    zero.use(lvl2Handle);

    const lvl3Handle = middlewareFactory('3-0');
    zero.use(lvl3Handle);

    const lvl4 = new Router();
    const lvl40Handle = middlewareFactory('4-0');
    const lvl41Handle = middlewareFactory('4-1');
    lvl4.use([lvl40Handle, lvl41Handle]);
    zero.use('world', lvl4);

    const lvl5 = new Router();
    const lvl50Handle = middlewareFactory('5-0');
    lvl5.use(lvl50Handle);
    lvl4.use('best', lvl5);

    const mockRes = { result: [] };
    zero.handle({ path: 'hello' }, mockRes, () => {
      expect(mockRes.result).toEqual(['0-0', '1-0', '1-1', '1-2', '2-0', '3-0']);
      mockRes.result = [];
      zero.handle({ path: 'hello.world' }, mockRes, () => {
        expect(mockRes.result).toEqual(['4-0', '4-1']);
        mockRes.result = [];
        zero.handle({ path: 'hello.world.best' }, mockRes, () => {
          expect(mockRes.result).toEqual(['5-0']);
          done();
        });
      });
    });
  });

  test('Root routes should respond', (done) => {
    const zero = new Router();
    const lvl0Handle = middlewareFactory('0-0');
    zero.use(lvl0Handle);

    const lvl1 = new Router();
    lvl1.route = 'home';
    const lvl10Handle = middlewareFactory('1-0');
    const lvl11Handle = middlewareFactory('1-1');
    const lvl12Handle = middlewareFactory('1-2');
    lvl1.use(lvl10Handle, lvl11Handle);
    lvl1.use('sweet', lvl12Handle);
    zero.use(lvl1);

    const lvl01Handle = middlewareFactory('0-1');
    zero.use(lvl01Handle);

    const mockReq = { path: 'home.sweet' };
    const mockRes = { result: [] };
    zero.handle(mockReq, mockRes, () => {
      expect(mockRes.result).toEqual(['0-0', '1-2', '0-1']);
      done();
    });
  });

  test('Routers should use inherited layers from options', (done) => {
    const options = {
      LayerClass: GetMethodLayer,
    };
    const zero = new Router(options);
    const lvl0Handle = middlewareFactory('0-0');
    zero.use('hello', lvl0Handle);

    const [subrouter] = zero.stack;
    const [layer] = subrouter.stack;
    expect(subrouter).toBeInstanceOf(Router);
    expect(layer).toBeInstanceOf(GetMethodLayer);

    const mockRes = { result: [] };
    zero.handle({ path: 'hello', method: 'POST' }, mockRes, () => {
      expect(mockRes.result).toEqual([]);
      mockRes.result = [];
      zero.handle({ path: 'hello', method: 'GET' }, mockRes, () => {
        expect(mockRes.result).toEqual(['0-0']);
        done();
      });
    });
  });

  test('Routers should use inherited routers from options', (done) => {
    const options = {
      RouterClass: MethodRouter,
      LayerClass: Layer,
    };
    const zero = new MethodRouter(options);
    const lvl0Handle = middlewareFactory('0-0');
    const lvl1Handle = middlewareFactory('1-0');
    zero.get('hello', lvl0Handle);
    zero.post('hello', lvl1Handle);

    const [subrouterGET, subrouterPOST] = zero.stack;
    const [layerGet] = subrouterGET.stack;
    expect(subrouterGET).toBeInstanceOf(MethodRouter);
    expect(layerGet).toBeInstanceOf(GetMethodLayer);
    const [layerPost] = subrouterPOST.stack;
    expect(subrouterPOST).toBeInstanceOf(MethodRouter);
    expect(layerPost).toBeInstanceOf(PostMethodLayer);

    const mockRes = { result: [] };
    zero.handle({ path: 'hello', method: 'POST' }, mockRes, () => {
      expect(mockRes.result).toEqual(['1-0']);
      mockRes.result = [];
      zero.handle({ path: 'hello', method: 'GET' }, mockRes, () => {
        expect(mockRes.result).toEqual(['0-0']);
        done();
      });
    });
  });

  test('Router stop on router-exit event', (done) => {
    const zero = new Router();
    const lvl0Handle = middlewareFactory('0-0');
    zero.use(lvl0Handle);

    const lvl1 = new Router();
    const lvl10Handle = middlewareFactory('1-0');
    const lvl11Handle = (req, res, next) => next('router-exit');
    const lvl12Handle = middlewareFactory('1-2');
    lvl1.use(lvl10Handle, lvl11Handle, lvl12Handle);
    zero.use(lvl1);

    const lvl01Handle = middlewareFactory('0-1');
    zero.use(lvl01Handle);

    const mockReq = { path: '.' };
    const mockRes = { result: [] };
    zero.handle(mockReq, mockRes, () => {
      expect(mockRes.result).toEqual(['0-0', '1-0', '0-1']);
      done();
    });
  });

  test('Routers propagate errors from their layers to the other layers', (done) => {
    const zero = new Router();
    const lvl0Handle = middlewareFactory('0-0');
    zero.use(lvl0Handle);

    const lvl1 = new Router();
    const lvl10Handle = errorFactory('1-0');
    const lvl11Handle = middlewareFactory('1-1');
    const lvl12Handle = catchFactory('1-2');
    lvl1.use(lvl10Handle, lvl11Handle, lvl12Handle);
    zero.use(lvl1);

    const lvl01Handle = middlewareFactory('0-1');
    zero.use(lvl01Handle);

    const mockReq = { path: '.' };
    const mockRes = { result: [] };
    zero.handle(mockReq, mockRes, () => {
      expect(mockRes.result).toEqual(['0-0', '1-0', '1-2', '0-1']);
      done();
    });
  });
  test('Routers do propagate errors from parents to their stack', (done) => {
    const zero = new Router();
    const lvl0Handle = errorFactory('0-0');
    zero.use(lvl0Handle);

    const lvl1 = new Router();
    const lvl10Handle = middlewareFactory('1-0');
    const lvl11Handle = middlewareFactory('1-1');
    const lvl12Handle = catchAndThrowFactory('1-2');
    lvl1.use(lvl10Handle, lvl11Handle, lvl12Handle);
    zero.use(lvl1);

    const lvl01Handle = catchFactory('0-1');
    zero.use(lvl01Handle);

    const mockReq = { path: '.' };
    const mockRes = { result: [] };
    zero.handle(mockReq, mockRes, () => {
      expect(mockRes.result).toEqual(['0-0', '1-2', '0-1']);
      done();
    });
  });

  test('Router accepts "handled" event for an error', (done) => {
    const zero = new Router();
    const lvl0Handle = middlewareFactory('0-0');
    zero.use(lvl0Handle);

    const lvl1 = new Router();
    const lvl10Handle = errorFactory('1-0');
    const lvl11Handle = (err, req, res, next) => next('handled');
    const lvl12Handle = middlewareFactory('1-2');
    lvl1.use(lvl10Handle, lvl11Handle, lvl12Handle);
    zero.use(lvl1);

    const lvl01Handle = middlewareFactory('0-1');
    zero.use(lvl01Handle);

    const mockReq = { path: '.' };
    const mockRes = { result: [] };
    zero.handle(mockReq, mockRes, () => {
      expect(mockRes.result).toEqual(['0-0', '1-0', '1-2', '0-1']);
      done();
    });
  });
});
