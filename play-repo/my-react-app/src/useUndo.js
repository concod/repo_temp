import { useState, useCallback } from "react";

const useUndo = (initialValue) => {
  const [value, setValue] = useState(initialValue);
  const [prevValue, setPrevValue] = useState([]);
  const [nextValue, setNextValue] = useState([]);

  const set = (newValue) => {
    setValue(newValue);
    setPrevValue((value) => [...value, newValue]);
    setNextValue([]);
  };

  const undo = () => {
    if (!prevValue.length) return;
    const prevArray = prevValue.slice(0, prevValue.length - 1);
    const lastValue = prevArray[prevArray.length - 1];

    if (!lastValue) setValue("");
    else setValue(lastValue);

    setPrevValue(prevArray);
    setNextValue((value) => [...value, prevValue[prevValue.length - 1]]);
  };

  const redo = () => {
    if (!nextValue.length) return;
    const nextArray = nextValue.slice(0, nextValue.length - 1);
    const lastValue = nextValue[nextValue.length - 1];
    setValue(lastValue);
    setNextValue(nextArray);
    setPrevValue((value) => [...value, lastValue]);
  };

  return {
    value,
    set,
    undo,
    redo,
    canUndo: prevValue.length > 0,
    canRedo: nextValue.length > 0,
  };
};

export default useUndo;
