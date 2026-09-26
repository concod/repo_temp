import { DivContainer } from "./style";

const WrapperDiv = (props) => {
  return (
    <DivContainer id={props?.id} {...props?.style}>
      {props?.children}
    </DivContainer>
  );
};

export default WrapperDiv;
