import { resolveSiteConfig } from '@/config/site-registry';

const cleanDomain = (value: string) =>
    value
        .trim()
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .replace(/\/.*$/, '')
        .replace(/:\d+$/, '');

export const getTemplateDomain = () => {
    const configured = resolveSiteConfig();
    const browserHost = typeof window !== 'undefined' ? window.location.hostname : '';
    const value = configured?.display_domain || browserHost || 'trading.site';
    return cleanDomain(value);
};

export const getDomainAbbreviation = (domain = getTemplateDomain()) => {
    const stem = cleanDomain(domain).split('.')[0] || 'site';
    const chunks = stem.split(/[-_\s]+/).filter(Boolean);

    if (chunks.length > 1) {
        return chunks
            .slice(0, 3)
            .map(chunk => chunk[0])
            .join('')
            .toUpperCase();
    }

    const compact = stem.replace(/[^a-z0-9]/gi, '');
    return (compact.slice(0, 3) || 'SITE').toUpperCase();
};

export const getDomainTitle = () => getTemplateDomain();
