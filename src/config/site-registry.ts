import brandConfig from '../../brand.config.json';

export type SiteEnvironment = 'production' | 'staging';

export interface SiteOAuthConfig {
    id: string;
    hosts: string[];
    display_domain: string;
    website_url: string;
    redirect_uri: string;
    client_id: string;
    scopes: string[];
    environment: SiteEnvironment;
    legacy_app_id?: string;
}

interface MultiSiteConfig {
    default_site: string;
    entries: SiteOAuthConfig[];
}

const multiSite = brandConfig.sites as MultiSiteConfig;

const normalizeHost = (host: string) => host.trim().toLowerCase().replace(/^www\./, '');

export const getAllSiteConfigs = (): SiteOAuthConfig[] => multiSite.entries;

export const getSiteConfigById = (siteId: string | null | undefined): SiteOAuthConfig | undefined => {
    if (!siteId) return undefined;
    return multiSite.entries.find(site => site.id === siteId);
};

export const getDefaultSiteConfig = (): SiteOAuthConfig => {
    const configuredDefault = getSiteConfigById(multiSite.default_site);
    if (configuredDefault) return configuredDefault;

    const first = multiSite.entries[0];
    if (!first) throw new Error('No site OAuth configurations are defined.');
    return first;
};

export const resolveSiteConfig = (hostname?: string): SiteOAuthConfig | undefined => {
    const currentHost = normalizeHost(
        hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '')
    );

    if (!currentHost) return undefined;

    return multiSite.entries.find(site => site.hosts.some(host => normalizeHost(host) === currentHost));
};

/**
 * Safe display fallback. This may return the configured default site on an unknown host.
 * Authentication code must use requireCurrentSiteConfig() instead so a wrong client_id
 * can never be sent for an unregistered domain.
 */
export const getCurrentSiteConfig = (): SiteOAuthConfig => resolveSiteConfig() ?? getDefaultSiteConfig();

/**
 * Fail closed for OAuth. Every production/custom domain must be explicitly listed in
 * brand.config.json -> sites.entries[].hosts with its own client_id + redirect_uri.
 */
export const requireCurrentSiteConfig = (): SiteOAuthConfig => {
    const site = resolveSiteConfig();
    if (site) return site;

    throw new Error(
        `This domain (${typeof window !== 'undefined' ? window.location.hostname : 'unknown'}) has no Deriv OAuth configuration.`
    );
};
