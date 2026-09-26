import "./Login.scss";
import { Header } from "./Header/Header";
import { Form } from "./Form/Form";
import carouselImage from "../assets/carousel-image.svg";
import type { LoginProps } from "./Form/types";

export const Login = ({ logo, formHeader }: LoginProps) => {
  return (
    <div className="login-container">
      <Header logo={logo} />
      <div className="login-content">
        <div className="login-content-form">
          <Form
            title={formHeader.title}
            onSubmit={formHeader.onSubmit}
            validationRules={formHeader.validationRules}
            error={formHeader.error}
          />
        </div>
        <div className="login-content-carousel">
          <div className="login-content-carousel-container">
            <div className="login-content-carousel-container-header">
              Powering the AI in Retail
            </div>
            <img src={carouselImage} alt="carousel" loading="lazy" />
          </div>
        </div>
      </div>
    </div>
  );
};
