const flatten = require('array-flatten');
const pathRegexp = require('path-to-regexp');
const debug = require('debug')('middlewary:router');
const Layer = require('./layer');

const { slice } = Array.prototype;

class Router extends Layer {
  constructor(name, opts = {
    sensitive: true,
    strict: true,
    delimiter: '.',
  }) {
    super();

    this.options = opts;
    this.name = name || '*';
    this.keys = [];
    this.params = undefined;
    this.path = undefined;
    this.parent = undefined;
    this.regexp = pathRegexp(name, this.keys, opts);

    // set fast path flags
    this.regexp.fast_star = name === '*';

    this.matchPath = (path) => {
      let match = false;

      if (path != null) {
        // fast path for * (everything matched in a param)
        if (this.regexp.fast_star) {
          this.params = { 0: this.decode_param(path) };
          this.path = path;
          return true;
        }

        // match the path
        match = this.regexp.exec(path);
      }

      if (!match) {
        this.params = undefined;
        this.path = undefined;
        return false;
      }

      // store values
      this.params = {};
      const [matchPath] = match;
      this.path = matchPath;

      const { keys } = this;
      const { params } = this;

      for (let i = 1; i < match.length; i += 1) {
        const key = keys[i - 1];
        const prop = key.name;
        const val = this.decode_param(match[i]);

        if (val !== undefined || !(hasOwnProperty.call(params, prop))) {
          params[prop] = val;
        }
      }

      return true;
    };

    this.decode_param = (val) => {
      if (typeof val !== 'string' || val.length === 0) {
        return val;
      }

      return decodeURIComponent(val);
    };

    this.restore = (fn, obj, ...args) => {
      const props = new Array(args.length);
      const vals = new Array(args.length);

      for (let i = 0; i < props.length; i += 1) {
        props[i] = args[i];
        vals[i] = obj[props[i]];
      }

      return (...fnArgs) => {
        for (let i = 0; i < props.length; i += 1) {
          obj[props[i]] = vals[i]; // eslint-disable-line no-param-reassign
        }

        return fn.apply(this, fnArgs);
      };
    };

    this.getnext = (done, ...args) => {
      let idx = 0;
      const handlerName = this.name;

      // middleware and routes
      const { stack } = this;

      function next(err) {
        const layerError = err === 'handled'
          ? null
          : err;

        // signal to exit router
        if (layerError === 'handler-exit') {
          setImmediate(done, null);
          return;
        }

        // no more matching layers
        if (idx >= stack.length) {
          debug(`Router ${handlerName} stack is done`);
          setImmediate(done, layerError);
          return;
        }

        // find next layer
        const layer = stack[idx];
        idx += 1;

        const handleArgs = [...args, next];

        if (layerError) {
          debug('have error for ', layer.name);
          layer.handleError(layerError, ...handleArgs);
          return;
        }

        layer.handle(...handleArgs);
      }
      return next;
    };
  }

  use(...args) {
    const handles = flatten(slice.call(args));
    const [first, ...fns] = handles;

    if (Object.prototype.toString.call(first) === '[object String]') {
      // add new router
      const subRouter = new Router(first, this.options);
      subRouter.use(fns);
      subRouter.parent = this;
      this.stack.push(subRouter);
      return;
    }

    for (let i = 0; i < handles.length; i += 1) {
      const handle = handles[i];
      if (handle instanceof Router) {
        handle.parent = this;
        this.stack.push(handle);
      } else if (handle instanceof Layer) {
        this.stack.push(handle);
      } else {
        const layer = new Layer();
        layer.use(handle);
        this.stack.push(layer);
      }
    }
  }

  handle(...args) {
    const handlerName = this.name;
    const [first] = args;
    const out = args[args.length - 1];

    if (this.matchPath(first.path)) {
      first.params = this.params;

      const done = this.restore(out, first, 'next');

      const next = this.getnext(done, ...args);

      first.next = next;

      debug(`Handler ${handlerName} begins`);
      next();
      return;
    }

    setImmediate(out, null);
  }

  handleError(err, ...args) {
    // A router shouldn't propagate to its stack an error coming from outside
    // Just send it back to the parent router stack.
    const out = args[args.length - 1];
    setImmediate(out, err);
  }
}

module.exports = Router;
