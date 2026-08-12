import { useEffect, useMemo, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useApiBase } from '@/hooks/useApiBase';
import { useLogout } from '@/hooks/useLogout';
import { useStore } from '@/hooks/useStore';
import { DerivWSAccountsService, type DerivAccount } from '@/services/derivws-accounts.service';
import { OAuthTokenExchangeService } from '@/services/oauth-token-exchange.service';

type AccountTab = 'real' | 'demo';

const money = (value: string | number, currency = 'USD') => {
    const amount = Number(value);
    return `${Number.isFinite(amount) ? amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} ${currency}`;
};

const AccountIcon = ({ account, compact = false }: { account?: DerivAccount; compact?: boolean }) => (
    <span className={`prodb-api-account-icon ${account?.account_type === 'demo' ? 'is-demo' : 'is-real'} ${compact ? 'is-compact' : ''}`} aria-hidden='true'>
        {account?.account_type === 'demo' ? 'D' : account?.currency?.slice(0, 1) || '$'}
    </span>
);

const PremiumAccountSwitcher = observer(() => {
    const { activeLoginid, accountList } = useApiBase();
    const { client } = useStore() ?? {};
    const logout = useLogout();
    const rootRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<AccountTab>('real');
    const [accounts, setAccounts] = useState<DerivAccount[]>(() => DerivWSAccountsService.getStoredAccounts() || []);
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');

    const activeId = activeLoginid || client?.loginid || localStorage.getItem('active_loginid') || '';
    const active = useMemo(() => accounts.find(account => account.account_id === activeId) || accounts[0], [accounts, activeId]);
    const shown = accounts.filter(account => account.account_type === tab && (!account.status || account.status === 'active'));

    useEffect(() => {
        if (active?.account_type) setTab(active.account_type);
    }, [active?.account_type]);

    useEffect(() => {
        const handler = (event: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (!open) return;
        const token = OAuthTokenExchangeService.getAccessToken();
        if (!token) return;
        DerivWSAccountsService.refreshAccounts(token).then(setAccounts).catch(err => setError(err instanceof Error ? err.message : String(err)));
    }, [open, accountList?.length]);

    const activeBalance = client?.balance ?? active?.balance ?? 0;
    const activeCurrency = client?.currency || active?.currency || 'USD';

    const selectAccount = async (account: DerivAccount) => {
        if (account.account_id === activeId || busy) return;
        setBusy(account.account_id);
        setError('');
        try {
            localStorage.setItem('active_loginid', account.account_id);
            localStorage.setItem('account_type', account.account_type);
            await client?.regenerateWebSocket?.();
            setAccounts(current => current.map(item => item.account_id === account.account_id ? { ...item, balance: account.balance } : item));
            setOpen(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setBusy('');
        }
    };

    const resetDemo = async (account: DerivAccount) => {
        if (account.account_type !== 'demo' || busy) return;
        const token = OAuthTokenExchangeService.getAccessToken();
        if (!token) return setError('Your OAuth session has expired. Please log in again.');
        setBusy(`reset:${account.account_id}`);
        setError('');
        try {
            const fresh = await DerivWSAccountsService.resetDemoBalance(token, account.account_id);
            setAccounts(fresh);
            if (account.account_id === activeId) await client?.regenerateWebSocket?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setBusy('');
        }
    };

    return (
        <div className='prodb-api-account' ref={rootRef}>
            <button className='prodb-api-account__trigger' onClick={() => setOpen(value => !value)} aria-expanded={open}>
                <AccountIcon account={active} compact />
                <strong>{money(activeBalance, activeCurrency)}</strong>
                <span className={`prodb-api-account__chevron ${open ? 'is-open' : ''}`}>⌄</span>
                <span className='prodb-api-account__user'>◯</span>
            </button>

            {open && (
                <div className='prodb-api-account__menu'>
                    <div className='prodb-api-account__tabs'>
                        <button className={tab === 'real' ? 'is-active' : ''} onClick={() => setTab('real')}>Real</button>
                        <button className={tab === 'demo' ? 'is-active' : ''} onClick={() => setTab('demo')}>Demo</button>
                    </div>
                    <div className='prodb-api-account__section-title'>
                        <strong>Deriv accounts</strong><span>⌃</span>
                    </div>
                    <div className='prodb-api-account__list'>
                        {shown.length === 0 && <div className='prodb-api-account__empty'>No {tab} Options account returned by Deriv.</div>}
                        {shown.map(account => (
                            <div key={account.account_id} className={`prodb-api-account__row ${account.account_id === activeId ? 'is-active' : ''}`}>
                                <button className='prodb-api-account__select' disabled={Boolean(busy)} onClick={() => selectAccount(account)}>
                                    <AccountIcon account={account} />
                                    <span><strong>{account.currency || 'USD'}</strong><small>{account.account_id}</small></span>
                                    <b>{money(account.account_id === activeId ? activeBalance : account.balance, account.currency)}</b>
                                </button>
                                {account.account_type === 'demo' && (
                                    <button className='prodb-api-account__reset' disabled={Boolean(busy)} onClick={() => resetDemo(account)}>
                                        {busy === `reset:${account.account_id}` ? 'Resetting…' : 'Reset Balance'}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    {error && <div className='prodb-api-account__error'>{error}</div>}
                    <div className='prodb-api-account__hub'>Looking for CFD accounts? <a href='https://app.deriv.com' target='_blank' rel='noreferrer'>Go to Trader&apos;s Hub</a></div>
                    <button className='prodb-api-account__logout' onClick={logout}>Logout <span>⇥</span></button>
                </div>
            )}
        </div>
    );
});

export default PremiumAccountSwitcher;
