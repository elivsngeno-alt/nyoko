import { useEffect, useMemo, useState } from 'react';
import { useApiBase } from '@/hooks/useApiBase';
import { PremiumDerivApiService } from '@/services/premium-deriv-api.service';

type TradeMode = 'Even/Odd' | 'Over/Under' | 'Matches/Differs';

const symbolCode = (item: any) => item?.underlying_symbol || item?.symbol || '';
const symbolName = (item: any) => item?.underlying_symbol_name || item?.display_name || symbolCode(item);
const pipDecimals = (item: any) => {
    const pip = String(item?.pip_size ?? item?.pip ?? '0.01');
    return pip.includes('.') ? pip.split('.')[1].replace(/0+$/, '').length : 0;
};
const numeric = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

const BulkTraderPage = () => {
    const { authData } = useApiBase();
    const [symbols, setSymbols] = useState<any[]>([]);
    const [symbol, setSymbol] = useState('1HZ100V');
    const [mode, setMode] = useState<TradeMode>('Even/Odd');
    const [side, setSide] = useState('Even');
    const [barrier, setBarrier] = useState('5');
    const [windowSize, setWindowSize] = useState(1000);
    const [duration, setDuration] = useState(1);
    const [stake, setStake] = useState(0.5);
    const [runs, setRuns] = useState(1);
    const [prices, setPrices] = useState<number[]>([]);
    const [busy, setBusy] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [error, setError] = useState('');
    const currency = authData?.currency || 'USD';
    const selectedSymbol = symbols.find(item => symbolCode(item) === symbol);
    const decimals = pipDecimals(selectedSymbol);

    useEffect(() => {
        PremiumDerivApiService.activeSymbols().then(items => {
            const list = items.filter(item => symbolCode(item));
            setSymbols(list);
            if (!list.some(item => symbolCode(item) === symbol) && list[0]) setSymbol(symbolCode(list[0]));
        }).catch(err => setError(err instanceof Error ? err.message : String(err)));
    }, []);

    useEffect(() => {
        if (!symbol) return;
        let dispose: (() => void) | undefined;
        setError('');
        PremiumDerivApiService.ticksHistory(symbol, windowSize).then(setPrices).catch(err => setError(err instanceof Error ? err.message : String(err)));
        PremiumDerivApiService.subscribeTicks(symbol, tick => {
            const quote = numeric(tick?.quote, NaN);
            if (Number.isFinite(quote)) setPrices(current => [...current.slice(-(windowSize - 1)), quote]);
        }).then(fn => { dispose = fn; }).catch(err => setError(err instanceof Error ? err.message : String(err)));
        return () => dispose?.();
    }, [symbol, windowSize]);

    useEffect(() => {
        if (mode === 'Even/Odd') setSide('Even');
        if (mode === 'Over/Under') setSide('Over');
        if (mode === 'Matches/Differs') setSide('Matches');
    }, [mode]);

    const digits = useMemo(() => prices.map(price => Number(price.toFixed(decimals).slice(-1))), [prices, decimals]);
    const counts = useMemo(() => Array.from({ length: 10 }, (_, digit) => digits.filter(value => value === digit).length), [digits]);
    const total = digits.length || 1;
    const even = digits.filter(value => value % 2 === 0).length;
    const odd = digits.length - even;
    const max = Math.max(...counts), min = Math.min(...counts);
    const current = prices.at(-1);

    const contractType = useMemo(() => {
        if (mode === 'Even/Odd') return side === 'Even' ? 'DIGITEVEN' : 'DIGITODD';
        if (mode === 'Over/Under') return side === 'Over' ? 'DIGITOVER' : 'DIGITUNDER';
        return side === 'Matches' ? 'DIGITMATCH' : 'DIGITDIFF';
    }, [mode, side]);

    const execute = async () => {
        const count = Math.min(Math.max(Math.trunc(runs), 1), 100);
        const perTrade = Math.max(stake, 0.01);
        const estimate = count * perTrade;
        const accountType = localStorage.getItem('account_type') || 'account';
        if (!window.confirm(`Execute ${count} ${contractType} purchase(s) on the active ${accountType} account? Estimated stake: ${estimate.toFixed(2)} ${currency}. Each run receives a fresh Deriv proposal.`)) return;
        setBusy(true); setError(''); setResults([]);
        const completed: any[] = [];
        try {
            for (let index = 0; index < count; index += 1) {
                try {
                    const proposal = await PremiumDerivApiService.proposal({
                        amount: perTrade,
                        basis: 'stake',
                        contract_type: contractType,
                        currency,
                        underlying_symbol: symbol,
                        duration: Math.max(Math.trunc(duration), 1),
                        duration_unit: 't',
                        barrier: ['DIGITOVER', 'DIGITUNDER', 'DIGITMATCH', 'DIGITDIFF'].includes(contractType) ? barrier : undefined,
                    });
                    const maxPrice = numeric(proposal.ask_price, perTrade);
                    const buy = await PremiumDerivApiService.buy(proposal.id, maxPrice);
                    completed.push({ index: index + 1, ok: true, contract_id: buy.contract_id, price: buy.buy_price ?? maxPrice });
                } catch (err) {
                    completed.push({ index: index + 1, ok: false, error: err instanceof Error ? err.message : String(err) });
                }
                setResults([...completed]);
            }
        } finally {
            setBusy(false);
        }
    };

    const sideOptions = mode === 'Even/Odd' ? ['Even', 'Odd'] : mode === 'Over/Under' ? ['Over', 'Under'] : ['Matches', 'Differs'];

    return <div className='prodb-bulk-page'>
        <div className='prodb-form-row'>
            <label>MARKET<select value={symbol} onChange={e => setSymbol(e.target.value)}>{symbols.map(item => <option value={symbolCode(item)} key={symbolCode(item)}>{symbolName(item)}</option>)}</select></label>
            <label>TRADE TYPE<select value={mode} onChange={e => setMode(e.target.value as TradeMode)}><option>Even/Odd</option><option>Over/Under</option><option>Matches/Differs</option></select></label>
        </div>
        <div className='prodb-form-row prodb-bulk-side-row'>
            <label>DIRECTION<select value={side} onChange={e => setSide(e.target.value)}>{sideOptions.map(item => <option key={item}>{item}</option>)}</select></label>
            {mode !== 'Even/Odd' && <label>DIGIT BARRIER<input inputMode='numeric' value={barrier} onChange={e => setBarrier(e.target.value.replace(/\D/g, '').slice(0, 1))} /></label>}
        </div>
        <label className='prodb-full-input'>NUMBER OF ANALYSIS TICKS<input type='number' min='10' max='5000' value={windowSize} onChange={e => setWindowSize(Math.min(Math.max(numeric(e.target.value, 1000), 10), 5000))}/></label>
        <div className='prodb-bulk-stats'>
            <div className='prodb-current-tick'><small>CURRENT DERIV TICK</small><strong>{current === undefined ? '—' : current.toFixed(decimals)}</strong></div>
            <button className='prodb-ai-scanner' type='button'>DERIV LIVE</button>
            <div className='prodb-digit-row'>{counts.map((count, digit) => <div key={digit}><span className={count === max ? 'ring-teal' : count === min ? 'ring-red' : ''}>{digit}</span><small>{((count / total) * 100).toFixed(2)}%</small></div>)}</div>
            <div className='prodb-sequence'>{digits.slice(-20).map((digit,index)=><span className={digit % 2 === 0 ? 'even':'odd'} key={`${index}-${digit}`}>{digit}</span>)}</div>
        </div>
        <div className='prodb-form-row prodb-form-row--three'><label>TICKS<input type='number' min='1' value={duration} onChange={e => setDuration(numeric(e.target.value, 1))}/></label><label>STAKE ({currency})<input type='number' min='.01' step='.01' value={stake} onChange={e => setStake(numeric(e.target.value, .5))}/></label><label>NO. OF BULK TRADES<input type='number' min='1' max='100' value={runs} onChange={e => setRuns(numeric(e.target.value, 1))}/></label></div>
        <div className='prodb-even-odd'><div>Even<strong>{((even / total) * 100).toFixed(2)}%</strong></div><div>Odd<strong>{((odd / total) * 100).toFixed(2)}%</strong></div></div>
        <button className='prodb-bulk-execute' onClick={execute} disabled={busy || !symbol}>{busy ? `EXECUTING ${results.length}/${Math.min(Math.max(Math.trunc(runs),1),100)}…` : `EXECUTE ${contractType}`}</button>
        {error && <div className='prodb-live-error'>{error}</div>}
        {results.length > 0 && <div className='prodb-bulk-results'>{results.slice(-12).map(item => <span className={item.ok ? 'is-ok' : 'is-fail'} key={item.index}>#{item.index} {item.ok ? `✓ ${item.contract_id || ''}` : `✕ ${item.error}`}</span>)}</div>}
    </div>;
};

export default BulkTraderPage;
