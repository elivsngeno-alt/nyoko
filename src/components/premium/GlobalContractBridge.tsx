import { useEffect } from 'react';
import { api_base } from '@/external/bot-skeleton/services/api/api-base';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import { PremiumDerivApiService } from '@/services/premium-deriv-api.service';

const unwrapMessage = (event: any) => event?.data && typeof event.data === 'object' ? event.data : event || {};

/**
 * Keeps the native DBot transaction store in sync with the authenticated
 * Deriv account, regardless of which PROD B TRADER tool placed the trade.
 */
const GlobalContractBridge = () => {
    const { activeLoginid, connectionStatus } = useApiBase();
    const store = useStore();
    const client = store?.client;
    const transactions = store?.transactions;
    const loginid = client?.loginid || activeLoginid || '';

    useEffect(() => {
        if (!transactions || !loginid || !api_base.api) return;

        let cancelled = false;
        const api = api_base.api;

        const pushContract = (contract: any) => {
            if (cancelled || !contract?.contract_id) return;
            try {
                transactions.onBotContractEvent(contract);
            } catch (error) {
                console.error('[ContractBridge] Failed to update Run Panel contract:', error);
            }
        };

        const observer = api.onMessage()?.subscribe((event: any) => {
            const message = unwrapMessage(event);
            if (message?.error) {
                if (message.msg_type === 'proposal_open_contract') {
                    console.warn('[ContractBridge] proposal_open_contract stream error:', message.error?.message || message.error?.code || message.error);
                }
                return;
            }
            if (message?.msg_type === 'proposal_open_contract') pushContract(message.proposal_open_contract);
        });

        // Recover any contracts that were already open before this listener mounted.
        // Portfolio intentionally returns open positions only; POC then supplies the
        // detailed contract shape expected by the native Run Panel transaction cards.
        void PremiumDerivApiService.portfolio()
            .then(async portfolio => {
                const contracts = Array.isArray(portfolio?.contracts) ? portfolio.contracts : [];
                await Promise.allSettled(contracts.map(async (position: any) => {
                    const contractId = Number(position?.contract_id);
                    if (!Number.isFinite(contractId) || !contractId) return;
                    const response = await PremiumDerivApiService.request({ proposal_open_contract: 1, contract_id: contractId });
                    pushContract(response?.proposal_open_contract);
                }));
            })
            .catch(error => {
                if (!cancelled) console.warn('[ContractBridge] Could not recover open contracts:', error instanceof Error ? error.message : error);
            });

        return () => {
            cancelled = true;
            observer?.unsubscribe?.();
        };
    }, [connectionStatus, loginid, transactions]);

    return null;
};

export default GlobalContractBridge;
