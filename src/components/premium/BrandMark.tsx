import { getDomainAbbreviation, getTemplateDomain } from './domain-brand';

const BrandMark = ({ dark = false }: { dark?: boolean }) => {
    const domain = getTemplateDomain();
    const abbreviation = getDomainAbbreviation(domain);

    return (
        <div className={`prodb-brand ${dark ? 'prodb-brand--dark' : ''}`} aria-label={domain}>
            <span className='prodb-brand__symbol' aria-hidden='true'>{abbreviation}</span>
            <div className='prodb-brand__copy'>
                <strong>{domain}</strong>
                <small>SMART DERIV TOOLS</small>
            </div>
        </div>
    );
};

export default BrandMark;
