import { useEffect, useMemo, useState } from 'react';
import { useApiBase } from '@/hooks/useApiBase';
import { PremiumDerivApiService } from '@/services/premium-deriv-api.service';
import type { PremiumSection } from '../types';

const launcherItems: Array<[string, string, PremiumSection]> = [
    ['▰','My computer','bot_builder'], ['▲','Google Drive','bot_builder'], ['✚','Bot builder','bot_builder'],
    ['✚','Quick strategy','bot_builder'], ['▥','Analysis','analysis_tools'], ['♛','King of Matches','analysis_tools'], ['✧','Speed Lab','charts'],
];

const DashboardHome = ({ openBotBuilder, openSection }: { openBotBuilder: () => void; openSection?: (section: PremiumSection) => void }) => {
    const { authData } = useApiBase();
    const [marketCount, setMarketCount] = useState(0);
    const [openContracts, setOpenContracts] = useState(0);
    const [history, setHistory] = useState<any[]>([]);
    const [error, setError] = useState('');

    useEffect(() => {
        Promise.allSettled([
            PremiumDerivApiService.activeSymbols(),
            PremiumDerivApiService.portfolio(),
            PremiumDerivApiService.profitTable(20),
        ]).then(([symbols, portfolio, profit]) => {
            if (symbols.status === 'fulfilled') setMarketCount(symbols.value.length);
            if (portfolio.status === 'fulfilled') setOpenContracts(Array.isArray(portfolio.value.contracts) ? portfolio.value.contracts.length : 0);
            if (profit.status === 'fulfilled') setHistory(Array.isArray(profit.value.transactions) ? profit.value.transactions : []);
            if ([symbols, portfolio, profit].every(item => item.status === 'rejected')) setError('Unable to read the current Deriv session.');
        });
    }, [authData?.loginid]);

    const pnl = useMemo(() => history.reduce((sum, item) => sum + (Number(item.sell_price || 0) - Number(item.buy_price || 0)), 0), [history]);
    const currency = authData?.currency || 'USD';
    const launch = (section: PremiumSection) => section === 'bot_builder' ? openBotBuilder() : openSection?.(section);

    return <div className='prodb-dashboard-page'>
        <div className='prodb-dashboard-candles'/>
        <section className='prodb-dashboard-main'>
            <div className='prodb-dashboard-api-strip'>
                <div><small>DERIV ACCOUNT</small><strong>{authData?.loginid || 'Connected'}</strong></div>
                <div><small>LIVE BALANCE</small><strong>{Number(authData?.balance || 0).toFixed(2)} {currency}</strong></div>
                <div><small>ACTIVE MARKETS</small><strong>{marketCount}</strong></div>
                <div><small>OPEN CONTRACTS</small><strong>{openContracts}</strong></div>
                <div><small>LAST 20 NET</small><strong className={pnl >= 0 ? 'is-positive' : 'is-negative'}>{pnl.toFixed(2)} {currency}</strong></div>
            </div>
            <h1>Load or build your bot</h1><p>Import a bot, build it from scratch, run quick strategies, or open live Deriv market analysis.</p>
            <div className='prodb-launchers'>{launcherItems.map(([icon,label,section],index)=><button key={label} onClick={() => launch(section)}><span className={`launcher-icon launcher-icon--${index}`}>{icon}</span><strong>{label}</strong></button>)}</div>
            {error && <div className='prodb-live-error'>{error}</div>}
        </section>
        <aside className='prodb-help-panel'><article className='prodb-help-panel__welcome'><div className='prodb-help-line'/><span className='prodb-help-icon'>📣</span><h2>Welcome to PROD B TRADER</h2><p>Authenticated Deriv Options trading, bot building and live market tools in one workspace.</p></article><article className='prodb-help-card prodb-help-card--green'><span>▣</span><div><h3>Get Started</h3><p>Choose an Options account above, then build a bot or open Manual Trader.</p></div></article><article className='prodb-help-card prodb-help-card--blue'><span>ⓘ</span><div><h3>Deriv session</h3><p>Market data uses WebSocket streams.</p><p>Trading uses the account-scoped OTP WebSocket.</p><p>Real and Demo accounts can be switched from the header.</p></div></article></aside>
        <button className='prodb-ai-button'><span>✨</span><small>AI</small></button>
    </div>;
};

export default DashboardHome;
