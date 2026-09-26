import "./Banner.scss";
import bannerVector from "../../../assets/banner-vector.svg";

interface BannerProps {
    title: string;
    description: string;
}

export const Banner: React.FC<BannerProps> = ({ title, description }) => {
    return (
        <div className="banner">
            <div className="banner-content">
                <div className="banner-title">{title}</div>
                <div className="banner-description">{description}</div>
            </div>

            <div className="banner-image">
                <img src={bannerVector} alt="Banner Vector" />
            </div>
        </div>
    );
}