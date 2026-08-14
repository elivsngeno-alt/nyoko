import { useEffect, useState } from 'react';
import { getCurrentSiteConfig } from '@/config/site-registry';
import { load, save_types } from '@/external/bot-skeleton';
import { DownloadIcon } from '../icons';
import { getTemplateDomain } from '../domain-brand';

type DomainBot = {
    id?: string;
    name?: string;
    title?: string;
    file: string;
    description?: string;
    emoji?: string;
    is_premium?: boolean;
    priority?: number;
    guide?: string;
};

const waitForWorkspace = async () => {
    for (let attempt = 0; attempt < 40; attempt += 1) {
        const workspace = window.Blockly?.derivWorkspace;
        if (workspace) return workspace;
        await new Promise(resolve => window.setTimeout(resolve, 100));
    }
    throw new Error('Bot Builder workspace is not ready. Open Bot Builder and try again.');
};

const joinUrl = (base: string, file: string) => `${base.replace(/\/$/, '')}/${encodeURIComponent(file)}`;

const FreeBotsPage = ({ openBotBuilder }: { openBotBuilder?: () => void }) => {
    const site = getCurrentSiteConfig();
    const domain = getTemplateDomain();
    const library = site.bot_library;
    const [bots, setBots] = useState<DomainBot[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyFile, setBusyFile] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        let alive = true;
        const loadManifest = async () => {
            setLoading(true);
            setError('');
            if (!library?.manifest_url) {
                if (alive) {
                    setBots([]);
                    setLoading(false);
                }
                return;
            }
            try {
                const response = await fetch(library.manifest_url, { cache: 'no-store' });
                if (!response.ok) throw new Error(`Bot manifest returned HTTP ${response.status}.`);
                const manifest = await response.json();
                const items = Array.isArray(manifest) ? manifest : Array.isArray(manifest?.bots) ? manifest.bots : [];
                const clean = items
                    .filter((item: any) => item && typeof item.file === 'string')
                    .map((item: any) => ({ ...item, priority: Number(item.priority ?? 999) }))
                    .sort((a: DomainBot, b: DomainBot) => Number(a.priority ?? 999) - Number(b.priority ?? 999));
                if (alive) setBots(clean);
            } catch (err) {
                if (alive) setError(err instanceof Error ? err.message : String(err));
            } finally {
                if (alive) setLoading(false);
            }
        };
        void loadManifest();
        return () => { alive = false; };
    }, [library?.manifest_url]);

    const baseUrl = library?.base_url || (library?.manifest_url ? library.manifest_url.replace(/\/[^/]*$/, '') : '');

    const loadBot = async (bot: DomainBot) => {
        if (!openBotBuilder || !baseUrl) return;
        setBusyFile(bot.file);
        setError('');
        try {
            const response = await fetch(joinUrl(baseUrl, bot.file));
            if (!response.ok) throw new Error(`Could not fetch ${bot.file} (HTTP ${response.status}).`);
            const xml = await response.text();
            if (!xml.includes('<xml') && !xml.includes('<block')) throw new Error(`${bot.file} is not a Blockly XML bot.`);

            openBotBuilder();
            const workspace = await waitForWorkspace();
            await load({
                block_string: xml,
                file_name: bot.file,
                workspace,
                from: save_types.LOCAL,
                drop_event: {},
                strategy_id: null,
                showIncompatibleStrategyDialog: false,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setBusyFile('');
        }
    };

    return <div className='prodb-free-bots'>
        {loading && <div className='prodb-live-empty'>Loading bots…</div>}
        {error && <div className='prodb-live-error'>{error}</div>}
        {!loading && !error && bots.length === 0 && <div className='prodb-live-empty'>No free bots are available yet.</div>}

        <div className='prodb-bot-grid prodb-bot-grid--imported'>
            {bots.map(bot => {
                const name = bot.name || bot.title || bot.file.replace(/\.xml$/i, '');
                const tag = bot.is_premium ? 'PREMIUM' : bot.emoji || 'FREE BOT';
                return <article className='prodb-bot-card prodb-bot-card--imported' key={bot.id || bot.file}>
                    <div className='prodb-bot-card__top'><button type='button'>☆</button><span>{tag}</span></div>
                    <small>{domain}</small>
                    <h2>{name}</h2>
                    <p><i>★</i> {bot.description || 'Bot configured for this domain.'}</p>
                    {bot.guide && baseUrl && <a className='prodb-source-guide' href={joinUrl(baseUrl, bot.guide)} target='_blank' rel='noreferrer'>QUICK GUIDE</a>}
                    <button className='prodb-load-bot' disabled={Boolean(busyFile)} onClick={() => loadBot(bot)}>
                        {busyFile === bot.file ? 'LOADING…' : 'LOAD BOT'} <DownloadIcon />
                    </button>
                </article>;
            })}
        </div>
    </div>;
};

export default FreeBotsPage;
