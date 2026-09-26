const HtmlWebPackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const path = require("path");
const webpack = require("webpack");
const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");
const TerserPlugin = require("terser-webpack-plugin");
const deps = require("../package.json").dependencies;

module.exports = (env) => {
	return {
		mode: "production",
		devtool: process?.env?.SOURCE_MAP || false,
		output: {
			path: path.resolve(__dirname, "../build"),
			filename: "js/[name].[contenthash].bundle.js",
			assetModuleFilename: "assets/[hash][ext][query]",
			clean: true,
			publicPath: "auto",
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
		optimization: {
			minimize: true,
			minimizer: [
				new TerserPlugin({
					terserOptions: {
						compress: {
							drop_debugger: true,
						},
						output: {
							comments: false,
						},
					},
					parallel: true,
				}),
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
							cacheCompression: false,
						},
					},
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
				{
					test: /\.(?:ico|gif|png|jpg|jpeg|webp|mp4|webm|mov|ogg)$/i,
					type: "asset/resource",
				},
				// Fonts and SVGs: Inline files
				{ test: /\.(woff(2)?|eot|ttf|otf|)$/, type: "asset/inline" },
				{ test: /\.json$/, type: "json" },
				{
					test: /\.xlsm$/,
					use: [
					  {
						loader: "file-loader",
					  },
					],
				  },
					{
          test: /\.xlsx$/,
          use: [
            {
              loader: "file-loader",
            },
          ],
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
				name: "ada",
				filename: "remoteEntry.js",
				exposes: {
					"./bootstrap": "./src/bootstrap.js",
					"./adaApp": "./src/App.js",
				},
				remotes: {},
				shared: {
					react: {
						singleton: true,
						requiredVersion: deps.react,
					},
					"react-dom": {
						singleton: true,
						requiredVersion: deps["react-dom"],
					},
					"react-redux": {
						singleton: true,
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
