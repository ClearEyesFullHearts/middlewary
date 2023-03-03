const BaseLayer = require('../../src/layer');

class PostMethodLayer extends BaseLayer {
  handle(...args) {
    const [req] = args;
    if (req.method === 'POST') {
      super.handle(...args);
    } else {
      const next = args[args.length - 1];
      next();
    }
  }
}

module.exports = { PostMethodLayer };
