const flatten = require('array-flatten');
const debug = require('debug')('middlewary:router');
const Layer = require('./layer');

const { slice } = Array.prototype;

class Router extends Layer {
  constructor(opts = {
    sensitive: true,
    strict: true,
    delimiter: '.',
    RouterClass: Router,
    LayerClass: Layer,
  }) {
    super(opts);

    this.options = opts;
    this.parent = undefined;
    this.route = opts.delimiter;

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

      // middleware and routes
      const { stack } = this;

      function next(err) {
        const layerError = err === 'handled'
          ? null
          : err;

        // signal to exit router
        if (layerError === 'router-exit') {
          setImmediate(done, null);
          return;
        }

        // no more matching layers
        if (idx >= stack.length) {
          debug('Router\'s stack is done');
          setImmediate(done, layerError);
          return;
        }

        // find next layer
        const layer = stack[idx];
        idx += 1;

        const handleArgs = [...args, next];

        if (layerError) {
          debug(`layer ${idx} of ${stack.length} handles error`);
          layer.handleError(layerError, ...handleArgs);
          return;
        }

        debug(`layer ${idx} of ${stack.length} handles request`);
        layer.handle(...handleArgs);
      }
      return next;
    };

    this.trim = (str, both) => {
      const ch = this.options.delimiter;
      let start = 0;
      let end = str.length;

      if (end < 2) return str;

      while (start < end && str[start] === ch) { start += 1; }

      while (end > start && str[end - 1] === ch) { end -= 1; }

      if (both) {
        return (start > 0 || end < str.length) ? str.substring(start, end) : str;
      }
      return (end < str.length) ? str.substring(0, end) : str;
    };

    this.getLayerPath = () => {
      const myPath = this.route;
      if (this.parent instanceof Router) {
        const parentPath = this.parent.getLayerPath();
        if (parentPath && parentPath !== this.options.delimiter) {
          if (myPath) {
            return this.trim(`${parentPath}${this.options.delimiter}${this.trim(myPath, true)}`);
          }
          return this.trim(parentPath);
        }
        if (myPath) {
          return this.trim(myPath, true);
        }
      }
      if (myPath) {
        return this.trim(myPath);
      }
      return '';
    };
  }

  use(...args) {
    const handles = flatten(slice.call(args));
    const [first, ...fns] = handles;

    if (Object.prototype.toString.call(first) === '[object String]') {
      // add new router
      debug(`Router creates a new router for route: ${first}`);
      const subRouter = new this.options.RouterClass(this.options);
      subRouter.route = first;
      subRouter.parent = this;
      subRouter.use(fns);
      this.stack.push(subRouter);
      return;
    }

    for (let i = 0; i < handles.length; i += 1) {
      const handle = handles[i];
      if (handle instanceof Router) {
        debug('Router adds a router');
        handle.parent = this;
        handle.mount();
        this.stack.push(handle);
      } else if (handle instanceof Layer) {
        debug('Router adds a layer');
        handle.path = this.getLayerPath();
        this.stack.push(handle);
      } else {
        debug('Router creates a new layer');
        const layer = new this.options.LayerClass(this.options);
        layer.path = this.getLayerPath();
        layer.use(handle);
        this.stack.push(layer);
      }
    }
  }

  mount() {
    debug('Router mounts its stack to its parent router');
    this.stack.forEach((layer) => {
      if (layer instanceof Router) {
        layer.mount();
      } else if (layer instanceof Layer) {
        layer.path = this.getLayerPath(); // eslint-disable-line no-param-reassign
      }
    });
  }

  handle(...args) {
    const [first] = args;
    const out = args.pop();

    const done = this.restore(out, first, 'next');

    const next = this.getnext(done, ...args);

    first.next = next;

    debug('Router begins handling cycle');
    next();
  }

  handleError(err, ...args) { // eslint-disable-line class-methods-use-this
    // A router shouldn't propagate to its stack an error coming from outside
    // Just send it back to the parent router stack.
    debug('Router do not handle errors directly');
    const out = args[args.length - 1];
    setImmediate(out, err);
  }
}

module.exports = Router;
