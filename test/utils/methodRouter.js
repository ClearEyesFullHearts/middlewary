const BaseRouter = require('../../src/router');
const { GetMethodLayer } = require('./getMethodLayer');
const { PostMethodLayer } = require('./postMethodLayer');

class MethodRouter extends BaseRouter {
  get(...args) {
    this.options.LayerClass = GetMethodLayer;
    super.use(...args);
  }

  post(...args) {
    this.options.LayerClass = PostMethodLayer;
    super.use(...args);
  }
}

module.exports = { MethodRouter };
