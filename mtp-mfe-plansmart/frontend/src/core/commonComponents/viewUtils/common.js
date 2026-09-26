import styled from "styled-components";

export const ViewWrapper = styled.div`
  // margin-left:var(--sidebar-width);
  //margin-top:var(--header-height);
  min-height: calc(100vh - var(--header-height));
  //width:calc(100% - 1*var(--sidebar-width));
  padding: 20px 36px;
  background-color: #f9f9f9;
`;

export const ViewHeader = styled.div`
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  font-size: 16px;
  padding: 8px 0;
  margin-bottom: 20px;
`;

export const ViewBody = styled.div`
  border-radius: 4px;
  transition: box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
`;
