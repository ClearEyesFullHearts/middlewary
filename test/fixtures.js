module.exports = {
  middlewareFactory: (val) => (req, res, next) => {
    res.result.push(val);
    next();
  },
  errorFactory: (val) => (req, res, next) => {
    res.result.push(val);
    throw new Error(`Error from ${val}`);
  },
  catchFactory: (val) => (err, req, res, next) => {
    res.result.push(val);
    next();
  },
};
