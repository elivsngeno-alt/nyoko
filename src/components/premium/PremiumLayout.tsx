import { useCallback, useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Outlet } from 'react-router-dom';
import { generateOAuthURL } from '@/components/shared';
import { api_base } from '@/external/bot-skeleton';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import { OAuthTokenExchangeService } from '@/services/oauth-token-exchange.service';
import BottomStatusBar from './BottomStatusBar';
import LandingPage from './LandingPage';
import PremiumHeader from './PremiumHeader';
import PremiumLoader from './PremiumLoader';
import BulkTraderPage from './pages/BulkTraderPage';
import ComingSoonPage from './pages/ComingSoonPage';
import DashboardHome from './pages/DashboardHome';
import FreeBotsPage from './pages/FreeBotsPage';
import type { PremiumSection } from './types';
import './premium-base.scss';
import './premium-app.scss';

const validSections: PremiumSection[] = [
    'dashboard',
    'bot_builder',
    'free_bots',
    'bulk_trader',
    'manual_trader',
    'copy_trading',
    'charts',
    'analysis_tools',
];

const readSection = (): PremiumSection => {
    const value = window.location.hash.replace(/^#\/?/, '').split('?')[0] as PremiumSection;
    return validSections.includes(value) ? value : 'dashboard';
};

const PremiumLayout = observer(() => {
    const { activeLoginid, isAuthorizing, setIsAuthorizing } = useApiBase();
    const { client } = useStore() ?? {};
    const [section, setSection] = useState<PremiumSection>(readSection);
    const [, setAuthProbe] = useState(0);
    const hasBootstrappedSession = useRef(false);

    const params = new URLSearchParams(window.location.search);
    const isOAuthCallback = Boolean(params.get('code') && params.get('state'));
    const hasStoredAuth = OAuthTokenExchangeService.isAuthenticated();
    const isAuthenticated = Boolean(activeLoginid || client?.is_logged_in || hasStoredAuth);

    useEffect(() => {
        document.title = 'PROD B TRADER';
    }, []);

    useEffect(() => {
        const handleHashChange = () => setSection(readSection());
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    // The official AppRoot normally initializes api_base. The premium dashboard is
    // intentionally shown before the Bot Builder mounts, so restore an authenticated
    // session here on a hard refresh as well.
    useEffect(() => {
        if (
            hasBootstrappedSession.current ||
            isOAuthCallback ||
            !hasStoredAuth ||
            activeLoginid ||
            client?.is_logged_in
        ) {
            return;
        }

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

    const startOAuth = useCallback(
        async (prompt?: string) => {
            try {
                setIsAuthorizing(true);
                const url = await generateOAuthURL(prompt);
                if (url) window.location.replace(url);
                else setIsAuthorizing(false);
            } catch (error) {
                console.error('OAuth redirect failed:', error);
                setIsAuthorizing(false);
            }
        },
        [setIsAuthorizing]
    );

    const changeSection = useCallback((next: PremiumSection) => {
        setSection(next);
        window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}#${next}`);
    }, []);

    if (!isAuthenticated && (isOAuthCallback || isAuthorizing)) return <PremiumLoader />;
    if (!isAuthenticated) {
        return <LandingPage onLogin={() => startOAuth()} onSignup={() => startOAuth('registration')} busy={isAuthorizing} />;
    }

    const renderSection = () => {
        if (section === 'dashboard') return <DashboardHome openBotBuilder={() => changeSection('bot_builder')} />;
        if (section === 'bot_builder') return <div className='prodb-bot-builder-host'><Outlet /></div>;
        if (section === 'free_bots') return <FreeBotsPage />;
        if (section === 'bulk_trader') return <BulkTraderPage />;

        const titles = {
            manual_trader: 'Manual Trader',
            copy_trading: 'Copy Trading',
            charts: 'Charts',
            analysis_tools: 'Analysis Tools',
        } as const;
        return <ComingSoonPage title={titles[section as keyof typeof titles]} />;
    };

    return (
        <div className={`prodb-premium-shell ${section === 'bot_builder' ? 'prodb-premium-shell--builder' : ''}`}>
            <PremiumHeader active={section} onChange={changeSection} />
            <main className='prodb-premium-content'>{renderSection()}</main>
            {section !== 'bot_builder' && <BottomStatusBar />}
        </div>
    );
});

export default PremiumLayout;
