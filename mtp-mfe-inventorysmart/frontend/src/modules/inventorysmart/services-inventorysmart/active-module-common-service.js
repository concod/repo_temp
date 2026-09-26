import { createSlice } from "@reduxjs/toolkit";

export const activeModulesCacheService = createSlice({
  name: "active-module-cache-service",
  initialState: {
    cache: {},
  },
  reducers: {
    setKeyValueInCache: (state, action) => {
      const { key, value, module, persist } = action.payload;
      // Initialize the module cache if it doesn't exist
      if (!state.cache[module]) {
        state.cache[module] = { persist: [] };
      }
      // Update the module's cache
      state.cache[module] = {
        ...state.cache[module],
        [key]: value,
        persist: persist
        // if data to be persisted in entire session, we add it in persist array for this module.
          ? [...state.cache[module]["persist"], key]
          : state.cache[module]["persist"],
      };
    },
    clearActiveModuleCache: (state, action) => {
      const  module  = action.payload;
      // If module exists in cache
      if (state.cache[module]) {
        const persistedKeys = state.cache[module].persist || [];

        // Create a new object to hold only the persisted keys
        const newModuleCache = {};
        persistedKeys.forEach((thisKey) => {
          if (state.cache[module].hasOwnProperty(thisKey)) {
            newModuleCache[thisKey] = state.cache[module][thisKey];
          }
        });
        // Retain the 'persist' array and update the module cache
        newModuleCache.persist = persistedKeys;
        state.cache[module] = newModuleCache;
      }
    },
  },
});

export const {
  setKeyValueInCache,
  clearActiveModuleCache,
} = activeModulesCacheService.actions;
export default activeModulesCacheService.reducer;
