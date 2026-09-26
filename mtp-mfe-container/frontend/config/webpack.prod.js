const HtmlWebPackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const path = require("path");
const webpack = require("webpack");
const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");
const TerserPlugin = require("terser-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const deps = require("../package.json").dependencies;

const DEV_ENVIRONMENTS = ["devs", "test"];
const CLIENT_ALIAS_MAP = {
  crackerbarrel: 'cb',
  "dollar-general": 'dg',
  inventorysmart: 'inv-ga',
  starboard: 'sb',
  "victorias-secret": 'vs',
  "victorias-secret-international": 'vs-int',
  "under-armour": "ua",
  "petermillar": "pm",
  allsaints: "as",
  "patagonia": "pg",
  "tommy-bahama": "tb",
  "alfuttaim-mena": "af",
  "plansmart-demo": "ps-demo",
  "plansmart-generic": "ps-generic",
  "scarpe-scarpe": "scarpe",
  "pittarosso-scarpescarpe": "scarpe",
};

// For apps that use script loading (legacy)
function createScriptRemote(remoteName, urlPrefix, routePath, urlVarName) {
  const urlVarGet = urlVarName
    ? `window.${urlVarName} = remoteUrl;\n                `
    : "";
  const urlVarInit = urlVarName
    ? `window.${urlVarName} = remoteUrl;\n                  `
    : "";
  return `promise new Promise(resolve => {
          const clientRaw = window.location.hostname.split('.')[0].replace('-replica', '')
          const CLIENT_ALIAS_MAP = ${JSON.stringify(CLIENT_ALIAS_MAP)}
          const client = CLIENT_ALIAS_MAP[clientRaw] || clientRaw
          const environment = ["devs", "test", "uat"].includes(window.location.hostname.split('.')[1]) ? window.location.hostname.split('.')[1] : "prod"
          const remoteUrl = 'https://${urlPrefix}-' + client + '.' + environment + '.impactsmartsuite.com'
          const remoteUrlWithVersion = remoteUrl + '/remoteEntry.js'
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
            if(window.location.pathname.split("/")?.[1] === "${routePath}" || (${JSON.stringify(
    DEV_ENVIRONMENTS,
  )}.includes(window.location.host.split(".")?.[1]))){
              console.error('error loading remote ${remoteName} container', error)
            }
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

// For apps that use ES module(vite) loading (modern)
function createEsmRemote(remoteName, urlPrefix, routePath) {
  return `promise new Promise(resolve => {
          const clientRaw = window.location.hostname.split('.')[0].replace('-replica', '')
          const CLIENT_ALIAS_MAP = ${JSON.stringify(CLIENT_ALIAS_MAP)}
          const client = CLIENT_ALIAS_MAP[clientRaw] || clientRaw
          const environment = ["devs", "test", "uat"].includes(window.location.hostname.split('.')[1]) ? window.location.hostname.split('.')[1] : "prod"
          const remoteUrlWithVersion = 'https://${urlPrefix}-' + client + '.' + environment + '.impactsmartsuite.com/remoteEntry.js'

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
            if(window.location.pathname.split("/")?.[1] === "${routePath}" || (${JSON.stringify(
    DEV_ENVIRONMENTS,
  )}.includes(window.location.host.split(".")?.[1]))){
              console.error('error loading remote ${remoteName} container:', error);
            }
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


module.exports = () => {
  return {
    mode: 'production',
    devtool: process?.env?.SOURCE_MAP || false,
    output: {
      path: path.resolve(__dirname, "../build"),
      filename: "js/[name].[contenthash].bundle.js",
      assetModuleFilename: "assets/[hash][ext][query]",
      clean: true,
      publicPath: "/",
    },
    cache: {
      type: "filesystem",
      buildDependencies: {
        config: [__filename],
      },
    },
    optimization: {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          parallel: true,
          terserOptions: {
            compress: {
              drop_debugger: true,
            },
            output: {
              comments: false,
            },
          },
        }),
        new CssMinimizerPlugin(),
      ],
      splitChunks: {
        chunks: "all",
        cacheGroups: {
          agGrid: {
            test: /[\\/]node_modules[\\/](ag-grid)/,
            name: "ag-grid",
            chunks: "all",
            priority: 20,
            enforce: true,
          },
          mui: {
            test: /[\\/]node_modules[\\/](@mui)/,
            name: "mui",
            chunks: "all",
            priority: 20,
          },
          highcharts: {
            test: /[\\/]node_modules[\\/](highcharts)/,
            name: "highcharts",
            chunks: "all",
            priority: 20,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all",
            priority: -10,
          },
        },
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
          use: [
            "style-loader",
            "css-loader",
            "postcss-loader",
            "sass-loader",
          ],
        },
        {
          test: /\.(ts|tsx|js|jsx)$/,
          exclude: /node_modules\/(?!@yaireo\/tagify)/,
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
        {
          test: /\.svg$/i,
          type: "asset",
          resourceQuery: /url/,
        },
        {
          test: /\.svg$/i,
          issuer: /\.[jt]sx?$/,
          resourceQuery: { not: [/url/] },
          use: ["@svgr/webpack"],
        },
        {
          test: /\.(?:ico|gif|png|jpg|jpeg|webp|mp4|webm|mov|ogg)$/i,
          type: "asset/resource",
        },
        { test: /\.(woff(2)?|eot|ttf|otf|)$/, type: "asset/inline" },
        { test: /\.json$/, type: "json" },
        {
          test: /\.(xlsm|xlsx|md)$/,
          use: [{ loader: "file-loader" }],
        },
      ],
    },
    plugins: [
      new webpack.ProvidePlugin({
        process: "process/browser",
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/,
      }),
      new ModuleFederationPlugin({
        name: "container",
        filename: "remoteEntry.js",
        exposes: {},
        remotes: {
          plansmartConfigurator: createScriptRemote('plansmartConfigurator', 'plansmart-configurator', 'plansmart-configurator', 'plansmartConfiguratorUrl'),
          ada: createScriptRemote('ada', 'adavisual', 'ada'),
          inventorysmart: createScriptRemote('inventorysmart', 'inventorysmart', 'inventory-smart'),
          assortsmart: createScriptRemote('assortsmart', 'assortsmart', 'assort-smart'),
          plansmart: createScriptRemote('plansmart', 'plansmart', 'plan-smart', 'plansmartUrl'),
          forecastconfigurator: createScriptRemote('forecastconfigurator', 'forecastsmart', 'forecastconfigurator'),
          itemsmart: createScriptRemote('itemsmart', 'itemsmart', 'item-smart'),
          mondaysmart: createScriptRemote('mondaysmart', 'mondaysmart', 'monday-smart'),
          adaconfigurator: createScriptRemote('adaconfigurator', 'adaconfigurator', 'adaconfigurator'),
          pricesmartMarkdown: createScriptRemote('pricesmartMarkdown', 'pricesmart-markdown', 'pricesmart-markdown'),
          pricesmartPromo: createScriptRemote('pricesmartPromo', 'pricesmart-promo', 'pricesmart-promo'),
          basePricing: createScriptRemote('basePricing', 'mtp-mfe', 'base-pricing'),
          basePricingRest: createScriptRemote('basePricingRest', 'mtp-mfe-rest', 'base-pricing-rest'),
          sizeSmart: createScriptRemote('sizeSmart', 'sizesmart', 'size-smart'),
          pricesmartUnified: createScriptRemote('pricesmartUnified', 'pricesmart-unified', 'price-smart'),
          sourceSmart: createScriptRemote('sourceSmart', 'source-smart', 'source-smart'),
          itemsmartnew: createEsmRemote('itemsmartnew', 'itemsmart-new', 'item-smart-new'),
          demandsmart: createEsmRemote('demandsmart', 'demandsmart', 'demand-smart'),
          mcphub: createEsmRemote('mcphub', 'mcphub', 'mcp-hub'),
          agenticassort: createScriptRemote('agenticassort', 'agenticassort', 'agentic-assort'),
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
    ],
  };
};
