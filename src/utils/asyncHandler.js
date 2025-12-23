const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next); // 'next' must be here!
};

module.exports = asyncHandler;