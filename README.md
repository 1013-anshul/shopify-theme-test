# Vura Shopify Theme

> VURA · वूरा — Mineral Skincare · Made in India with Care

A custom Shopify Online Store 2.0 theme for [vurashop.com](https://vurashop.com), built on the Vura Design System.

---

## Branch Strategy

| Branch | Shopify Theme | Purpose |
|---|---|---|
| `main` | Production theme | Live store |
| `preview` | Development theme | Staging / client review |
| `feature/*` | No sync | Local dev — PR into `preview` |

## Shopify GitHub Integration

This repo is connected to Shopify via the **native GitHub integration**:

1. Shopify Admin → **Online Store** → **Themes**
2. Click **Add theme** → **Connect from GitHub**
3. Authorize the Shopify GitHub App
4. Select this repository and the target branch (`main` or `preview`)
5. Every push to the connected branch auto-deploys to that Shopify theme

## Local Development

Since Node/Shopify CLI are not required for this theme structure, editing happens directly in the repo. To preview locally:

1. Push changes to the `preview` branch
2. Shopify will sync automatically
3. Click **Preview** in Shopify Admin → Themes to review

## Asset QA Gate

Before any deployment, run the quality gate:

```bash
./scripts/qa-assets.sh
```

All assets must pass (or be reviewed for `approved_with_note` cautions) before going to production.

## Packaging (without Shopify CLI)

```bash
./zip-theme.sh
```

Produces `antigravity-theme.zip` for manual upload to Shopify Admin.

## Design System

The Vura Design System lives in `Vura Design System/` (not shipped to Shopify). Key rules:

- **Canvas**: `#162D24` forest green — the only background
- **Wordmark**: Roca One, saffron `#FFC03F`, `6px 6px 0 #8D3B2D` terracotta drop-shadow
- **No glassmorphism, no gradients, no 16px+ corners**
- **Button label**: "Add to Order" — never "Buy Now" or "Add to Cart"
- **No emoji** anywhere

See `Vura Design System/README.md` for the full system.
