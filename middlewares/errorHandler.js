const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (req.xhr || req.headers.accept.indexOf("json") > -1) {
    res.status(500).json({ message: "Internal Server Error" });
  } else {
    res.status(500).redirect("/pageNotFound");
  }
};

module.exports = errorHandler;
