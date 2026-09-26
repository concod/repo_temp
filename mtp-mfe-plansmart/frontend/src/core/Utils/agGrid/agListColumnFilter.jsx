import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Input } from "impact-ui";
import ReactDOM from "react-dom";

export default forwardRef((props, ref) => {
  const [text, setText] = useState("");
  const [type, setType] = useState("");
  const refInput = useRef(null);

  useEffect(() => {
    props.filterChangedCallback();
  }, [text]);

  useImperativeHandle(ref, () => {
    return {
      isFilterActive() {
        return text != null && text !== "";
      },

      doesFilterPass(params) {
        const { api, colDef, column, columnApi, context, valueGetter } = props;
        const { node } = params;
        const value = valueGetter({
          api,
          colDef,
          column,
          columnApi,
          context,
          data: node.data,
          getValue: (field) => node.data[field],
          node,
        })
          .toString()
          .toLowerCase();

        return text
          .toLowerCase()
          .split(" ")
          .every((filterWord) => value.indexOf(filterWord) >= 0);
      },

      getModel() {
        if (!this.isFilterActive()) {
          return null;
        }

        return { type: type, filter: text, filterType: "list" };
      },

      setModel(model) {
        setType(model ? model.type : "");
        setText(model ? model.filter : "");
      },

      afterGuiAttached(params) {
        focus();
      },

      componentMethod(message) {
        alert(`Alert from agListColumnFilter: ${message}`);
      },
    };
  });

  const focus = () => {
    window.setTimeout(() => {
      const container = ReactDOM.findDOMNode(refInput.current);
      if (container) {
        container.focus();
      }
    });
  };

  const onChange = (event) => {
    const newValue = event.target.value;
    if (text !== newValue) {
      setText(newValue);
    }
  };

  return (
    <Input
      label="Filter"
      placeholder="Filter..."
      helperText="Filter..."
      ref={refInput}
      value={text}
      onChange={onChange}
    />
  );
});
