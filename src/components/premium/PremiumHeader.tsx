import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useLogout } from '@/hooks/useLogout';
import { useStore } from '@/hooks/useStore';
import BrandMark from './BrandMark';
import { ChartIcon, CopyIcon, GearIcon, GridIcon, HomeIcon, MonitorIcon, RobotIcon, SearchIcon } from './icons';
import PremiumTicker from './PremiumTicker';
import type { PremiumSection } from './types';
const navItems: Array<{ id: PremiumSection; label: string; Icon: typeof HomeIcon }> = [{id:'dashboard',label:'Dashboard',Icon:HomeIcon},{id:'bot_builder',label:'Bot Builder',Icon:GearIcon},{id:'free_bots',label:'Free Bots',Icon:RobotIcon},{id:'bulk_trader',label:'BULK TRADER',Icon:GridIcon},{id:'manual_trader',label:'Manual Trader',Icon:MonitorIcon},{id:'copy_trading',label:'Copy Trading',Icon:CopyIcon},{id:'charts',label:'Charts',Icon:ChartIcon},{id:'analysis_tools',label:'Analysis Tools',Icon:SearchIcon}];
const PremiumHeader = observer(({ active, onChange }: { active: PremiumSection; onChange: (section: PremiumSection) => void }) => {
const { client } = useStore() ?? {}; const logout = useLogout(); const [menuOpen,setMenuOpen]=useState(false); const balance=Number(client?.balance ?? 0); const currency=client?.currency || 'USD'; const loginid=client?.loginid || 'Deriv account';
return <><div className='prodb-app-header'><button className='prodb-app-header__brand' onClick={() => onChange('dashboard')}><BrandMark /></button><div className='prodb-app-header__account'><span className='prodb-app-header__flag'>🇺🇸</span><strong>{Number.isFinite(balance) ? balance.toFixed(2) : '0.00'} <small>{currency}</small></strong><button className='prodb-account-toggle' onClick={() => setMenuOpen(v=>!v)}>⌄</button><button className='prodb-user-circle' onClick={() => setMenuOpen(v=>!v)}>◉</button>{menuOpen && <div className='prodb-account-menu'><strong>{loginid}</strong><span>{currency} account</span><button onClick={logout}>Log out</button></div>}</div></div><nav className='prodb-nav'>{navItems.map(({id,label,Icon}) => <button key={id} className={active===id?'is-active':''} onClick={() => onChange(id)}><Icon /><span>{label}</span></button>)}</nav><PremiumTicker light /></>;
});
export default PremiumHeader;
