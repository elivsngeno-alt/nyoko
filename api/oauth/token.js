const AUTH_TOKEN_URL = 'https://auth.deriv.com/oauth2/token';

const json = (res, status, body) => {
  res.status(status).setHeader('Cache-Control', 'no-store').json(body);
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  const clientId = String(process.env.CLIENT_ID || '').trim();
  const redirectUri = String(process.env.DERIV_REDIRECT_URI || '').trim();
  if (!clientId || !redirectUri) {
    return json(res, 500, { error: 'server_configuration_error' });
  }

  const payload = req.body || {};
  if (!payload.code && !payload.refresh_token) {
    return json(res, 400, { error: 'invalid_request' });
  }

  const form = new URLSearchParams();
  form.set('grant_type', payload.grant_type || 'authorization_code');
  form.set('client_id', clientId);

  if (payload.grant_type === 'refresh_token') {
    form.set('refresh_token', String(payload.refresh_token));
  } else {
    if (!payload.code || !payload.code_verifier) {
      return json(res, 400, { error: 'invalid_request' });
    }
    form.set('code', String(payload.code));
    form.set('code_verifier', String(payload.code_verifier));
    form.set('redirect_uri', redirectUri);
  }

  try {
    const upstream = await fetch(AUTH_TOKEN_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    const text = await upstream.text();
    let body;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { error: 'invalid_upstream_response' };
    }
    return json(res, upstream.status, body);
  } catch {
    return json(res, 502, { error: 'oauth_upstream_unavailable' });
  }
}
