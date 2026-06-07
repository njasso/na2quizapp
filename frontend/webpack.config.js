const path = require('path');

module.exports = {
  entry: './src/index.js', // Point d'entrée de votre application
  output: {
    filename: 'bundle.js', // Nom du fichier de sortie
    path: path.resolve(__dirname, 'dist'), // Dossier de sortie
  },
  resolve: {
    fallback: {
      "http": require.resolve("stream-http"),
      "https": require.resolve("https-browserify"),
      "path": require.resolve("path-browserify"),
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "zlib": require.resolve("browserify-zlib"),
      "util": require.resolve("util/"),
      "url": require.resolve("url/"),
      "querystring": require.resolve("querystring-es3"),
      "fs": false,
      "net": false,
      "tls": false,
    }
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/, // Applique cette règle aux fichiers .js et .jsx
        exclude: /node_modules/, // Exclut le dossier node_modules
        use: {
          loader: 'babel-loader', // Utilise babel-loader
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'] // Préréglages Babel
          }
        }
      }
    ]
  }
};
