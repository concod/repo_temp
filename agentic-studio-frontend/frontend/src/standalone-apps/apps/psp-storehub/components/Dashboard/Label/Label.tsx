import "./Label.scss";

interface LabelProps {
    text: string;
    color: string;
    textColor?: string;
    icon?: React.ReactNode;
}
export const Label = ({text, color, icon, textColor}: LabelProps) => {
    return(
        <div className="storehub-label" style={{ backgroundColor: color }}>
            <span className="storehub-label-text" style={{ color: textColor }}>{text}</span>
            {icon}
        </div>
    )
}