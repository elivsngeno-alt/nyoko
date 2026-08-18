const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const catalogPath = path.join(root, 'public', 'site-config', 'catalog.json');
const domainsDir = path.join(root, 'public', 'site-config', 'domains');
const brandPath = path.join(root, 'brand.config.json');
const HEX = /^#[0-9a-f]{6}$/i;

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const brand = JSON.parse(fs.readFileSync(brandPath, 'utf8'));
const catalogItems = Array.isArray(catalog.navigation_catalog) ? catalog.navigation_catalog : [];
const ids = catalogItems.map(item => String(item?.id || ''));
const idSet = new Set(ids);
const required = catalogItems.filter(item => item?.required).map(item => String(item.id));
const siteIds = new Set((brand?.sites?.entries || []).map(site => String(site.id)));
const colorKeys = ['primary', 'secondary', 'nav_background', 'nav_text', 'header_background'];

if (!catalogItems.length || ids.some(id => !id)) throw new Error('Site customization catalog is empty or contains an invalid id.');
if (idSet.size !== ids.length) throw new Error('Site customization catalog contains duplicate navigation ids.');

const validateNavigation = (navigation, label) => {
  if (!Array.isArray(navigation) || navigation.length === 0) throw new Error(`${label}: navigation must be a non-empty array.`);
  const values = navigation.map(String);
  if (new Set(values).size !== values.length) throw new Error(`${label}: navigation contains duplicate items.`);
  for (const id of values) if (!idSet.has(id)) throw new Error(`${label}: unknown navigation item ${id}.`);
  for (const id of required) if (!values.includes(id)) throw new Error(`${label}: required navigation item ${id} is missing.`);
};

const validateColors = (colors, label) => {
  if (!colors || typeof colors !== 'object') throw new Error(`${label}: colors must be an object.`);
  for (const key of colorKeys) {
    if (!HEX.test(String(colors[key] || ''))) throw new Error(`${label}: ${key} must be a six-digit hex color.`);
  }
  for (const key of Object.keys(colors)) if (!colorKeys.includes(key)) throw new Error(`${label}: unsupported color key ${key}.`);
};

validateNavigation(catalog?.defaults?.navigation, 'catalog defaults');
validateColors(catalog?.defaults?.colors, 'catalog defaults');

let count = 0;
if (fs.existsSync(domainsDir)) {
  for (const file of fs.readdirSync(domainsDir).filter(name => name.endsWith('.json'))) {
    const siteId = path.basename(file, '.json');
    if (!siteIds.has(siteId)) throw new Error(`${file}: site id is not configured in brand.config.json.`);
    const payload = JSON.parse(fs.readFileSync(path.join(domainsDir, file), 'utf8'));
    if (String(payload.site_id || '') !== siteId) throw new Error(`${file}: site_id must equal ${siteId}.`);
    validateNavigation(payload.navigation, file);
    validateColors(payload.colors, file);
    count += 1;
  }
}

console.log(`Validated site customization catalog and ${count} domain configuration(s).`);
