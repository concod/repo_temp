export const handleExclusion = (key, newData, setData) => {
  const handleNewExclusion = (prevState) => {
    const updatedState = [...prevState];
    const valueIndex = prevState.findIndex(
      (elem) => elem.key === key.filter_id
    );
    if (valueIndex === -1) {
      updatedState.push({ key: key.filter_id, value: newData });
    } else {
      updatedState[valueIndex] = { key: key.filter_id, value: newData };
    }
    return updatedState;
  };
  setData(handleNewExclusion);
};
