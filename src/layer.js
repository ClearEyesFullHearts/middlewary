const pathRegexp = require('path-to-regexp');
const debug = require('debug')('middlewary:layer');

class Layer {
  set path(layerPath) {
    this.regexp = pathRegexp(layerPath, this.keys, this.options);
    this.regexp.fast_star = layerPath === '*';
    this.regexp.fast_delimiter = layerPath === this.options.delimiter;
    this.internalPath = layerPath;
  }

  get path() {
    return this.internalPath;
  }

  constructor(opts = {
    sensitive: true,
    strict: true,
    delimiter: '.',
  }) {
    this.name = '<anonymous>';

    this.options = opts;
    this.keys = [];
    this.params = undefined;
    this.parent = undefined;
    this.stack = [];
    this.regexp = undefined;
    this.internalPath = undefined;

    this.matchPath = (path) => {
      let match = false;

      if (path != null) {
        // fast path for * (everything matched in a param)
        if (this.regexp.fast_star) {
          this.params = { 0: this.decode_param(path) };
          return true;
        }
        // fast path for [delimiter] (everything matched in a param)
        if (this.regexp.fast_delimiter) {
          this.params = { 0: this.decode_param(path) };
          return true;
        }

        // match the path
        match = this.regexp.exec(path);
      }

      if (!match) {
        this.params = undefined;
        return false;
      }

      // store values
      this.params = {};

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
  }

  use(...fns) {
    const [fn] = fns;
    if (typeof fn !== 'function') {
      const type = toString.call(fn);
      throw new Error(`Layer requires a callback function but got a ${type}`);
    }
    this.stack = [fn];
    this.name = fn.name || '<anonymous>';
  }

  handle(...args) {
    if (args.length < 2) {
      throw new Error('Requests should have at least 2 arguments');
    }
    const [fn] = this.stack;
    const [first] = args;
    const next = args[args.length - 1];

    if (fn.length > args.length) {
      debug(`Layer ${this.name} cannot handle request (not a standard request handler)`);
      next();
      return;
    }

    if (!this.matchPath(first.path)) {
      debug(`Layer ${this.name} cannot handle request (path don't match)`);
      next();
      return;
    }

    first.params = this.params;

    debug(`Layer ${this.name} is handling request`);
    try {
      fn(...args);
    } catch (err) {
      next(err);
    }
  }

  handleError(...args) {
    if (args.length < 3) {
      throw new Error('Error requests should have at least 3 arguments');
    }
    const [fn] = this.stack;
    const [err, first] = args;
    const next = args[args.length - 1];

    if (fn.length !== args.length) {
      debug(`Layer ${this.name} cannot handle error (not a standard error handler)`);
      next(err);
      return;
    }

    if (!this.matchPath(first.path)) {
      debug(`Layer ${this.name} cannot handle error (path don't match)`);
      next(err);
      return;
    }

    debug(`Layer ${this.name} is handling error`);

    try {
      fn(...args);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = Layer;
