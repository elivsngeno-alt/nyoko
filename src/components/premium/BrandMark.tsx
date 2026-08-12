import logo from '@/assets/prodb-premium/prodb-logo.png';

const BrandMark = ({ dark = false }: { dark?: boolean }) => (
    <div className={`prodb-brand ${dark ? 'prodb-brand--dark' : ''}`} aria-label='PROD B TRADER'>
        <img src={logo} alt='PROD B TRADER' />
        <div className='prodb-brand__copy'><strong>PROD <span>B TRADER</span></strong><small>SMART DERIV TOOLS</small></div>
    </div>
);
export default BrandMark;
