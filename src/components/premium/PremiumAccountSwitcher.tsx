import { useEffect, useMemo, useRef, useState } from 'react';
import {
    CurrencyAudIcon,
    CurrencyBtcIcon,
    CurrencyDemoIcon,
    CurrencyEthIcon,
    CurrencyEurIcon,
    CurrencyGbpIcon,
    CurrencyLtcIcon,
    CurrencyNoneIcon,
    CurrencyUsdIcon,
    CurrencyUsdtIcon,
} from '@deriv/quill-icons';
import { observer } from 'mobx-react-lite';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import { DerivWSAccountsService, type DerivAccount } from '@/services/derivws-accounts.service';
import { OAuthTokenExchangeService } from '@/services/oauth-token-exchange.service';

const money = (value: string | number, currency = 'USD') => {
    const amount = Number(value);
    return `${Number.isFinite(amount) ? amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} ${currency}`;
};

const currencyIconMap = {
    usd: CurrencyUsdIcon,
    eur: CurrencyEurIcon,
    gbp: CurrencyGbpIcon,
    aud: CurrencyAudIcon,
    btc: CurrencyBtcIcon,
    eth: CurrencyEthIcon,
    ltc: CurrencyLtcIcon,
    ust: CurrencyUsdtIcon,
    usdt: CurrencyUsdtIcon,
    demo: CurrencyDemoIcon,
};

const AccountIcon = ({ account }: { account?: DerivAccount }) => {
    const currencyKey = account?.account_type === 'demo' ? 'demo' : (account?.currency || '').toLowerCase();
    const IconComponent = currencyIconMap[currencyKey as keyof typeof currencyIconMap] || CurrencyNoneIcon;

    return (
        <span className={`prodb-api-account-icon ${account?.account_type === 'demo' ? 'is-demo' : 'is-real'}`} aria-hidden='true'>
            <IconComponent iconSize='sm' />
        </span>
    );
};

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
