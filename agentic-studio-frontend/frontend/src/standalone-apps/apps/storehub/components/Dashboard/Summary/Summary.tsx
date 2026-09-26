import './Summary.scss';
import { SummaryTag } from '../Tag/SummaryTag';
import { StoreButton } from '../StoreDeepDive/StoreButton/StoreButton';

interface SummaryProps {
    labelTag: string,
    summaryItems: string[]

}
export const Summary: React.FC<SummaryProps>= ({labelTag, summaryItems}: SummaryProps) => {
    return (
        <div className="summary-card">
            <div className="summary-card__header">
                <SummaryTag label={labelTag} />
                <StoreButton iconName="copy" onClick={() => {}} />
            </div>
            <div className="summary-card__content">
                {
                    summaryItems.length > 0 ?
                    summaryItems.map((item, index) => (
                        <div key={index} className="summary-card__content-item">
                            <div className="summary-card__content-item-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 13 13" fill="none">
                                    <path d="M4.52327 1.62558C5.16244 1.5335 5.83952 2.23225 6.03452 3.19641C6.22952 4.15516 5.87744 5.011 5.23827 5.1085C4.60452 5.206 3.92202 4.50725 3.72161 3.54308C3.52119 2.58433 3.88411 1.7285 4.52327 1.62558ZM8.39619 1.62558C9.04077 1.7285 9.39827 2.58433 9.20869 3.54308C9.00286 4.50725 8.32577 5.206 7.68661 5.1085C7.04202 5.011 6.68994 4.15516 6.89036 3.19641C7.08536 2.23225 7.76244 1.5335 8.39619 1.62558ZM1.62536 4.11725C2.24286 3.85183 3.08244 4.33391 3.52119 5.1735C3.93286 6.02933 3.79202 6.9285 3.17994 7.19391C2.56786 7.45933 1.73369 6.98266 1.30577 6.13225C0.877856 5.28183 1.02952 4.37725 1.62536 4.11725ZM11.3754 4.11725C11.9712 4.37725 12.1229 5.28183 11.6949 6.13225C11.267 6.98266 10.4329 7.45933 9.82077 7.19391C9.20869 6.9285 9.06786 6.02933 9.47952 5.1735C9.91827 4.33391 10.7579 3.85183 11.3754 4.11725ZM10.4708 9.95641C10.4924 10.4656 10.1024 11.0289 9.63661 11.2402C8.66702 11.6843 7.51869 10.7635 6.44077 10.7635C5.36286 10.7635 4.20369 11.7222 3.25036 11.2402C2.70869 10.9747 2.33494 10.2706 2.40536 9.68558C2.50286 8.8785 3.47244 8.44516 4.04661 7.85475C4.81036 7.091 5.35202 5.65558 6.44077 5.65558C7.52411 5.65558 8.09827 7.06933 8.82952 7.85475C9.43077 8.51558 10.4329 9.0735 10.4708 9.95641Z" fill="#60697D"/>
                                </svg>
                            </div>
                            <div className="summary-card__content-item-desc">
                            {item}
                            </div>
                        </div>
                    )) : <div className="summary-card__content-item">No Summary Available</div>
                }
                
                
            </div>
        </div>
    );
};