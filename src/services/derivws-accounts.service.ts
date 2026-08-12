import { getCurrentSiteConfig } from '@/config/site-registry';
import brandConfig from '../../brand.config.json';

export interface DerivAccount {
    account_id: string;
    balance: string | number;
    currency: string;
    group: string;
    status: string;
    account_type: 'demo' | 'real';
}

interface AccountsResponse {
    data: DerivAccount[];
}

interface OTPResponse {
    data: {
        url: string;
        otp?: string;
    };
}

/**
 * Handles the current Deriv Options REST -> OTP -> authenticated WebSocket flow.
 * Every authenticated REST request includes both the OAuth Bearer token and
 * the Deriv-App-ID belonging to the current host's site configuration.
 */
export class DerivWSAccountsService {
    private static accountsFetchPromise: Promise<DerivAccount[]> | null = null;
    private static otpFetchPromises = new Map<string, Promise<string>>();

    private static getSite() {
        return getCurrentSiteConfig();
    }

    private static getDerivWSBaseURL(): string {
        const site = this.getSite();
        return brandConfig.platform.derivws.url[site.environment];
    }

    private static getHeaders(accessToken: string): HeadersInit {
        return {
            Authorization: `Bearer ${accessToken}`,
            'Deriv-App-ID': this.getSite().client_id,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        };
    }

    private static async readError(response: Response): Promise<string> {
        const raw = await response.text().catch(() => '');
        if (!raw) return response.statusText;
        try {
            const parsed = JSON.parse(raw);
            return parsed?.errors?.[0]?.message || parsed?.error_description || parsed?.message || raw;
        } catch {
            return raw;
        }
    }

    static clearCache(): void {
        this.accountsFetchPromise = null;
        this.otpFetchPromises.clear();
    }

    static storeAccounts(accounts: DerivAccount[]): void {
        sessionStorage.setItem('deriv_accounts', JSON.stringify(accounts));
    }

    static getStoredAccounts(): DerivAccount[] | null {
        try {
            const accountsStr = sessionStorage.getItem('deriv_accounts');
            return accountsStr ? (JSON.parse(accountsStr) as DerivAccount[]) : null;
        } catch (error) {
            console.error('[DerivWS] Error parsing stored accounts:', error);
            return null;
        }
    }

    static getDefaultAccount(): DerivAccount | null {
        return this.getStoredAccounts()?.[0] || null;
    }

    static clearStoredAccounts(): void {
        sessionStorage.removeItem('deriv_accounts');
    }

    static async fetchAccountsList(accessToken: string): Promise<DerivAccount[]> {
        if (this.accountsFetchPromise) return this.accountsFetchPromise;

        this.accountsFetchPromise = (async () => {
            try {
                const baseURL = this.getDerivWSBaseURL();
                const optionsDir = brandConfig.platform.derivws.directories.options;
                const endpoint = `${baseURL}${optionsDir}accounts`;

                const response = await fetch(endpoint, {
                    method: 'GET',
                    headers: this.getHeaders(accessToken),
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch Deriv accounts (${response.status}): ${await this.readError(response)}`);
                }

                const data: AccountsResponse = await response.json();
                const accounts = Array.isArray(data?.data) ? data.data : [];
                this.storeAccounts(accounts);
                return accounts;
            } catch (error) {
                this.accountsFetchPromise = null;
                console.error('[DerivWS] Error fetching accounts:', error);
                throw error;
            } finally {
                window.setTimeout(() => {
                    this.accountsFetchPromise = null;
                }, 100);
            }
        })();

        return this.accountsFetchPromise;
    }

    static async refreshAccounts(accessToken: string): Promise<DerivAccount[]> {
        this.clearCache();
        return this.fetchAccountsList(accessToken);
    }

    static async resetDemoBalance(accessToken: string, accountId: string): Promise<DerivAccount[]> {
        const storedAccount = this.getStoredAccounts()?.find(account => account.account_id === accountId);
        if (storedAccount && storedAccount.account_type !== 'demo') {
            throw new Error('Only a Deriv demo Options account can be reset.');
        }

        const baseURL = this.getDerivWSBaseURL();
        const optionsDir = brandConfig.platform.derivws.directories.options;
        const endpoint = `${baseURL}${optionsDir}accounts/${encodeURIComponent(accountId)}/reset-demo-balance`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: this.getHeaders(accessToken),
        });

        if (!response.ok) {
            throw new Error(`Failed to reset demo balance (${response.status}): ${await this.readError(response)}`);
        }

        return this.refreshAccounts(accessToken);
    }

    static async fetchOTPWebSocketURL(accessToken: string, accountId: string): Promise<string> {
        const cacheKey = accountId;
        const cached = this.otpFetchPromises.get(cacheKey);
        if (cached) return cached;

        const otpPromise = (async () => {
            try {
                const baseURL = this.getDerivWSBaseURL();
                const optionsDir = brandConfig.platform.derivws.directories.options;
                const endpoint = `${baseURL}${optionsDir}accounts/${encodeURIComponent(accountId)}/otp`;

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: this.getHeaders(accessToken),
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch WebSocket OTP (${response.status}): ${await this.readError(response)}`);
                }

                const otpResponse: OTPResponse = await response.json();
                const websocketURL = otpResponse?.data?.url;
                if (!websocketURL) throw new Error('Deriv OTP response did not contain a WebSocket URL.');
                return websocketURL;
            } catch (error) {
                this.otpFetchPromises.delete(cacheKey);
                console.error('[DerivWS] Error fetching OTP:', error);
                throw error;
            } finally {
                window.setTimeout(() => this.otpFetchPromises.delete(cacheKey), 100);
            }
        })();

        this.otpFetchPromises.set(cacheKey, otpPromise);
        return otpPromise;
    }

    static async getAuthenticatedWebSocketURL(accessToken: string): Promise<string> {
        let accounts = this.getStoredAccounts();
        if (!accounts?.length) accounts = await this.fetchAccountsList(accessToken);
        if (!accounts?.length) throw new Error('No Deriv Options accounts are available for this user.');

        const activeLoginId = localStorage.getItem('active_loginid');
        const targetAccount =
            (activeLoginId && accounts.find(account => account.account_id === activeLoginId)) || accounts[0];

        return this.fetchOTPWebSocketURL(accessToken, targetAccount.account_id);
    }
}
