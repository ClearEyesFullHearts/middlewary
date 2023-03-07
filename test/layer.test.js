const {
  describe, expect, test,
} = require('@jest/globals');

const Layer = require('../src/layer');

describe('Layer tests', () => {
  test('Layers can be instantiated', () => {
    const layer = new Layer();
    expect(layer).toBeInstanceOf(Layer);
    expect(layer.name).toBe('<anonymous>');
    expect(layer.options.delimiter).toBe('.');
  });
  test('Layers can use a function', (done) => {
    const layer = new Layer();
    layer.use(() => done());
    layer.stack[0]();
  });
  test('Layers can use only the first function', (done) => {
    const layer = new Layer();
    layer.use(() => done(), () => { throw new Error(); }, () => { throw new Error(); });
    expect(layer.stack.length).toBe(1);
    layer.stack[0]();
  });
  test('Layers can only use a function', () => {
    const layer = new Layer();
    expect(() => {
      layer.use('string');
    }).toThrow();
    expect(() => {
      layer.use(100);
    }).toThrow();
    expect(() => {
      layer.use({});
    }).toThrow();
    expect(() => {
      layer.use(new Date());
    }).toThrow();
  });
  test('Layers gets its name from the function it uses', (done) => {
    const layer = new Layer();
    const myfunctionname = () => done();
    layer.use(myfunctionname);
    expect(layer.name).toBe('myfunctionname');

    function myothername() {
      done();
    }
    layer.use(myothername);
    expect(layer.name).toBe('myothername');
    layer.stack[0]();
  });

  test('Layers gets its path sets', () => {
    const layer = new Layer();
    layer.path = '/route';
    expect(layer.internalPath).toBe('/route');
    expect(layer.path).toBe('/route');
    expect(layer.regexp).toBeInstanceOf(RegExp);
  });
  test('Layers set "*" path', () => {
    const layer = new Layer();
    layer.path = '*';
    expect(layer.path).toBe('*');
    expect(layer.regexp).toBeInstanceOf(RegExp);
    expect(layer.regexp.fast_star).toBeTruthy();
    expect(layer.regexp.fast_delimiter).toBeFalsy();
  });
  test('Layers set delimiter path', () => {
    const layer = new Layer({ delimiter: '@' });
    layer.path = '@';
    expect(layer.path).toBe('@');
    expect(layer.regexp).toBeInstanceOf(RegExp);
    expect(layer.regexp.fast_star).toBeFalsy();
    expect(layer.regexp.fast_delimiter).toBeTruthy();
  });

  test('Layers handles a request', (done) => {
    const layer = new Layer();
    layer.path = '';
    layer.use(() => done());
    layer.handle({ path: '' }, () => { throw new Error(); });
  });
  test('Layers throws when request has less than 2 arguments (req & next)', () => {
    const layer = new Layer();
    layer.path = '';
    expect(() => {
      layer.handle({ path: '' });
    }).toThrow();
    expect(() => {
      layer.handle(() => 'test');
    }).toThrow();
  });
  test('Layers do not handle request if its function has more argument', (done) => {
    const layer = new Layer();
    layer.path = '';
    layer.use((err, req, next) => { throw new Error(); });
    layer.handle({ path: '' }, () => { done(); });
  });
  test('Layers do not handle request if the path do not match', (done) => {
    const layer = new Layer();
    layer.path = 'x';
    layer.use((req, next) => { throw new Error(); });
    layer.handle({ path: 'y' }, () => { done(); });
  });
  test('Layers push its errors to the next layer', (done) => {
    const layer = new Layer();
    layer.path = '/';
    layer.use((req, next) => { throw new Error(); });
    layer.handle({ path: '/' }, (err) => {
      expect(err).toBeInstanceOf(Error);
      done();
    });
  });
  test('Layers set the request params from the path', (done) => {
    const layer = new Layer();
    layer.path = 'topic.:type.:id';
    layer.use((req, next) => {
      expect(req.params.type).toBe('car');
      expect(req.params.id).toBe('16');
      next();
    });
    layer.handle({ path: 'topic.car.16' }, () => done());
  });
  test('Layers handles all request when its path is "*"', (done) => {
    const layer = new Layer();
    layer.path = '*';
    layer.use(() => done());
    layer.handle({ path: 'test' }, () => { throw new Error(); });
  });
  test('Layers handles all request when its path is the delimiter', (done) => {
    const layer = new Layer({ delimiter: '@' });
    layer.path = '@';
    layer.use(() => done());
    layer.handle({ path: 'topic.car.16' }, () => { throw new Error(); });
  });

  test('Layers handles an error', (done) => {
    const layer = new Layer();
    layer.path = '';
    layer.use((err, req, next) => done());
    layer.handleError(new Error(), { path: '' }, () => { throw new Error(); });
  });
  test('Layers set the request params from the path for error request', (done) => {
    const layer = new Layer();
    layer.path = 'topic.:type.:id';
    layer.use((err, req, next) => {
      expect(req.params.type).toBe('car');
      expect(req.params.id).toBe('16');
      done();
    });
    layer.handleError(new Error(), { path: 'topic.car.16' }, () => { throw new Error(); });
  });
  test('Layers throws when error request has less than 3 arguments (err, req & next)', () => {
    const layer = new Layer();
    layer.path = '';
    expect(() => {
      layer.handleError(new Error(), { path: '' });
    }).toThrow();
    expect(() => {
      layer.handle({ path: '' }, () => 'test');
    }).toThrow();
  });
  test('Layers do not handle error request if the path do not match', (done) => {
    const layer = new Layer();
    layer.path = 'x';
    layer.use((err, req, next) => { throw new Error(); });
    layer.handleError(new Error(), { path: 'y' }, () => { done(); });
  });
  test('Layers do not handle error request if the number of arguments do not match', (done) => {
    const layer = new Layer();
    layer.path = '';
    layer.use((err, req, res, obj, next) => { throw new Error(); });
    layer.handleError(new Error(), { path: '' }, () => { done(); });
  });
  test('Layers push its errors to the next layer', (done) => {
    const layer = new Layer();
    layer.path = '/';
    const originalError = new Error('original error');
    layer.use((err, req, next) => { throw new Error('error in test'); });
    layer.handleError(originalError, { path: '/' }, (err) => {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe('error in test');
      done();
    });
  });
});
