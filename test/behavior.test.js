const {
  describe, expect, test,
} = require('@jest/globals');

const Router = require('../src/router');

const middlewareFactory = (val) => (req, res, next) => {
  res.result.push(val);
  next();
};

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

    const mockReq = { path: 'hello' };
    const mockRes = { result: [] };
    zero.handle(mockReq, mockRes, () => {
      expect(mockRes.result).toEqual(['0-0', '1-0', '1-1', '1-2', '2-0', '3-0']);
      mockReq.path = 'hello.world';
      mockRes.result = [];
      zero.handle(mockReq, mockRes, () => {
        expect(mockRes.result).toEqual(['4-0', '4-1']);
        mockReq.path = '*';
        mockRes.result = [];
        zero.handle(mockReq, mockRes, () => {
          expect(mockRes.result).toEqual([]);
          done();
        });
      });
    });
  });

  test('undefined routes (the separator) should respond', (done) => {
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
      // mockReq.path = 'hello.world';
      // mockRes.result = [];
      done();
    });
  });
});
