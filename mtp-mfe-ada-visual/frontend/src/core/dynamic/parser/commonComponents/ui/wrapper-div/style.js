import styled from "styled-components";

export const DivContainer = styled.div`
  padding: ${(props) => props.padding};
  width: ${(props) => props.width};
  max-width: ${(props) => props.maxWidth};
  background-color: ${(props) => props.bgColor};
  display: ${(props) => props.display};
  justify-content: ${(props) => props.justifyContent};
  align-items: ${(props) => props.alignItems};
  gap: ${(props) => props.gap};
  margin: ${(props) => props.margin};
`;
