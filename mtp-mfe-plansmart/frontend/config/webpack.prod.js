const HtmlWebPackPlugin = require("html-webpack-plugin");
const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");
const deps = require("../package.json").dependencies;
const CopyPlugin = require("copy-webpack-plugin");
const path = require("path");
module.exports = () => {
  // * Get environment variables or set defaults. Do not change
  // * Keep in mind the casing of the below variables. This has to match the dns settings and cloud runs settings
  const environment = process.env.ENVIRONMENT;
  const client = process.env.CLIENT;
  const devtool = process.env.SOURCE_MAP || false;
  // * End of dynamic keys

  return {
    output: {
      path: path.resolve(__dirname, "../build"),
      filename: "js/[name].[contenthash].bundle.js",
      assetModuleFilename: "assets/[hash][ext][query]",
      clean: true,
      publicPath: `https://plansmart-${client}.${environment}.impactsmartsuite.com/`
    },

    resolve: {
      modules: [path.resolve(__dirname, "../src"), "node_modules"],
      extensions: [".tsx", ".ts", ".jsx", ".js", ".json"]
    },

    ...(devtool ? { devtool } : {}),

    resolve: {
      modules: [path.resolve(__dirname, "../src"), "node_modules"],
      extensions: [".js", ".jsx"],
      alias: {
        process: "process/browser",
        config: path.resolve(__dirname, "../src/config/"),
        actions: path.resolve(__dirname, "../src/core/actions/"),
        assets: path.resolve(__dirname, "../src/assets"),
        modules: path.resolve(__dirname, "../src/modules"),
        Styles: path.resolve(__dirname, "../src/core/Styles"),
        store: path.resolve(__dirname, "../src/store"),
        posthog: path.resolve(__dirname, "../src/core/posthog"),
        core: path.resolve(__dirname, "../src/core"),
        auth: path.resolve(__dirname, "../src/auth"),
        reducers: path.resolve(__dirname, "../src/core/reducers")
      }
    },

    module: {
      rules: [
        {
          test: /\.m?js/,
          type: "javascript/auto",
          resolve: {
            fullySpecified: false
          }
        },
        {
          test: /\.(css|s[ac]ss)$/i,
          use: ["style-loader", "css-loader", "postcss-loader", "sass-loader"]
        },
        {
          test: /\.(ts|tsx|js|jsx)$/,
          exclude: [/node_modules/, /(__tests__|\.test\.js$)/, /cypress/],
          use: {
            loader: "babel-loader"
          }
        },
        {
          test: /\.svg$/i,
          type: "asset",
          resourceQuery: /url/ // *.svg?url
        },
        {
          test: /\.svg$/i,
          issuer: /\.[jt]sx?$/,
          resourceQuery: { not: [/url/] }, // exclude react component if *.svg?url
          use: ["@svgr/webpack"]
        },
        // Images: Copy image files to build folder
        { test: /\.(?:ico|gif|png|jpg|jpeg)$/i, type: "asset/resource" },

        // Fonts and SVGs: Inline files
        { test: /\.(woff(2)?|eot|ttf|otf|)$/, type: "asset/inline" },

        { test: /\.json$/, type: "json" },
        {
          test: /\.worker\.(c|m)?js$/i,
          loader: "worker-loader",
          options: {
            filename: "[name].js"
          }
        },
        {
          test: /\.xlsm$/,
          use: [
            {
              loader: "file-loader"
            }
          ]
        }
      ]
    },

    plugins: [
      new ModuleFederationPlugin({
        name: "plansmart",
        filename: "remoteEntry.js",
        exposes: {
          "./bootstrap": "./src/bootstrap.js",
          "./plansmartApp": "./src/App.js",
          "./plansmartReducer": "./src/reducer/combineReducers.js"
        },
        remotes: {
          plansmart: `promise new Promise(resolve => {
            // This part depends on how you plan on hosting and versioning your federated modules
            const remoteUrlWithVersion = 'https://plansmart-${client}.${environment}.impactsmartsuite.com/remoteEntry.js'
            const script = document.createElement('script')
            script.src = remoteUrlWithVersion
  
            script.onload = () => {
              // the injected script has loaded and is available on window
              // we can now resolve this Promise
              const proxy = {
                get: (request) => {
                  // Note the name of the module
                  window.plansmartUrl = "https://plansmart-${client}.${environment}.impactsmartsuite.com"
                  return window.plansmart.get(request);
                },
                init: (arg) => {
                  try {
                    // Note the name of the module
                    window.plansmartUrl = "https://plansmart-${client}.${environment}.impactsmartsuite.com"
                    return window.plansmart.init(arg)
                  } catch(e) {
                    console.log('remote container already initialized')
                  }
                }
              }
              resolve(proxy)
            }
            script.onerror = (error) => {
              console.error('error loading remote container')
              const proxy = {
                get: (request) => {
                  // If the service is down it will render this content
                  return Promise.resolve(() => () => "I'm dead");
                },
                init: (arg) => {
                  return;
                }
              }
              resolve(proxy)
            }
            // inject this script with the src set to the versioned remoteEntry.js
            document.head.appendChild(script);
          })
          `
        },
        shared: {
          react: {
            singleton: true,
            requiredVersion: deps.react
          },
          "react-dom": {
            singleton: true,
            requiredVersion: deps["react-dom"]
          },
          "react-redux": {
            singleton: true,
            requiredVersion: deps["react-redux"]
          }
        }
      }),
      new HtmlWebPackPlugin({
        template: "./public/index.html"
      }),
      new CopyPlugin({
        patterns: [{ from: "./public", to: "assets" }]
      })
    ]
  };
};
