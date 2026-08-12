# PROD B TRADER Premium UI

This customization is built on the official `deriv-com/trading-bot-template` master branch. It keeps the template's existing OAuth 2.0 + PKCE/token-exchange logic and replaces the outer presentation layer with the PROD B TRADER flow shown in the supplied screenshots.

## What changed

- Dark PROD B TRADER landing page before authentication.
- **Log in** and **Sign up** use the template's existing `generateOAuthURL()` flow.
- Full-screen branded connection/loading view during the OAuth callback.
- Premium white/green/dark-navy authenticated application shell.
- Animated right-to-left market ticker and testimonial carousel.
- Navigation for Dashboard, Bot Builder, Free Bots, Bulk Trader, Manual Trader, Copy Trading, Charts, and Analysis Tools.
- The official template's real Bot Builder remains mounted under **Bot Builder**.
- Screenshot-style Dashboard, Free Bots, and Bulk Trader presentation shells.
- PROD B TRADER palette and `prodbtrader.site` branding in `brand.config.json`.

## Important implementation boundary

The **Bot Builder and OAuth flow remain connected to the official template**. Dashboard, Free Bots, and Bulk Trader custom screens are presentation shells matching the supplied screenshots. Their sample buttons/data are not wired to real purchases or bot files yet. The animated ticker currently uses sample display values, not a live market feed.

Manual Trader, Copy Trading, Charts, and Analysis Tools currently show premium placeholder screens so the existing or future modules can be connected without rewriting the authentication/navigation layer.

## Install and run

```bash
npm install
npm run generate:brand-css
npm start
```

The template expects Node.js 22.x or 24.x.

## OAuth setup

Create `.env` in the project root:

```env
CLIENT_ID=YOUR_DERIV_OAUTH_CLIENT_ID
```

Register the exact HTTPS redirect domain with Deriv. For local development, use the HTTPS localhost redirect expected by the template. For production, keep the registered domain and `brand.config.json` production hostname aligned.

The customized navigation uses hashes such as:

```text
#dashboard
#bot_builder
#free_bots
#bulk_trader
```

The root route `/` stays intact for the OAuth callback.

## Main palette

```text
Landing/app navy:    #0B1218 / #151D26
Primary green:       #059669
Bright green:        #1EC995
Bulk background:     #D3D3D3
Even/teal:           #49A7A4
Odd/red:             #EF4E43
AI purple:           #6D28D9
White workspace:     #FFFFFF
```

## Added UI files

```text
src/components/premium/
  PremiumLayout.tsx
  PremiumHeader.tsx
  PremiumTicker.tsx
  LandingPage.tsx
  PremiumLoader.tsx
  BottomStatusBar.tsx
  BrandMark.tsx
  icons.tsx
  types.ts
  premium-base.scss
  premium-app.scss
  pages/
    DashboardHome.tsx
    FreeBotsPage.tsx
    BulkTraderPage.tsx
    ComingSoonPage.tsx

src/assets/prodb-premium/
  prodb-logo.png
  auth-loader-bg.jpg
```

The loader background was derived from the supplied screenshot so the login transition matches the reference more closely.