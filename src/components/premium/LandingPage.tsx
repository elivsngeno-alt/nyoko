import { useState } from 'react';
import { getCurrentSiteConfig } from '@/config/site-registry';
import { pricingAvailabilityLabel, pricingPlans } from '@/config/pricing';
import BrandMark from './BrandMark';
import { BoltIcon, ChevronIcon, PulseIcon } from './icons';

interface Props {
    onLogin: () => void;
    onSignup: () => void;
    onApiTokenLogin?: () => void;
    busy?: boolean;
}

const features = [
    ['Bot Builder', 'Create visual strategies with the existing Blockly workspace.'],
    ['Auto Trades', 'Set up supported automated workflows from one focused platform.'],
    ['Manual Trading', 'Use the existing execution interface when you want direct control.'],
    ['AI Scanner', 'Review market and tick analysis with the integrated AI tools.'],
    ['Market Analysis', 'Explore digit statistics, market data, and analysis tools.'],
    ['TradingView', 'Use integrated charting to study markets before you act.'],
    ['Bulk & Batch Trading', 'Work with supported bulk and batch trading workflows.'],
    ['Copy Trading', 'Access the existing copy-trading tools when authenticated.'],
];

const faqs = [
    ['What is this platform?', 'A workspace that brings Deriv trading tools, analysis, bots, and account information together.'],
    ['Does it connect to Deriv?', 'Yes. You connect your Deriv account after entering the authenticated application.'],
    ['Can I build trading bots?', 'Yes. The existing Blockly-based Bot Builder supports visual strategy workflows.'],
    ['What is the AI Scanner?', 'It is an analysis tool that helps you review available market and tick information.'],
    ['Can I trade manually?', 'Yes, the existing manual trading area is available after authentication.'],
    ['Can the platform execute automated trades?', 'Supported automation tools can execute trades through your connected Deriv session.'],
    ['Can I use it on Android?', 'Yes. The responsive interface is designed for modern mobile browsers, including Android Chrome.'],
    ['Does trading involve risk?', 'Yes. Trading involves substantial risk. Never trade money you cannot afford to lose.'],
    ['How do I create an account?', 'Choose Create Account and complete the Deriv registration flow.'],
    ['How do I connect my Deriv account?', 'Choose Login to start Deriv authorization, or use the API token option if you have one.'],
];

const LandingPage = ({ onLogin, onSignup, onApiTokenLogin = () => undefined, busy }: Props) => {
    const site = getCurrentSiteConfig();
    const [menuOpen, setMenuOpen] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const closeMenu = () => setMenuOpen(false);

    return (
        <div className='prodb-landing'>
            <header className='prodb-landing__header'>
                <a href='#home' className='prodb-landing__brand' aria-label={`${site.display_domain} home`} onClick={closeMenu}><BrandMark dark /></a>
                <nav className={`prodb-landing__nav ${menuOpen ? 'is-open' : ''}`} aria-label='Main navigation'>
                    {['home', 'features', 'how-it-works', 'free-bots', 'pricing', 'faq'].map(item => <a href={`#${item}`} key={item} onClick={closeMenu}>{item.replace('-', ' ')}</a>)}
                    <button className='prodb-nav-login' onClick={() => { closeMenu(); onLogin(); }} disabled={busy}>Log in</button>
                    <button className='prodb-nav-signup' onClick={() => { closeMenu(); onSignup(); }} disabled={busy}>Create account</button>
                </nav>
                <button className='prodb-menu-toggle' type='button' aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}><span /><span /><span /></button>
            </header>
            <main>
                <section id='home' className='prodb-public-hero'>
                    <div className='prodb-hero__eyebrow'>DERIV TRADING WORKSPACE</div>
                    <h1>Smarter trading.<br /><span>Better tools.</span></h1>
                    <p>Build strategies. Analyze markets. Access professional trading tools in one focused platform.</p>
                    <div className='prodb-public-hero__actions'>
                        <button className='prodb-hero__primary' onClick={onSignup} disabled={busy}>Create account <ChevronIcon /></button>
                        <a className='prodb-hero__secondary' href='#features'>Explore features</a>
                    </div>
                    <div className='prodb-hero__proof'><span>Bot Builder</span><span>Market Analysis</span><span>AI Scanner</span><span>Trading Tools</span></div>
                    <div className='prodb-product-preview' aria-label='Product preview'>
                        <div className='prodb-product-preview__top'><span>Workspace</span><span className='preview-status'>Ready to explore</span></div>
                        <div className='prodb-product-preview__body'><aside><b>Dashboard</b><span>Bot Builder</span><span>Market Analysis</span><span>Free Bots</span></aside><div className='prodb-preview-chart'><div className='preview-chart-line' /><span>Market overview</span><div className='preview-preview-cards'><i /><i /><i /></div></div></div>
                    </div>
                </section>
                <section id='features' className='prodb-public-section'><div className='prodb-section-heading'><span>ONE PLATFORM</span><h2>Tools for every part of your workflow.</h2><p>Use the existing platform capabilities without switching between disconnected tools.</p></div><div className='prodb-feature-grid'>{features.map(([title, text], index) => <article className='prodb-feature-card' key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
                <section id='how-it-works' className='prodb-public-section prodb-public-section--muted'><div className='prodb-section-heading'><span>HOW IT WORKS</span><h2>Start with a clear path.</h2></div><div className='prodb-steps'>{[['01', 'Create account', 'Register through Deriv to get started.'], ['02', 'Connect Deriv', 'Authorize your account securely.'], ['03', 'Choose your tool', 'Open bots, analysis, charts, or trading.'], ['04', 'Analyze or trade', 'Make informed decisions with the workspace.']].map(([number, title, text]) => <div className='prodb-step' key={number}><strong>{number}</strong><h3>{title}</h3><p>{text}</p></div>)}</div></section>
                <section id='free-bots' className='prodb-public-section prodb-free-bots'><div><span>FREE BOTS</span><h2>Explore strategies before you build your own.</h2><p>Browse the existing Free Bots area and learn how the Bot Builder works.</p></div><button className='prodb-hero__primary' onClick={onLogin} disabled={busy}>Explore free bots <ChevronIcon /></button></section>
                <section id='pricing' className='prodb-public-section'><div className='prodb-section-heading'><span>PRICING</span><h2>Choose your starting point.</h2><p>Plans are configurable. Pricing will be published when it is ready.</p></div><div className='prodb-pricing-grid'>{pricingPlans.map(plan => <article className={`prodb-price-card ${plan.featured ? 'is-featured' : ''}`} key={plan.name}><span>{plan.eyebrow}</span><h3>{plan.name}</h3><p>{plan.description}</p><strong>{pricingAvailabilityLabel}</strong><button onClick={onSignup} disabled={busy}>Get started</button></article>)}</div></section>
                <section id='faq' className='prodb-public-section prodb-faq-section'><div className='prodb-section-heading'><span>FAQ</span><h2>Questions, answered.</h2></div><div className='prodb-faq-list'>{faqs.map(([question, answer], index) => <div className='prodb-faq-item' key={question}><button onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index}><span>{question}</span><b>{openFaq === index ? '−' : '+'}</b></button>{openFaq === index && <p>{answer}</p>}</div>)}</div></section>
                <section className='prodb-final-cta'><h2>Ready to explore the platform?</h2><p>Build strategies. Analyze markets. Explore trading tools.</p><button className='prodb-hero__primary' onClick={onSignup} disabled={busy}>Create account <ChevronIcon /></button><small>Already have an account? <button onClick={onLogin} disabled={busy}>Log in</button></small></section>
            </main>
            <footer className='prodb-public-footer'><BrandMark dark /><div><b>Platform</b><a href='#features'>Features</a><a href='#how-it-works'>How it works</a><a href='#free-bots'>Free bots</a></div><div><b>Account</b><button onClick={onLogin}>Log in</button><button onClick={onSignup}>Create account</button></div><div><b>Risk disclosure</b><p>Trading involves risk.<br />Past performance does not guarantee future results.</p></div><small>© 2026 {site.display_domain}</small></footer>
            <button className='prodb-api-token-link' onClick={onApiTokenLogin}>Sign in with Deriv API token</button>
        </div>
    );
};

export default LandingPage;
