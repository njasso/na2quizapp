const CSP_DIRECTIVES = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'",
      "https://apis.google.com"
    ],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https://*.googleapis.com"],
    connectSrc: ["'self'", "https://*.googleapis.com"],
    mediaSrc: ["'self'", "blob:"],
    fontSrc: ["'self'", "data:"]
  }
};

export default CSP_DIRECTIVES;