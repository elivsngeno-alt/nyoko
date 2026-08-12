import { clearCodeVerifier, getCodeVerifier } from '@/components/shared';
import { getSiteConfigById, requireCurrentSiteConfig } from '@/config/site-registry';
import { ErrorLogger } from '@/utils/error-logger';

interface TokenExchangeResponse {
    access_token?: string;
    token_type?: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
    error?: string;
    error_description?: string;
}

interface AuthInfo {
    access_token: string;
    token_type: string;
    expires_in: number;
    expires_at: number;
    scope?: string;
    refresh_token?: string;
    site_id?: string;
}

export class OAuthTokenExchangeService {
    static getAuthInfo(): AuthInfo | null {
        try {
            const authInfoStr = sessionStorage.getItem('auth_info');
            if (!authInfoStr) return null;

            const authInfo: AuthInfo = JSON.parse(authInfoStr);
            if (authInfo.expires_at && Date.now() >= authInfo.expires_at) {
                this.clearAuthInfo();
                return null;
            }

            return authInfo;
        } catch (error) {
            ErrorLogger.error('OAuth', 'Error parsing auth_info', error);
            return null;
        }
    }

    static clearAuthInfo(): void {
        sessionStorage.removeItem('auth_info');
        sessionStorage.removeItem('oauth_site_id');
        sessionStorage.removeItem('oauth_redirect_uri');
    }

    static isAuthenticated(): boolean {
        return !!this.getAuthInfo()?.access_token;
    }

    static getAccessToken(): string | null {
        return this.getAuthInfo()?.access_token || null;
    }

    private static getSiteId(): string {
        const storedSiteId = sessionStorage.getItem('oauth_site_id') || this.getAuthInfo()?.site_id;
        if (storedSiteId && getSiteConfigById(storedSiteId)) return storedSiteId;
        return requireCurrentSiteConfig().id;
    }

    private static async postTokenRequest(payload: Record<string, string>): Promise<TokenExchangeResponse> {
        try {
            const response = await fetch('/api/oauth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const raw = await response.text();
            let data: TokenExchangeResponse;

            try {
                data = raw ? JSON.parse(raw) : {};
            } catch {
                return {
                    error: 'invalid_token_response',
                    error_description: `OAuth token endpoint returned a non-JSON response (${response.status}).`,
                };
            }

            if (!response.ok && !data.error) {
                return {
                    error: `http_${response.status}`,
                    error_description: data.error_description || `OAuth token exchange failed with HTTP ${response.status}.`,
                };
            }

            return data;
        } catch (error) {
            return {
                error: 'network_error',
                error_description: error instanceof Error ? error.message : 'Unable to reach the OAuth token proxy.',
            };
        }
    }

    static async exchangeCodeForToken(code: string): Promise<TokenExchangeResponse> {
        const codeVerifier = getCodeVerifier();
        if (!codeVerifier) {
            return {
                error: 'invalid_request',
                error_description: 'PKCE code verifier is missing or expired. Start login again.',
            };
        }

        let siteId: string;
        try {
            siteId = this.getSiteId();
        } catch (error) {
            return {
                error: 'site_not_configured',
                error_description: error instanceof Error ? error.message : 'This domain is not configured for OAuth.',
            };
        }

        const data = await this.postTokenRequest({
            grant_type: 'authorization_code',
            code,
            code_verifier: codeVerifier,
            site_id: siteId,
        });

        if (data.error || !data.access_token) {
            ErrorLogger.error('OAuth', `Token exchange failed: ${data.error || 'missing_access_token'}`, data);
            return data.error
                ? data
                : { error: 'missing_access_token', error_description: 'Deriv did not return an access token.' };
        }

        clearCodeVerifier();
        sessionStorage.removeItem('oauth_redirect_uri');
        sessionStorage.removeItem('oauth_site_id');

        const authInfo: AuthInfo = {
            access_token: data.access_token,
            token_type: data.token_type || 'Bearer',
            expires_in: data.expires_in || 3600,
            expires_at: Date.now() + (data.expires_in || 3600) * 1000,
            scope: data.scope,
            site_id: siteId,
        };

        if (data.refresh_token) authInfo.refresh_token = data.refresh_token;
        sessionStorage.setItem('auth_info', JSON.stringify(authInfo));

        try {
            const { DerivWSAccountsService } = await import('./derivws-accounts.service');
            const accounts = await DerivWSAccountsService.fetchAccountsList(data.access_token);

            if (!accounts?.length) {
                this.clearAuthInfo();
                return {
                    error: 'no_accounts',
                    error_description: 'Authentication succeeded, but no Options accounts were returned.',
                };
            }

            DerivWSAccountsService.storeAccounts(accounts);
            const firstAccount = accounts[0];
            localStorage.setItem('active_loginid', firstAccount.account_id);
            localStorage.setItem('account_type', firstAccount.account_type === 'demo' ? 'demo' : 'real');

            const { api_base } = await import('@/external/bot-skeleton');
            await api_base.init(true);
        } catch (error) {
            ErrorLogger.error('OAuth', 'Failed to initialize authenticated account/WebSocket session', error);
            this.clearAuthInfo();
            return {
                error: 'account_fetch_failed',
                error_description: error instanceof Error ? error.message : 'Failed to initialize the authenticated account.',
            };
        }

        return data;
    }

    static async refreshAccessToken(refreshToken: string): Promise<TokenExchangeResponse> {
        let siteId: string;
        try {
            siteId = this.getSiteId();
        } catch (error) {
            return {
                error: 'site_not_configured',
                error_description: error instanceof Error ? error.message : 'This domain is not configured for OAuth.',
            };
        }

        const data = await this.postTokenRequest({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            site_id: siteId,
        });

        if (data.error || !data.access_token) return data;

        const existingAuth = this.getAuthInfo();
        const authInfo: AuthInfo = {
            access_token: data.access_token,
            token_type: data.token_type || 'Bearer',
            expires_in: data.expires_in || 3600,
            expires_at: Date.now() + (data.expires_in || 3600) * 1000,
            scope: data.scope,
            refresh_token: data.refresh_token || existingAuth?.refresh_token,
            site_id: siteId,
        };

        sessionStorage.setItem('auth_info', JSON.stringify(authInfo));
        return data;
    }
}
