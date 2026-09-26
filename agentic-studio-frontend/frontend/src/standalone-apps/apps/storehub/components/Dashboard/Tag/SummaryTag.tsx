import summaryTag from '../../../assets/welcome-avatar.svg';
import './SummaryTag.scss';

export const SummaryTag = ({ label }: { label: string }) => {
    return (
        <div className="summary-tag">
            <img src={summaryTag} alt="Summary" className='summary-tag__icon'/>
            <span className="summary-tag__text">{label}</span>
        </div>
    );
};