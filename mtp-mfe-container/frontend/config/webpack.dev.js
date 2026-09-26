const HtmlWebPackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const path = require("path");
const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");
const deps = require("../package.json").dependencies;
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin");
const webpack = require("webpack");

// For apps that use script loading (legacy)
function createDevScriptRemote(remoteName, port, urlVarName) {
  const baseUrl = `http://localhost:${port}`;
  const urlVarGet = urlVarName
    ? `window.${urlVarName} = "${baseUrl}";\n                `
    : "";
  const urlVarInit = urlVarName
    ? `window.${urlVarName} = "${baseUrl}";\n                  `
    : "";
  return `promise new Promise(resolve => {
          const remoteUrlWithVersion = '${baseUrl}/remoteEntry.js'
          const script = document.createElement('script')
          script.src = remoteUrlWithVersion

          script.onload = () => {
            const proxy = {
              get: (request) => {
                ${urlVarGet}return window.${remoteName}.get(request);
              },
              init: (arg) => {
                try {
                  ${urlVarInit}return window.${remoteName}.init(arg)
                } catch(e) {
                  console.log('remote container already initialized')
                }
              }
            }
            resolve(proxy)
          }
          script.onerror = (error) => {
            console.error('error loading remote ${remoteName} container')
            const proxy = {
              get: (request) => {
                return Promise.resolve(() => () => "${remoteName} unavailable");
              },
              init: (arg) => {
                return;
              }
            }
            resolve(proxy)
          }
          document.head.appendChild(script);
        })
        `;
}

// For apps that use ES module (Vite) loading (modern)
function createDevEsmRemote(remoteName, port, remoteEntryPath = '/remoteEntry.js') {
  const baseUrl = `http://localhost:${port}`;
  return `promise new Promise(resolve => {
          const remoteUrlWithVersion = '${baseUrl}${remoteEntryPath}'

          import(remoteUrlWithVersion).then(module => {
            const proxy = {
              get: (request) => {
                return module.get(request);
              },
              init: (arg) => {
                try {
                  return module.init(arg);
                } catch(e) {
                  console.log('remote container already initialized')
                }
              }
            }
            resolve(proxy)
          }).catch(error => {
            console.error('error loading remote ${remoteName} container:', error);
            const proxy = {
              get: (request) => {
                return Promise.resolve(() => () => "${remoteName} unavailable");
              },
              init: (arg) => {
                return;
              }
            }
            resolve(proxy)
          });
        })`;
}

module.exports = {
  output: {
    publicPath: "http://localhost:8080/",
  },
  cache: {
    type: "filesystem",
    buildDependencies: {
      config: [__filename],
    },
  },
  resolve: {
    extensions: [".tsx", ".ts", ".jsx", ".js", ".json"],
    alias: {
      process: "process/browser",
      config: path.resolve(__dirname, "../src/config/"),
      actions: path.resolve(__dirname, "../src/core/actions/"),
      assets: path.resolve(__dirname, "../src/assets"),
      modules: path.resolve(__dirname, "../src/modules"),
      Styles: path.resolve(__dirname, "../src/core/Styles"),
      coreAssets: path.resolve(__dirname, "../src/core/coreAssets"),
      store: path.resolve(__dirname, "../src/store"),
      posthog: path.resolve(__dirname, "../src/core/posthog"),
      core: path.resolve(__dirname, "../src/core"),
      auth: path.resolve(__dirname, "../src/auth"),
      reducers: path.resolve(__dirname, "../src/core/reducers"),
    },
  },
  devServer: {
    historyApiFallback: true,
    open: false,
    compress: true,
    hot: true,
    port: 8080,
    proxy: {
      "/api": {
        changeOrigin: true,
        secure: true,
        target: "", // Add the tenant's url here
        cookieDomainRewrite: "localhost",
        cookiePathRewrite: "/",
      }
    },
  },
  devtool: "eval-source-map",
  module: {
    rules: [
      {
        test: /\.m?js/,
        type: "javascript/auto",
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.(css|s[ac]ss)$/i,
        use: ["style-loader", "css-loader", "postcss-loader", "sass-loader"],
      },
      {
        test: /\.svg$/i,
        type: "asset",
        resourceQuery: /url/, // *.svg?url
      },
      {
        test: /\.svg$/i,
        issuer: /\.[jt]sx?$/,
        resourceQuery: { not: [/url/] }, // exclude react component if *.svg?url
        use: ["@svgr/webpack"],
      },
      // Images: Copy image files to build folder
      { test: /\.(?:ico|gif|png|jpg|jpeg|webp|mp4|webm|mov|ogg)$/i, type: "asset/resource" },
      // Fonts and SVGs: Inline files
      { test: /\.(woff(2)?|eot|ttf|otf|)$/, type: "asset/inline" },
      { test: /\.json$/, type: "json" },
      {
        test: /\.(xlsm|xlsx|md)$/,
        use: [{ loader: "file-loader" }],
      },
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules\/(?!@yaireo\/tagify)/, // Allow Tagify to be transpiled
        use: {
          loader: "babel-loader",
          options: {
            cacheDirectory: true,
            presets: [
              ["@babel/preset-env"],
              ["@babel/preset-react", { runtime: "automatic" }],
            ],
          },
        },
      },
    ],
  },
  plugins: [
    new ReactRefreshWebpackPlugin(),
    new webpack.ProvidePlugin({
      process: "process/browser",
    }),
    new ModuleFederationPlugin({
      name: "container",
      filename: "remoteEntry.js",
      exposes: {},
      remotes: {
        plansmartConfigurator: createDevScriptRemote('plansmartConfigurator', 8085, 'plansmartConfiguratorUrl'),
        ada: createDevScriptRemote('ada', 8081),
        inventorysmart: createDevScriptRemote('inventorysmart', 8082),
        assortsmart: createDevScriptRemote('assortsmart', 8083),
        plansmart: createDevScriptRemote('plansmart', 8084, 'plansmartUrl'),
        forecastconfigurator: createDevScriptRemote('forecastconfigurator', 8085),
        itemsmart: createDevScriptRemote('itemsmart', 8086),
        mondaysmart: createDevScriptRemote('mondaysmart', 8085),
        adaconfigurator: createDevScriptRemote('adaconfigurator', 8087),
        pricesmartMarkdown: createDevScriptRemote('pricesmartMarkdown', 3001),
        pricesmartPromo: createDevScriptRemote('pricesmartPromo', 3002),
        basePricing: createDevScriptRemote('basePricing', 3003),
        basePricingRest: createDevScriptRemote('basePricingRest', 3003),
        sizeSmart: createDevScriptRemote('sizeSmart', 3004),
        pricesmartUnified: createDevScriptRemote('pricesmartUnified', 3005),
        sourceSmart: createDevScriptRemote('sourceSmart', 3006),
        itemsmartnew: createDevEsmRemote('itemsmartnew', 3000),
        demandsmart: createDevEsmRemote('demandsmart', 9000, '/assets/remoteEntry.js'),
        mcphub: createDevEsmRemote('mcphub', 5001),
        agenticassort: createDevScriptRemote('agenticassort', 8088),
      },
      shared: {
        react: {
          singleton: true,
          eager: true,
          requiredVersion: deps.react,
        },
        "react-dom": {
          singleton: true,
          eager: true,
          requiredVersion: deps["react-dom"],
        },
        "react-redux": {
          singleton: true,
          eager: true,
          requiredVersion: deps["react-redux"],
        },
      },
    }),
    new HtmlWebPackPlugin({
      template: "./public/index.html",
    }),
    new CopyPlugin({
      patterns: [{ from: "./public", to: "assets" }],
    }),
    new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/locale$/,
      contextRegExp: /moment$/,
    }),
  ],
};
