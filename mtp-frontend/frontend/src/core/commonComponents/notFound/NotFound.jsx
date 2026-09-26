import React from "react";
import styled from "styled-components";
import { ViewWrapper } from "../viewUtils";
import { ViewBody } from "../viewUtils/common";

function NotFound(props) {
  return (
    <ViewWrapper>
      <ViewBody>
        <NotFoundWrapper>
          <div className="notfound-container">
            <h2>PAGE NOT FOUND</h2>
            <h1>
              <span>4</span>
              <span>0</span>
              <span>4</span>
            </h1>
            <h3>
              WE ARE SORRY, BUT THE PAGE YOU REQUESTED WAS NOT{" "}
              <span>FOUND</span>{" "}
            </h3>
          </div>
        </NotFoundWrapper>
      </ViewBody>
    </ViewWrapper>
  );
}

export default NotFound;

const NotFoundWrapper = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);

  .notfound-container {
    text-align: center;
    color: #888;

    h1 {
      font-size: 200px;
      line-height: 1;
      margin: 0;
      span {
      }
    }

    h2 {
      font-size: 22px;
    }

    h3 {
      font-size: 20px;
      span {
        padding-right: 10px;
        -webkit-animation: type 0.5s alternate infinite;
        animation: type 0.5s alternate infinite;
      }
    }

    @keyframes type {
      from {
        box-shadow: inset -3px 0px 0px #888;
      }
      to {
        box-shadow: inset -3px 0px 0px transparent;
      }
    }
  }
`;
