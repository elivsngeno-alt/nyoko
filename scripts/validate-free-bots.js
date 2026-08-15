const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const root = path.resolve(__dirname, '..');
const libraryDir = path.join(root, 'public', 'free-bots');
const manifestPath = path.join(libraryDir, 'bots.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const bots = Array.isArray(manifest) ? manifest : manifest.bots;

if (!Array.isArray(bots) || bots.length === 0) {
    throw new Error('Free bot manifest does not contain any bots.');
}

if (Number.isFinite(Number(manifest.count)) && Number(manifest.count) !== bots.length) {
    throw new Error(`Free bot manifest count=${manifest.count} but contains ${bots.length} entries.`);
}

for (const [index, bot] of bots.entries()) {
    if (!bot || typeof bot.file !== 'string' || bot.file.trim() === '') {
        throw new Error(`Bot entry ${index + 1} is missing a file name.`);
    }

    const asset = bot.asset || bot.file;
    const assetPath = path.join(libraryDir, asset);
    if (!fs.existsSync(assetPath)) {
        throw new Error(`${bot.name || bot.file}: missing asset ${asset}.`);
    }

    let xml;
    if (bot.encoding === 'gzip-base64') {
        const encoded = fs.readFileSync(assetPath, 'utf8').replace(/\s+/g, '');
        const compressed = Buffer.from(encoded, 'base64');
        xml = zlib.gunzipSync(compressed).toString('utf8');
    } else {
        xml = fs.readFileSync(assetPath, 'utf8');
    }

    if (!/<xml[\s>]/i.test(xml) || !/<block[\s>]/i.test(xml)) {
        throw new Error(`${bot.name || bot.file}: asset is not valid Blockly XML.`);
    }
}

console.log(`Validated ${bots.length} free bot assets.`);
