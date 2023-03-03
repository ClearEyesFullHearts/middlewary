const BaseLayer = require('../../src/layer');

class GetMethodLayer extends BaseLayer {
  handle(...args) {
    const [req] = args;
    if (req.method === 'GET') {
      super.handle(...args);
    } else {
      const next = args[args.length - 1];
      next();
    }
  }
}

module.exports = { GetMethodLayer };
