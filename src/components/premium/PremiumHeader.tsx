import { observer } from 'mobx-react-lite';
import BrandMark from './BrandMark';
import PremiumAccountSwitcher from './PremiumAccountSwitcher';
import { ChartIcon, CopyIcon, GearIcon, GridIcon, HomeIcon, MonitorIcon, RobotIcon, SearchIcon } from './icons';
import PremiumTicker from './PremiumTicker';
import type { PremiumSection } from './types';

const navItems: Array<{ id: PremiumSection; label: string; Icon: typeof HomeIcon }> = [
    { id: 'dashboard', label: 'Dashboard', Icon: HomeIcon },
    { id: 'bot_builder', label: 'Bot Builder', Icon: GearIcon },
    { id: 'free_bots', label: 'Free Bots', Icon: RobotIcon },
    { id: 'bulk_trader', label: 'BULK TRADER', Icon: GridIcon },
    { id: 'manual_trader', label: 'Manual Trader', Icon: MonitorIcon },
    { id: 'copy_trading', label: 'Copy Trading', Icon: CopyIcon },
    { id: 'charts', label: 'Charts', Icon: ChartIcon },
    { id: 'analysis_tools', label: 'Analysis Tools', Icon: SearchIcon },
];

const PremiumHeader = observer(({ active, onChange }: { active: PremiumSection; onChange: (section: PremiumSection) => void }) => (
    <>
        <div className='prodb-app-header'>
            <button className='prodb-app-header__brand' onClick={() => onChange('dashboard')}><BrandMark /></button>
            <PremiumAccountSwitcher />
        </div>
        <nav className='prodb-nav'>
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
