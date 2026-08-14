import { useCallback, useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { generateOAuthURL } from '@/components/shared';
import { DBOT_TABS } from '@/constants/bot-contents';
import { api_base } from '@/external/bot-skeleton';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import { OAuthTokenExchangeService } from '@/services/oauth-token-exchange.service';
import BottomStatusBar from './BottomStatusBar';
import { getTemplateDomain } from './domain-brand';
import GlobalContractBridge from './GlobalContractBridge';
import GlobalQuickTrade from './GlobalQuickTrade';
import LandingPage from './LandingPage';
import PremiumHeader from './PremiumHeader';
import PremiumLoader from './PremiumLoader';
import AnalysisToolsPage from './pages/AnalysisToolsPage';
import BulkTraderPage from './pages/BulkTraderPage';
import DashboardHome from './pages/DashboardHome';
import FreeBotsPage from './pages/FreeBotsPage';
import {
    AdvancedManualTradingPage,
    AutoTraderPage,
    BotIdeasPage,
    DTraderPage,
    ProAIPage,
    QuickBotPage,
    SignalAIPage,
    SourceAnalysisToolsPage,
    SpeedbotPage,
} from './pages/ImportedFeaturePages';
import { ChartsPage } from './pages/LiveTradingPages';
import PatCopyTradingPage from './pages/PatCopyTradingPage';
import type { PremiumSection } from './types';
import './premium-base.scss';
import './premium-app.scss';
import './premium-live.scss';
import './premium-imported.scss';
import './premium-imported-library.scss';
import './premium-token-panel.scss';
import './premium-native-bot-builder.scss';
import './premium-account.scss';
import './premium-global-trading.scss';

const validSections: PremiumSection[] = [
    'dashboard', 'bot_ideas', 'quick_bot', 'bot_builder', 'free_bots', 'signal_ai', 'auto_trader',
    'manual_trading', 'bulk_trader', 'copy_trading', 'speedbot', 'pro_ai', 'analysis_tools',
    'analysis_hub', 'charts', 'dtrader',
];

const sectionFromHash = (hash: string): PremiumSection => {
    const value = hash.replace(/^#\/?/, '').split('?')[0] as PremiumSection;
    return validSections.includes(value) ? value : 'dashboard';
};

const PremiumLayout = observer(() => {
    const { activeLoginid, isAuthorizing, setIsAuthorizing } = useApiBase();
    const store = useStore();
    const { client, dashboard, run_panel } = store ?? {};
    const location = useLocation();
    const navigate = useNavigate();
    const [section, setSection] = useState<PremiumSection>(() => sectionFromHash(location.hash));
    const [, setAuthProbe] = useState(0);
    const hasBootstrappedSession = useRef(false);

    const params = new URLSearchParams(window.location.search);
    const isOAuthCallback = Boolean(params.get('code') && params.get('state'));
    const hasStoredAuth = OAuthTokenExchangeService.isAuthenticated();
    const isAuthenticated = Boolean(activeLoginid || client?.is_logged_in || hasStoredAuth);

    useEffect(() => { document.title = getTemplateDomain(); }, []);

    useEffect(() => {
        setSection(sectionFromHash(location.hash));
    }, [location.hash]);

    useEffect(() => {
        if (hasBootstrappedSession.current || isOAuthCallback || !hasStoredAuth || activeLoginid || client?.is_logged_in) return;
        hasBootstrappedSession.current = true;
        api_base.init(true).catch(error => {
            hasBootstrappedSession.current = false;
            console.error('Failed to restore authenticated Deriv session:', error);
        });
    }, [activeLoginid, client?.is_logged_in, hasStoredAuth, isOAuthCallback]);

    useEffect(() => {
        if ((!isOAuthCallback && !isAuthorizing) || isAuthenticated) return;
        const timer = window.setInterval(() => setAuthProbe(value => value + 1), 500);
        return () => window.clearInterval(timer);
    }, [isAuthenticated, isOAuthCallback, isAuthorizing]);

    const activateNativeBotBuilder = useCallback(() => {
        dashboard?.setActiveTab(DBOT_TABS.BOT_BUILDER);
        run_panel?.toggleDrawer(true);
    }, [dashboard, run_panel]);

    useEffect(() => {
        if (!isAuthenticated || section !== 'bot_builder') return;

        // AppContent remains mounted even while another premium section is visible.
        // Pin the native tab to Bot Builder only when that section is opened.
        activateNativeBotBuilder();
        const frame = window.requestAnimationFrame(activateNativeBotBuilder);
        const retry = window.setTimeout(activateNativeBotBuilder, 120);
        const resize = window.setTimeout(() => window.dispatchEvent(new Event('resize')), 220);

        return () => {
            window.cancelAnimationFrame(frame);
            window.clearTimeout(retry);
            window.clearTimeout(resize);
        };
    }, [activateNativeBotBuilder, isAuthenticated, section]);

    const startOAuth = useCallback(async (prompt?: string) => {
        try {
            setIsAuthorizing(true);
            const url = await generateOAuthURL(prompt);
            if (url) window.location.replace(url);
            else setIsAuthorizing(false);
        } catch (error) {
            console.error('OAuth redirect failed:', error);
            setIsAuthorizing(false);
        }
    }, [setIsAuthorizing]);

    const changeSection = useCallback((next: PremiumSection) => {
        setSection(next);
        navigate(
            {
                pathname: location.pathname,
                search: location.search,
                hash: `#${next}`,
            },
            { replace: true }
        );

        if (next === 'bot_builder') activateNativeBotBuilder();
    }, [activateNativeBotBuilder, location.pathname, location.search, navigate]);

    if (!isAuthenticated && (isOAuthCallback || isAuthorizing)) return <PremiumLoader />;
    if (!isAuthenticated) return <LandingPage onLogin={() => startOAuth()} onSignup={() => startOAuth('registration')} busy={isAuthorizing} />;

    const openBotBuilder = () => changeSection('bot_builder');
    const renderSection = () => {
        switch (section) {
            case 'dashboard': return <DashboardHome openBotBuilder={openBotBuilder} openSection={changeSection} />;
            case 'bot_ideas': return <BotIdeasPage openBotBuilder={openBotBuilder} />;
            case 'quick_bot': return <QuickBotPage openBotBuilder={openBotBuilder} openSection={changeSection} />;
            case 'bot_builder': return null;
            case 'free_bots': return <FreeBotsPage openBotBuilder={openBotBuilder} />;
            case 'signal_ai': return <SignalAIPage />;
            case 'auto_trader': return <AutoTraderPage />;
            case 'manual_trading': return <AdvancedManualTradingPage />;
            case 'bulk_trader': return <BulkTraderPage />;
            case 'copy_trading': return <PatCopyTradingPage />;
            case 'speedbot': return <SpeedbotPage />;
            case 'pro_ai': return <ProAIPage />;
            case 'analysis_tools': return <AnalysisToolsPage />;
            case 'analysis_hub': return <SourceAnalysisToolsPage />;
            case 'charts': return <ChartsPage />;
            case 'dtrader': return <DTraderPage />;
            default: return null;
        }
    };

    const isBotBuilder = section === 'bot_builder';
    return <div className={`prodb-premium-shell ${isBotBuilder ? 'prodb-premium-shell--builder' : ''}`}>
        <GlobalContractBridge />
        <PremiumHeader active={section} onChange={changeSection} />
        <main className='prodb-premium-content'>
            {!isBotBuilder && renderSection()}
            <div className={`prodb-bot-builder-host ${isBotBuilder ? 'is-active' : 'is-hidden'}`} aria-hidden={!isBotBuilder}>
                <Outlet />
            </div>
        </main>
        <GlobalQuickTrade hidden={isBotBuilder} />
        {!isBotBuilder && <BottomStatusBar />}
    </div>;
});

export default PremiumLayout;
