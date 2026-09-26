import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  lockedCells: [],
  sessionId: null,
  calculationUUID: null,
};

const omsEditSlice = createSlice({
  name: "oms/edit",
  initialState,
  reducers: {
    setLockedCells: (state, action) => {
      state.lockedCells = action.payload;
    },
    setSessionId: (state, action) => {
      state.sessionId = action.payload;
    },
    clearLockedCells: (state) => {
      state.lockedCells = [];
    },
    setCalculationUUID: (state, action) => {
      state.calculationUUID = action.payload;
    },
  },
});

const selectEditRoot = (state) =>
  state.omsReducer?.orderManagementTableService?.edit ?? initialState;

export const selectLockedCells = (state) => selectEditRoot(state).lockedCells;
export const selectSessionId = (state) => selectEditRoot(state).sessionId;
export const selectCalculationUUID = (state) => selectEditRoot(state).calculationUUID;

// Plansmart-compatible alias
export const selectPivotLockedCells = selectLockedCells;

// Stub thunk — lock/unlock is a no-op until the BE endpoint is wired
export const clearCellsLockUnlockStatus = () => () => Promise.resolve();

export const { setLockedCells, setSessionId, clearLockedCells, setCalculationUUID } = omsEditSlice.actions;
export const setPivotLockedCells = setLockedCells;

export default omsEditSlice.reducer;
