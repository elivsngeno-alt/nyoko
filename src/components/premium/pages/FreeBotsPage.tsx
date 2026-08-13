import { useEffect, useState } from 'react';
import { PremiumDerivApiService } from '@/services/premium-deriv-api.service';
import { DownloadIcon } from '../icons';
import { ImportedBestBotsSource, loadSourceBot } from './ImportedFeaturePages';

const bots = [
    ['NOVA PRIME','Dstrike 2','Nova Prime strategies — signal-ready over/under recovery bots.'],
    ['NOVA PRIME','Magic Recovery','Nova Prime strategies — signal-ready over/under recovery bots.'],
    ['NOVA PRIME','NOVAGRID 2026','Nova Prime strategies — signal-ready over/under recovery bots.'],
    ['NOVA PRIME','Over 2 Rec Over 4','Nova Prime strategies — signal-ready over/under recovery bots.'],
    ['NOVA PRIME','UNDER 7 UNDER 5','Nova Prime strategies — signal-ready over/under recovery bots.'],
    ['NOVA PRIME','UNDER 8 UNDER 6','Nova Prime strategies — signal-ready over/under recovery bots.'],
    ['WIZARD','Autovolt 5 Probot 1','Wizard strategies — contract switching and stake automation.'],
    ['WIZARD','Derivwizard 1','Wizard strategies — contract switching and stake automation.'],
    ['WIZARD','Derivwizard 2','Wizard strategies — contract switching and stake automation.'],
    ['WIZARD','Dollarflipper','Wizard strategies — contract switching and stake automation.'],
    ['WIZARD','Dollarminer','Wizard strategies — contract switching and stake automation.'],
    ['WIZARD','Even Odd Auto Switcher','Wizard strategies — contract switching and stake automation.'],
    ['WIZARD','Rise Fallswitcher Bot','Wizard strategies — contract switching and stake automation.'],
    ['WIZARD','Underver Autoswitch','Wizard strategies — contract switching and stake automation.'],
    ['ARENA','Babaking 2','Arena bots — speed and auto-switch trading setups.'],
    ['ARENA','Enhanced Auto Switch Over 2 Bot','Arena bots — speed and auto-switch trading setups.'],
    ['ARENA','H1Tn RUNPRO','Arena bots — speed and auto-switch trading setups.'],
    ['ARENA','Hu Rm YAUTOBo TBYHURMYFXKE','Arena bots — speed and auto-switch trading setups.'],
    ['ARENA','Hu Rm YSPEEDBOTPROV 2','Arena bots — speed and auto-switch trading setups.'],
    ['ARENA','M 27 Auto Switchbot 2024','Arena bots — speed and auto-switch trading setups.'],
    ['ARENA','MIKethe G','Arena bots — speed and auto-switch trading setups.'],
];

const collectArray = (value: any): any[] => {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== 'object') return [];
    for (const candidate of [value.strategies, value.runs, value.items, value.data, value.list]) if (Array.isArray(candidate)) return candidate;
    return [];
};

const FreeBotsPage = ({ openBotBuilder }: { openBotBuilder?: () => void }) => {
    const [strategies, setStrategies] = useState<any[]>([]);
    const [runs, setRuns] = useState<any[]>([]);
    const [busy, setBusy] = useState(false);
    const [sourceBusy, setSourceBusy] = useState('');
    const [error, setError] = useState('');

    const refreshAutomation = async () => {
        setBusy(true); setError('');
        const [strategyResult, runResult] = await Promise.allSettled([
            PremiumDerivApiService.autoListStrategies(),
            PremiumDerivApiService.autoList(),
        ]);
        if (strategyResult.status === 'fulfilled') setStrategies(collectArray(strategyResult.value));
        if (runResult.status === 'fulfilled') setRuns(collectArray(runResult.value));
        const failures = [strategyResult, runResult].filter(item => item.status === 'rejected') as PromiseRejectedResult[];
        if (failures.length === 2) setError(failures[0].reason instanceof Error ? failures[0].reason.message : String(failures[0].reason));
        setBusy(false);
    };

    useEffect(() => { void refreshAutomation(); }, []);

    const loadImportedBot = async (file: string) => {
        if (!openBotBuilder) return;
        setSourceBusy(file); setError('');
        try { await loadSourceBot(file, openBotBuilder); }
        catch (err) { setError(err instanceof Error ? err.message : String(err)); }
        finally { setSourceBusy(''); }
    };

    return <div className='prodb-free-bots'>
        <section className='prodb-auto-engine'>
            <div><span>DERIV AUTO API</span><h2>Automation engine</h2><p>Strategies and active automated runs are read from the authenticated Deriv WebSocket session.</p></div>
            <div className='prodb-auto-engine__metric'><small>AVAILABLE STRATEGIES</small><strong>{strategies.length}</strong></div>
            <div className='prodb-auto-engine__metric'><small>ACCOUNT RUNS</small><strong>{runs.length}</strong></div>
            <button onClick={refreshAutomation} disabled={busy}>{busy ? 'Syncing…' : 'Sync Deriv Auto'}</button>
        </section>
        {strategies.length > 0 && <div className='prodb-auto-strategies'>{strategies.slice(0, 12).map((strategy, index) => <span key={strategy.strategy_id || strategy.id || index}>{strategy.name || strategy.display_name || strategy.strategy_id || strategy.id || `Strategy ${index + 1}`}</span>)}</div>}
        {error && <div className='prodb-live-error'>{error}</div>}

        <div className='prodb-imported-bots-title'><div><span>IMPORTED FROM NEW-USER-INTERFACE</span><h2>Risk Managers bot library</h2><p>The Best Bots page has been merged into this new design. Source XML files are loaded into the existing Bot Builder instead of opening the old UI.</p></div></div>
        <div className='prodb-bot-grid prodb-bot-grid--imported'>
            {ImportedBestBotsSource.map(bot => <article className='prodb-bot-card prodb-bot-card--imported' key={bot.file}>
                <div className='prodb-bot-card__top'><button>☆</button><span>{bot.tag}</span></div><small>SOURCE BOT</small><h2>{bot.title}</h2><p><i>★</i> {bot.description}</p>
                <button className='prodb-load-bot' disabled={Boolean(sourceBusy)} onClick={() => loadImportedBot(bot.file)}>{sourceBusy === bot.file ? 'LOADING…' : 'LOAD BOT'} <DownloadIcon /></button>
            </article>)}
        </div>

        <div className='prodb-imported-bots-title prodb-imported-bots-title--current'><div><span>PROD B LIBRARY</span><h2>Current premium bot collection</h2></div></div>
        <div className='prodb-bot-grid'>
            {bots.map(([tag,title,description]) => <article className='prodb-bot-card' key={`${tag}-${title}`}>
                <div className='prodb-bot-card__top'><button>☆</button><span>{tag}</span></div><small>FREE BOT</small><h2>{title}</h2><p><i>★</i> {description}</p>
                <button className='prodb-load-bot' onClick={openBotBuilder}>LOAD IN BOT BUILDER <DownloadIcon /></button>
            </article>)}
        </div>
        <button className='prodb-ai-button prodb-ai-button--top'><span>✨</span><small>AI</small></button>
    </div>;
};

export default FreeBotsPage;
