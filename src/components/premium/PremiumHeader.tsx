import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { observer } from 'mobx-react-lite';
import BrandMark from './BrandMark';
import PremiumAccountSwitcher from './PremiumAccountSwitcher';
import { CalculatorIcon, CopyIcon, GearIcon, GridIcon, HomeIcon, RobotIcon, SearchIcon } from './icons';
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
    { id: 'calculator', label: 'Calculator', Icon: CalculatorIcon },
    { id: 'deposit_stock_withdraw', label: 'Deposit, Stock, Withdraw', Icon: GridIcon },
];

const PremiumHeader = observer(
    ({ active, onChange }: { active: PremiumSection; onChange: (section: PremiumSection) => void }) => {
        const navRef = useRef<HTMLElement | null>(null);
        const dragRef = useRef({ active: false, pointerId: -1, startX: 0, scrollLeft: 0, moved: false });

        const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
            if (event.pointerType !== 'mouse' || event.button !== 0 || !navRef.current) return;
            dragRef.current = {
                active: true,
                pointerId: event.pointerId,
                startX: event.clientX,
                scrollLeft: navRef.current.scrollLeft,
                moved: false,
            };
            navRef.current.setPointerCapture?.(event.pointerId);
        };

        const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
            const nav = navRef.current;
            const drag = dragRef.current;
            if (!nav || !drag.active || drag.pointerId !== event.pointerId) return;

            const delta = event.clientX - drag.startX;
            if (Math.abs(delta) > 4) drag.moved = true;
            if (drag.moved) {
                event.preventDefault();
                nav.scrollLeft = drag.scrollLeft - delta;
            }
        };

        const endPointerDrag = (event: ReactPointerEvent<HTMLElement>) => {
            const nav = navRef.current;
            if (nav?.hasPointerCapture?.(event.pointerId)) nav.releasePointerCapture(event.pointerId);
            dragRef.current.active = false;
        };

        const onNavClick = (section: PremiumSection) => {
            if (dragRef.current.moved) {
                dragRef.current.moved = false;
                return;
            }
            onChange(section);
        };

        return (
            <>
                <div className='prodb-app-header'>
                    <button className='prodb-app-header__brand' onClick={() => onChange('dashboard')}>
                        <BrandMark />
                    </button>
                    <PremiumAccountSwitcher />
                </div>
                <nav
                    ref={navRef}
                    className='prodb-nav'
                    aria-label='Site tools'
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={endPointerDrag}
                    onPointerCancel={endPointerDrag}
                >
                    {navItems.map(({ id, label, Icon }) => (
                        <button key={id} className={active === id ? 'is-active' : ''} onClick={() => onNavClick(id)}>
                            <Icon />
                            <span>{label}</span>
                        </button>
                    ))}
                </nav>
                <PremiumTicker light />
            </>
        );
    }
);

export default PremiumHeader;
