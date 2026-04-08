// export const asyncHandler = (requestHandler) => {
//   return (req, res, next) => {
//     Promise.resolve(
//       requestHandler(req, res, next)
//     ).catch((err) => next(err))
//   }
// }

export const asyncHandler = (fn) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next)
    }
    catch (err) {
      res.status(err.statusCode || 500).json(err)
    }
  }
}