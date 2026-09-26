import useUndo from "../useUndo";

const UndoComponent = () => {
  const { value, set, undo, redo, canUndo, canRedo } = useUndo(" ");

  return (
    <>
      <input type="text" value={value} onChange={(e) => set(e.target.value)} />
      <button onClick={undo} disabled={!canUndo}>
        Undo
      </button>
      <button onClick={redo} disabled={!canRedo}>
        Redo
      </button>
    </>
  );
};

export default UndoComponent;
