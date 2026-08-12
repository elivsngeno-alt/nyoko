import { DerivWSAccountsService } from '@/services/derivws-accounts.service';
import { OAuthTokenExchangeService } from '@/services/oauth-token-exchange.service';
import {
    requireCurrentSiteConfig,
    resolveSiteConfig,
} from '@/config/site-registry';
import brandConfig from '../../../../../brand.config.json';

// =============================================================================
// Constants - Domain & Server Configuration (from brand.config.json)
// =============================================================================

export const PRODUCTION_DOMAINS = {
    COM: brandConfig.platform.hostname.production.com,
} as const;

export const STAGING_DOMAINS = {
    COM: brandConfig.platform.hostname.staging.com,
} as const;

export const WS_SERVERS = {
    STAGING: `${brandConfig.platform.derivws.url.staging}options/ws/public`,
    PRODUCTION: `${brandConfig.platform.derivws.url.production}options/ws/public`,
} as const;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Environment is selected by the current host entry in brand.config.json -> sites.
 * This is intentionally not inferred from whether the hostname equals prodbtrader.site,
 * because one deployment can serve several production domains with different OAuth apps.
 */
export const isProduction = () => {
    const configuredSite = resolveSiteConfig();
    if (configuredSite) return configuredSite.environment === 'production';

    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const productionDomains = Object.values(PRODUCTION_DOMAINS) as string[];
    return productionDomains.includes(hostname);
};

export const isLocal = () => /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(
    typeof window !== 'undefined' ? window.location.host : ''
);

const getDefaultServerURL = () => {
    const isProductionEnv = isProduction();

    try {
        return isProductionEnv ? WS_SERVERS.PRODUCTION : WS_SERVERS.STAGING;
    } catch (error) {
        console.error('Error in getDefaultServerURL:', error);
    }

    return isProductionEnv ? WS_SERVERS.PRODUCTION : WS_SERVERS.STAGING;
};

/**
 * Gets the WebSocket URL using the authenticated OTP flow when an OAuth token exists.
 */
export const getSocketURL = async (): Promise<string> => {
    try {
        const authInfo = OAuthTokenExchangeService.getAuthInfo();
        if (!authInfo || !authInfo.access_token) {
            return getDefaultServerURL();
        }

        return await DerivWSAccountsService.getAuthenticatedWebSocketURL(authInfo.access_token);
    } catch (error) {
        console.error('[DerivWS] Error in getSocketURL:', error);
        return getDefaultServerURL();
    }
};

export const getDebugServiceWorker = () => {
    const debug_service_worker_flag = window.localStorage.getItem('debug_service_worker');
    if (debug_service_worker_flag) return !!parseInt(debug_service_worker_flag);
    return false;
};

const generateCSRFToken = (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const base64 = btoa(String.fromCharCode(...array));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const generateCodeVerifier = (): string => {
    const array = new Uint8Array(64);
    crypto.getRandomValues(array);
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    return Array.from(array, byte => charset[byte % charset.length]).join('');
};

const generateCodeChallenge = async (verifier: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const base64 = btoa(String.fromCharCode(...hashArray));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const storeCodeVerifier = (verifier: string): void => {
    sessionStorage.setItem('oauth_code_verifier', verifier);
    sessionStorage.setItem('oauth_code_verifier_timestamp', Date.now().toString());
};

export const getCodeVerifier = (): string | null => {
    const verifier = sessionStorage.getItem('oauth_code_verifier');
    const timestamp = sessionStorage.getItem('oauth_code_verifier_timestamp');

    if (!verifier || !timestamp) return null;

    const verifierAge = Date.now() - parseInt(timestamp, 10);
    if (verifierAge > 600000) {
        clearCodeVerifier();
        return null;
    }

    return verifier;
};

export const clearCodeVerifier = (): void => {
    sessionStorage.removeItem('oauth_code_verifier');
    sessionStorage.removeItem('oauth_code_verifier_timestamp');
};

const storeCSRFToken = (token: string): void => {
    sessionStorage.setItem('oauth_csrf_token', token);
    sessionStorage.setItem('oauth_csrf_token_timestamp', Date.now().toString());
};

export const validateCSRFToken = (token: string): boolean => {
    const storedToken = sessionStorage.getItem('oauth_csrf_token');
    const timestamp = sessionStorage.getItem('oauth_csrf_token_timestamp');

    if (!storedToken || !timestamp || storedToken !== token) return false;

    const tokenAge = Date.now() - parseInt(timestamp, 10);
    if (tokenAge > 600000) {
        clearCSRFToken();
        return false;
    }

    return true;
};

export const clearCSRFToken = (): void => {
    sessionStorage.removeItem('oauth_csrf_token');
    sessionStorage.removeItem('oauth_csrf_token_timestamp');
};

/**
 * Build a Deriv OAuth2 Authorization Code + PKCE URL for the current domain.
 * Every domain must have its own explicit host/client_id/redirect_uri entry.
 */
export const generateOAuthURL = async (prompt?: string) => {
    try {
        const site = requireCurrentSiteConfig();
        const authBase = brandConfig.platform.auth2_url[site.environment];
        if (!authBase) throw new Error(`No Deriv OAuth base URL for ${site.environment}`);

        const csrfToken = generateCSRFToken();
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = await generateCodeChallenge(codeVerifier);

        storeCSRFToken(csrfToken);
        storeCodeVerifier(codeVerifier);
        sessionStorage.setItem('oauth_site_id', site.id);
        sessionStorage.setItem('oauth_redirect_uri', site.redirect_uri);

        const oauthUrl = new URL('auth', authBase);
        oauthUrl.searchParams.set('response_type', 'code');
        oauthUrl.searchParams.set('client_id', site.client_id);
        oauthUrl.searchParams.set('redirect_uri', site.redirect_uri);
        oauthUrl.searchParams.set('scope', site.scopes.join(' '));
        oauthUrl.searchParams.set('state', csrfToken);
        oauthUrl.searchParams.set('code_challenge', codeChallenge);
        oauthUrl.searchParams.set('code_challenge_method', 'S256');

        if (prompt) oauthUrl.searchParams.set('prompt', prompt);
        if (site.legacy_app_id) oauthUrl.searchParams.set('app_id', site.legacy_app_id);

        return oauthUrl.toString();
    } catch (error) {
        console.error('Error generating OAuth URL:', error);
        return '';
    }
};
