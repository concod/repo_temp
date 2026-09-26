import { Input } from "impact-ui";

const InputField = (props) => {
  const {
    label,
    placeholder,
    onChange,
    inputValue,
    maxLength,
    ...otherProps
  } = props;
  return (
    <Input
      label={label}
      placeholder={placeholder}
      onChange={onChange}
      value={inputValue}
      maxLength={maxLength}
      {...otherProps}
    />
  );
};

export default InputField;
