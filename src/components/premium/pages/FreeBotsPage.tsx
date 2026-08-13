import { useEffect, useState } from 'react';
import { load, save_types } from '@/external/bot-skeleton';
import { PremiumDerivApiService } from '@/services/premium-deriv-api.service';
import { DownloadIcon } from '../icons';

const sourceBots = [
    { tag: 'PREMIUM', title: 'New Under 8 Special Bot 2026', file: 'New under 8 special bot 2026.xml', description: 'Adaptive Under 8 strategy with protected profit/loss controls.' },
    { tag: 'VIP', title: 'Double Under bot', file: 'Double Under bot.xml', guide: 'Mighty_Double_Under_Bot_Quick_Guide.pdf', description: 'Editable Over/Under direction with two-tick direction confirmation.' },
    { tag: 'RISK MANAGERS', title: 'D10 BY mrduke', file: 'D10 BY mrduke.xml', description: 'Alternates Even/Odd, Over4/Under5 and Rise/Fall with switch-count, martingale and TP/SL controls.' },
    { tag: 'RISK MANAGERS', title: 'Percentage Over by Mr Duke', file: 'Percentage Over by Mr Duke.xml', description: 'Percentage-driven digit-over setup from the source bot library.' },
    { tag: 'RISK MANAGERS', title: 'grffy v1', file: 'grffy v1.xml', description: 'Original Risk Managers source strategy, preserved for loading in the current Bot Builder.' },
    { tag: 'RISK MANAGERS', title: 'Mr Duke Speed Bot.1', file: 'Mr Duke Speed Bot.1.xml', description: 'Fast execution bot from the source library.' },
    { tag: 'RISK MANAGERS', title: 'Wealth Generator', file: 'Wealth Generator.xml', description: 'Source strategy packaged for direct Bot Builder loading.' },
];

const bots = [
    ['NOVA PRIME', 'Dstrike 2', 'Nova Prime strategies — signal-ready over/under recovery bots.'],
    ['NOVA PRIME', 'Magic Recovery', 'Nova Prime strategies — signal-ready over/under recovery bots.'],
    ['NOVA PRIME', 'NOVAGRID 2026', 'Nova Prime strategies — signal-ready over/under recovery bots.'],
    ['NOVA PRIME', 'Over 2 Rec Over 4', 'Nova Prime strategies — signal-ready over/under recovery bots.'],
    ['NOVA PRIME', 'UNDER 7 UNDER 5', 'Nova Prime strategies — signal-ready over/under recovery bots.'],
    ['NOVA PRIME', 'UNDER 8 UNDER 6', 'Nova Prime strategies — signal-ready over/under recovery bots.'],
    ['WIZARD', 'Autovolt 5 Probot 1', 'Wizard strategies — contract switching and stake automation.'],
    ['WIZARD', 'Derivwizard 1', 'Wizard strategies — contract switching and stake automation.'],
    ['WIZARD', 'Derivwizard 2', 'Wizard strategies — contract switching and stake automation.'],
    ['WIZARD', 'Dollarflipper', 'Wizard strategies — contract switching and stake automation.'],
    ['WIZARD', 'Dollarminer', 'Wizard strategies — contract switching and stake automation.'],
    ['WIZARD', 'Even Odd Auto Switcher', 'Wizard strategies — contract switching and stake automation.'],
    ['WIZARD', 'Rise Fallswitcher Bot', 'Wizard strategies — contract switching and stake automation.'],
    ['WIZARD', 'Underver Autoswitch', 'Wizard strategies — contract switching and stake automation.'],
    ['ARENA', 'Babaking 2', 'Arena bots — speed and auto-switch trading setups.'],
    ['ARENA', 'Enhanced Auto Switch Over 2 Bot', 'Arena bots — speed and auto-switch trading setups.'],
    ['ARENA', 'H1Tn RUNPRO', 'Arena bots — speed and auto-switch trading setups.'],
    ['ARENA', 'Hu Rm YAUTOBo TBYHURMYFXKE', 'Arena bots — speed and auto-switch trading setups.'],
    ['ARENA', 'Hu Rm YSPEEDBOTPROV 2', 'Arena bots — speed and auto-switch trading setups.'],
    ['ARENA', 'M 27 Auto Switchbot 2024', 'Arena bots — speed and auto-switch trading setups.'],
    ['ARENA', 'MIKethe G', 'Arena bots — speed and auto-switch trading setups.'],
];

const SOURCE_ROOT = 'https://raw.githubusercontent.com/DukeNyamasege/new-user-interface/main/public/riskmanagers.site';

const collectArray = (value: any): any[] => {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== 'object') return [];
    for (const candidate of [value.strategies, value.runs, value.items, value.data, value.list]) {
        if (Array.isArray(candidate)) return candidate;
    }
    return [];
};

const waitForWorkspace = async () => {
    for (let attempt = 0; attempt < 30; attempt += 1) {
        const workspace = window.Blockly?.derivWorkspace;
        if (workspace) return workspace;
        await new Promise(resolve => window.setTimeout(resolve, 100));
    }
    throw new Error('Bot Builder workspace is not ready. Open Bot Builder and try again.');
};

const FreeBotsPage = ({ openBotBuilder }: { openBotBuilder?: () => void }) => {
    const [strategies, setStrategies] = useState<any[]>([]);
    const [runs, setRuns] = useState<any[]>([]);
    const [busy, setBusy] = useState(false);
    const [sourceBusy, setSourceBusy] = useState('');
    const [error, setError] = useState('');

    const refreshAutomation = async () => {
        setBusy(true);
        setError('');
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
        setSourceBusy(file);
        setError('');
        try {
            const response = await fetch(`${SOURCE_ROOT}/${encodeURIComponent(file)}`);
            if (!response.ok) throw new Error(`Could not fetch ${file} from the source library (HTTP ${response.status}).`);
            const xml = await response.text();
            if (!xml.includes('<xml') && !xml.includes('<block')) throw new Error(`${file} did not contain a valid Blockly XML document.`);
            openBotBuilder();
            const workspace = await waitForWorkspace();
            await load({
                block_string: xml,
                file_name: file,
                workspace,
                from: save_types.LOCAL,
                drop_event: {},
                strategy_id: null,
                showIncompatibleStrategyDialog: false,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setSourceBusy('');
        }
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

        <div className='prodb-imported-bots-title'><div><span>IMPORTED FROM NEW-USER-INTERFACE</span><h2>Risk Managers bot library</h2><p>All seven entries from the source Risk Managers manifest are represented here. Their XML files load into the current premium Bot Builder.</p></div></div>
        <div className='prodb-bot-grid prodb-bot-grid--imported'>
            {sourceBots.map(bot => <article className='prodb-bot-card prodb-bot-card--imported' key={bot.file}>
                <div className='prodb-bot-card__top'><button>☆</button><span>{bot.tag}</span></div><small>SOURCE BOT</small><h2>{bot.title}</h2><p><i>★</i> {bot.description}</p>
                {bot.guide && <a className='prodb-source-guide' href={`${SOURCE_ROOT}/${encodeURIComponent(bot.guide)}`} target='_blank' rel='noreferrer'>QUICK GUIDE</a>}
                <button className='prodb-load-bot' disabled={Boolean(sourceBusy)} onClick={() => loadImportedBot(bot.file)}>{sourceBusy === bot.file ? 'LOADING…' : 'LOAD BOT'} <DownloadIcon /></button>
            </article>)}
        </div>

        <div className='prodb-imported-bots-title prodb-imported-bots-title--current'><div><span>PROD B LIBRARY</span><h2>Current premium bot collection</h2></div></div>
        <div className='prodb-bot-grid'>
            {bots.map(([tag, title, description]) => <article className='prodb-bot-card' key={`${tag}-${title}`}>
                <div className='prodb-bot-card__top'><button>☆</button><span>{tag}</span></div><small>FREE BOT</small><h2>{title}</h2><p><i>★</i> {description}</p>
                <button className='prodb-load-bot' onClick={openBotBuilder}>LOAD IN BOT BUILDER <DownloadIcon /></button>
            </article>)}
        </div>
        <button className='prodb-ai-button prodb-ai-button--top'><span>✨</span><small>AI</small></button>
    </div>;
};

export default FreeBotsPage;
