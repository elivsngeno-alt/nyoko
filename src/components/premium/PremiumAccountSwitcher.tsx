import { useEffect, useMemo, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import { DerivWSAccountsService, type DerivAccount } from '@/services/derivws-accounts.service';
import { OAuthTokenExchangeService } from '@/services/oauth-token-exchange.service';

const money = (value: string | number, currency = 'USD') => {
    const amount = Number(value);
    return `${Number.isFinite(amount) ? amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} ${currency}`;
};

const currencyFlags: Record<string, string> = {
    AED: '🇦🇪',
    AUD: '🇦🇺',
    BRL: '🇧🇷',
    CAD: '🇨🇦',
    CHF: '🇨🇭',
    EUR: '🇪🇺',
    GBP: '🇬🇧',
    IDR: '🇮🇩',
    KES: '🇰🇪',
    MXN: '🇲🇽',
    NGN: '🇳🇬',
    NZD: '🇳🇿',
    SGD: '🇸🇬',
    USD: '🇺🇸',
    ZAR: '🇿🇦',
};

const DerivDemoIcon = () => (
    <svg className='prodb-api-account-icon__demo-svg' viewBox='0 0 28 28' aria-hidden='true'>
        <circle cx='14' cy='14' r='14' fill='#4BA9AA' />
        <path d='M11.1 7.4h3.5c4.05 0 6.4 2.53 6.4 6.6s-2.35 6.6-6.4 6.6h-3.5v-2.35h3.28c2.55 0 4.06-1.58 4.06-4.25s-1.51-4.25-4.06-4.25H11.1V7.4Z' fill='#fff' />
        <path d='M6.7 9.55h6.15M6.7 14h6.15M6.7 18.45h6.15' stroke='#fff' strokeWidth='2' strokeLinecap='round' />
    </svg>
);

const CurrencyFlag = ({ currency = 'USD' }: { currency?: string }) => {
    const code = currency.toUpperCase();
    const flag = currencyFlags[code];
    return (
        <span className='prodb-api-account-icon__currency' aria-hidden='true'>
            {flag || code.slice(0, 1)}
        </span>
    );
};

const AccountIcon = ({ account }: { account?: DerivAccount }) => (
    <span className={`prodb-api-account-icon ${account?.account_type === 'demo' ? 'is-demo' : 'is-real'}`} aria-hidden='true'>
        {account?.account_type === 'demo' ? <DerivDemoIcon /> : <CurrencyFlag currency={account?.currency} />}
    </span>
);

const PremiumAccountSwitcher = observer(() => {
    const { activeLoginid, accountList } = useApiBase();
    const { client } = useStore() ?? {};
    const rootRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [accounts, setAccounts] = useState<DerivAccount[]>(() => DerivWSAccountsService.getStoredAccounts() || []);
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');

    const activeId = activeLoginid || client?.loginid || localStorage.getItem('active_loginid') || '';
    const active = useMemo(() => accounts.find(account => account.account_id === activeId) || accounts[0], [accounts, activeId]);
    const activeAccounts = useMemo(
        () => accounts.filter(account => !account.status || account.status === 'active'),
        [accounts]
    );
    const choices = useMemo(() => {
        const activeReal = active?.account_type === 'real' ? active : undefined;
        const activeDemo = active?.account_type === 'demo' ? active : undefined;
        const real = activeReal || activeAccounts.find(account => account.account_type === 'real');
        const demo = activeDemo || activeAccounts.find(account => account.account_type === 'demo');
        return [real, demo].filter((account): account is DerivAccount => Boolean(account));
    }, [active, activeAccounts]);

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
        DerivWSAccountsService.refreshAccounts(token)
            .then(setAccounts)
            .catch(err => setError(err instanceof Error ? err.message : String(err)));
    }, [open, accountList?.length]);

    const activeBalance = client?.balance ?? active?.balance ?? 0;
    const activeCurrency = client?.currency || active?.currency || 'USD';

    const selectAccount = async (account: DerivAccount) => {
        if (account.account_id === activeId || busy) {
            setOpen(false);
            return;
        }
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

    const balanceFor = (account: DerivAccount) => account.account_id === activeId ? activeBalance : account.balance;

    return (
        <div className='prodb-api-account' ref={rootRef}>
            <button
                type='button'
                className='prodb-api-account__trigger'
                onClick={() => setOpen(value => !value)}
                aria-expanded={open}
                aria-haspopup='listbox'
            >
                <AccountIcon account={active} />
                <span className='prodb-api-account__current'>
                    <small>{active?.account_type === 'demo' ? 'Demo' : 'Real'}</small>
                    <strong>{money(activeBalance, activeCurrency)}</strong>
                </span>
                <span className={`prodb-api-account__chevron ${open ? 'is-open' : ''}`}>⌄</span>
            </button>

            {open && (
                <div className='prodb-api-account__menu' role='listbox' aria-label='Choose Deriv account'>
                    {choices.length === 0 && <div className='prodb-api-account__empty'>No Deriv Options account available.</div>}
                    {choices.map(account => {
                        const selected = account.account_id === activeId;
                        return (
                            <button
                                type='button'
                                role='option'
                                aria-selected={selected}
                                key={account.account_id}
                                className={`prodb-api-account__choice ${selected ? 'is-active' : ''}`}
                                disabled={Boolean(busy)}
                                onClick={() => selectAccount(account)}
                            >
                                <AccountIcon account={account} />
                                <span className='prodb-api-account__choice-copy'>
                                    <strong>{account.account_type === 'demo' ? 'Demo' : 'Real'}</strong>
                                    <small>{account.account_id}</small>
                                </span>
                                <b>{money(balanceFor(account), account.currency || 'USD')}</b>
                                {selected && <span className='prodb-api-account__selected-mark'>✓</span>}
                            </button>
                        );
                    })}
                    {error && <div className='prodb-api-account__error'>{error}</div>}
                </div>
            )}
        </div>
    );
});

export default PremiumAccountSwitcher;
