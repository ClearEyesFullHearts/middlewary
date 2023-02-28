const debug = require('debug')('middlewary:layer');

class Layer {
  constructor() {
    this.name = '<anonymous>';
    this.stack = [];
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
    const [fn] = this.stack;
    const next = args[args.length - 1];

    if (fn.length > args.length) {
      debug(`Layer ${this.name} cannot handle request (not a standard request handler)`);
      next();
      return;
    }

    debug(`Layer ${this.name} is handling request`);
    try {
      fn(...args);
    } catch (err) {
      next(err);
    }
  }

  handleError(...args) {
    const [fn] = this.stack;
    const [err] = args;
    const next = args[args.length - 1];

    if (fn.length !== args.length) {
      debug(`Layer ${this.name} cannot handle error (not a standard error handler)`);
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
