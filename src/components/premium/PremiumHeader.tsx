import { observer } from 'mobx-react-lite';
import BrandMark from './BrandMark';
import PremiumAccountSwitcher from './PremiumAccountSwitcher';
import { ChartIcon, CopyIcon, GearIcon, GridIcon, HomeIcon, MonitorIcon, RobotIcon, SearchIcon } from './icons';
import PremiumTicker from './PremiumTicker';
import type { PremiumSection } from './types';

const navItems: Array<{ id: PremiumSection; label: string; Icon: typeof HomeIcon }> = [
    { id: 'dashboard', label: 'Dashboard', Icon: HomeIcon },
    { id: 'bot_ideas', label: 'Bot Ideas', Icon: RobotIcon },
    { id: 'quick_bot', label: 'Quick Bot', Icon: GridIcon },
    { id: 'bot_builder', label: 'Bot Builder', Icon: GearIcon },
    { id: 'free_bots', label: 'Free Bots', Icon: RobotIcon },
    { id: 'signal_ai', label: 'Signal AI', Icon: ChartIcon },
    { id: 'auto_trader', label: 'Auto Trader', Icon: ChartIcon },
    { id: 'manual_trading', label: 'Manual Trading', Icon: MonitorIcon },
    { id: 'bulk_trader', label: 'BULK TRADER', Icon: GridIcon },
    { id: 'copy_trading', label: 'Copy Trading', Icon: CopyIcon },
    { id: 'speedbot', label: 'Speedbot', Icon: SearchIcon },
    { id: 'pro_ai', label: 'Pro AI', Icon: GridIcon },
    { id: 'analysis_tools', label: 'Analysis Tools', Icon: SearchIcon },
    { id: 'analysis_hub', label: 'Analysistools', Icon: ChartIcon },
    { id: 'charts', label: 'Chart', Icon: ChartIcon },
    { id: 'dtrader', label: 'DTrader', Icon: MonitorIcon },
];

const PremiumHeader = observer(({ active, onChange }: { active: PremiumSection; onChange: (section: PremiumSection) => void }) => (
    <>
        <div className='prodb-app-header'>
            <button className='prodb-app-header__brand' onClick={() => onChange('dashboard')}><BrandMark /></button>
            <PremiumAccountSwitcher />
        </div>
        <nav className='prodb-nav' aria-label='PROD B TRADER tools'>
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
