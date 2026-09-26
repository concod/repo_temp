import { MIDDLEWARE_TYPE } from "../../constants";

export class JustCache {
  #cacheDisabled;
  #middlewareArr;
  #disabledMiddlewareMap;

  constructor(middlewareMap) {
    this.#cacheDisabled = false;
    this.#middlewareArr = Object.entries(middlewareMap);
    this.#disabledMiddlewareMap = {};
  }

  disableCache() {
    this.#cacheDisabled = true;
  }

  enableCache() {
    this.#cacheDisabled = false;
  }

  disableMiddleware(middlewareName) {
    this.#disabledMiddlewareMap[middlewareName] = true;
  }

  enableMiddleware(middlewareName) {
    delete this.#disabledMiddlewareMap[middlewareName];
  }

  resetDisabledMiddlewares() {
    this.#disabledMiddlewareMap = {};
  }
  // Clear all caches from all middlewares
  clearCache() {
    for (const [middlewareName, middleware] of this.#middlewareArr) {
      try {
        middleware(MIDDLEWARE_TYPE.CLEAR_CACHE);
      } catch (error) {
        const errStr = `Error in clearing cache for middleware "${middlewareName}"`;

        console.error(errStr, "\n", error);
      }
    }
  }

  runMiddlewares(type, apiData) {
    if (this.#cacheDisabled) {
      return;
    }

    const isTypeRequest = type === MIDDLEWARE_TYPE.REQUEST;
    let cachedResponse = null;

    for (const [middlewareName, middleware] of this.#middlewareArr) {
      if (this.#disabledMiddlewareMap[middlewareName]) {
        continue;
      }

      try {
        cachedResponse = middleware(type, apiData);
      } catch (error) {
        const errStr = `Error in middleware "${middlewareName}" for type "${type}" and API data:`;

        console.error(errStr, "\n", apiData, "\n\n", error);

        // Disable the middleware to prevent further runs
        this.disableMiddleware(middlewareName);
      }

      if (isTypeRequest && cachedResponse) {
        return cachedResponse;
      }
    }
  }
}
