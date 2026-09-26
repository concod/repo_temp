export class InMemoryCache {
  #cache;

  constructor() {
    this.#cache = {};
  }

  get(key) {
    return this.#cache[key];
  }

  set(key, value) {
    this.#cache[key] = value;
  }

  remove(key) {
    delete this.#cache[key];
  }
  clear() {
    this.#cache = {};
  }
}
