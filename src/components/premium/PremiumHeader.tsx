import { observer } from 'mobx-react-lite';
import BrandMark from './BrandMark';
import PremiumAccountSwitcher from './PremiumAccountSwitcher';
import { CopyIcon, GearIcon, GridIcon, HomeIcon, RobotIcon, SearchIcon } from './icons';
import PremiumTicker from './PremiumTicker';
import type { PremiumSection } from './types';

const navItems: Array<{ id: PremiumSection; label: string; Icon: typeof HomeIcon }> = [
    { id: 'dashboard', label: 'Dashboard', Icon: HomeIcon },
    { id: 'bot_builder', label: 'Bot Builder', Icon: GearIcon },
    { id: 'free_bots', label: 'Free Bots', Icon: RobotIcon },
    { id: 'bulk_trader', label: 'Bulk Trader', Icon: GridIcon },
    { id: 'batch_trader', label: 'Batch Trader', Icon: GridIcon },
    { id: 'speedbot', label: 'Speed Bot', Icon: GridIcon },
    { id: 'copy_trading', label: 'Copy Trading', Icon: CopyIcon },
    { id: 'analysis_tools', label: 'Analysis Tool', Icon: SearchIcon },
];

const PremiumHeader = observer(({ active, onChange }: { active: PremiumSection; onChange: (section: PremiumSection) => void }) => (
    <>
        <div className='prodb-app-header'>
            <button className='prodb-app-header__brand' onClick={() => onChange('dashboard')}><BrandMark /></button>
            <PremiumAccountSwitcher />
        </div>
        <nav className='prodb-nav' aria-label='Site tools'>
            {navItems.map(({ id, label, Icon }) => (
                <button key={id} className={active === id ? 'is-active' : ''} onClick={() => onChange(id)}>
                    <Icon /><span>{label}</span>
                </button>
            ))}
        </nav>
        <PremiumTicker light />
    </>
));

export default PremiumHeader;
