import { api_base } from '@/external/bot-skeleton/services/api/api-base';
import { DerivWSAccountsService } from '@/services/derivws-accounts.service';
import { OAuthTokenExchangeService } from '@/services/oauth-token-exchange.service';

type ApiPayload = Record<string, unknown>;
type ApiResponse = Record<string, any>;

const sleep = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms));
const unwrap = (value: any): ApiResponse => (value?.data && typeof value.data === 'object' ? value.data : value || {});

export class PremiumDerivApiService {
    private static requestId = 1000;

    private static async getApi(): Promise<any> {
        if (!api_base.api) await api_base.init(true);

        for (let attempt = 0; attempt < 80; attempt += 1) {
            const api: any = api_base.api;
            if (api?.connection?.readyState === WebSocket.OPEN) return api;
            await sleep(125);
        }
        throw new Error('Deriv WebSocket is not ready. Please reconnect and try again.');
    }

    static async request(payload: ApiPayload): Promise<ApiResponse> {
        const api = await this.getApi();
        const result = unwrap(await api.send({ ...payload, req_id: ++this.requestId }));
        if (result?.error) throw new Error(result.error.message || result.error.code || 'Deriv API request failed.');
        return result;
    }

    static async activeSymbols() {
        const result = await this.request({ active_symbols: 'brief' });
        return Array.isArray(result.active_symbols) ? result.active_symbols : [];
    }

    static async contractsFor(underlyingSymbol: string) {
        const result = await this.request({ contracts_for: underlyingSymbol });
        return result.contracts_for || { available: [] };
    }

    static async ticksHistory(underlyingSymbol: string, count = 1000, style: 'ticks' | 'candles' = 'ticks', granularity?: number) {
        const request: ApiPayload = {
            ticks_history: underlyingSymbol,
            end: 'latest',
            count: Math.min(Math.max(Math.trunc(count), 1), 5000),
            style,
        };
        if (style === 'candles' && granularity) request.granularity = granularity;
        const result = await this.request(request);
        if (style === 'candles') return Array.isArray(result.candles) ? result.candles : [];
        return Array.isArray(result.history?.prices) ? result.history.prices.map(Number).filter(Number.isFinite) : [];
    }

    static async subscribeTicks(underlyingSymbol: string, callback: (tick: any) => void): Promise<() => void> {
        const api = await this.getApi();
        let subscriptionId = '';
        const observer = api.onMessage().subscribe((event: any) => {
            const message = unwrap(event);
            if (message.msg_type === 'tick' && message.tick?.symbol === underlyingSymbol) {
                subscriptionId = message.subscription?.id || message.tick?.id || subscriptionId;
                callback(message.tick);
            }
        });

        try {
            const response = unwrap(await api.send({ ticks: underlyingSymbol, subscribe: 1, req_id: ++this.requestId }));
            if (response?.error) throw new Error(response.error.message || 'Unable to subscribe to ticks.');
            subscriptionId = response.subscription?.id || response.tick?.id || subscriptionId;
            if (response.tick) callback(response.tick);
        } catch (error) {
            observer.unsubscribe();
            throw error;
        }

        return () => {
            observer.unsubscribe();
            if (subscriptionId) void api.send({ forget: subscriptionId }).catch?.(() => undefined);
        };
    }

    static async proposal(parameters: {
        amount: number;
        basis?: 'stake' | 'payout';
        contract_type: string;
        currency: string;
        underlying_symbol: string;
        duration?: number;
        duration_unit?: 'd' | 'm' | 's' | 'h' | 't';
        barrier?: string;
        barrier2?: string;
        multiplier?: number;
        growth_rate?: number;
    }) {
        const clean = Object.fromEntries(Object.entries(parameters).filter(([, value]) => value !== '' && value !== undefined && value !== null));
        const result = await this.request({ proposal: 1, ...clean });
        if (!result.proposal?.id) throw new Error('Deriv did not return a proposal ID.');
        return result.proposal;
    }

    static async buy(proposalId: string, maximumPrice: number) {
        const result = await this.request({ buy: proposalId, price: maximumPrice });
        if (!result.buy) throw new Error('Deriv did not return a purchased contract.');
        return result.buy;
    }

    static async sell(contractId: number, price = 0) {
        const result = await this.request({ sell: contractId, price });
        return result.sell;
    }

    static async portfolio() {
        const result = await this.request({ portfolio: 1 });
        return result.portfolio || { contracts: [] };
    }

    static async profitTable(limit = 25) {
        const result = await this.request({ profit_table: 1, limit, sort: 'DESC' });
        return result.profit_table || { count: 0, transactions: [] };
    }

    static async statement(limit = 25) {
        const result = await this.request({ statement: 1, limit });
        return result.statement || { count: 0, transactions: [] };
    }

    static async autoList() {
        const result = await this.request({ auto_list: 1 });
        return result.auto_list || result;
    }

    static async autoListStrategies() {
        const result = await this.request({ auto_list_strategies: 1 });
        return result.auto_list_strategies || result;
    }

    static async refreshAccounts() {
        const token = OAuthTokenExchangeService.getAccessToken();
        if (!token) throw new Error('OAuth access token is unavailable. Please sign in again.');
        DerivWSAccountsService.clearCache();
        return DerivWSAccountsService.fetchAccountsList(token);
    }

    private static async withAccountSocket<T>(accountId: string, action: (request: (payload: ApiPayload) => Promise<ApiResponse>) => Promise<T>): Promise<T> {
        const token = OAuthTokenExchangeService.getAccessToken();
        if (!token) throw new Error('OAuth access token is unavailable.');
        const url = await DerivWSAccountsService.fetchOTPWebSocketURL(token, accountId);
        const socket = new WebSocket(url);

        await new Promise<void>((resolve, reject) => {
            const timer = window.setTimeout(() => reject(new Error(`Timed out connecting ${accountId}.`)), 10000);
            socket.addEventListener('open', () => { window.clearTimeout(timer); resolve(); }, { once: true });
            socket.addEventListener('error', () => { window.clearTimeout(timer); reject(new Error(`Could not connect ${accountId}.`)); }, { once: true });
        });

        let reqId = 50000;
        const request = (payload: ApiPayload) => new Promise<ApiResponse>((resolve, reject) => {
            const currentId = ++reqId;
            const timer = window.setTimeout(() => {
                socket.removeEventListener('message', onMessage);
                reject(new Error(`Deriv request timed out for ${accountId}.`));
            }, 12000);
            const onMessage = (event: MessageEvent) => {
                let data: any;
                try { data = JSON.parse(String(event.data)); } catch { return; }
                if (data.req_id !== currentId) return;
                window.clearTimeout(timer);
                socket.removeEventListener('message', onMessage);
                if (data.error) reject(new Error(data.error.message || data.error.code || 'Deriv API request failed.'));
                else resolve(data);
            };
            socket.addEventListener('message', onMessage);
            socket.send(JSON.stringify({ ...payload, req_id: currentId }));
        });

        try {
            return await action(request);
        } finally {
            socket.close();
        }
    }

    static async copyTradeAcrossOwnAccounts(accountIds: string[], proposalParameters: Parameters<typeof PremiumDerivApiService.proposal>[0]) {
        return Promise.all(accountIds.map(async accountId => {
            try {
                const result = await this.withAccountSocket(accountId, async request => {
                    const proposalResponse = await request({ proposal: 1, ...proposalParameters });
                    const proposal = proposalResponse.proposal;
                    if (!proposal?.id) throw new Error('No proposal returned.');
                    const maxPrice = Number(proposal.ask_price ?? proposalParameters.amount);
                    const buyResponse = await request({ buy: proposal.id, price: Number.isFinite(maxPrice) ? maxPrice : proposalParameters.amount });
                    return buyResponse.buy;
                });
                return { account_id: accountId, ok: true, result };
            } catch (error) {
                return { account_id: accountId, ok: false, error: error instanceof Error ? error.message : String(error) };
            }
        }));
    }
}
