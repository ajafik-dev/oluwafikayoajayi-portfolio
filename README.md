# Oluwafikayo Ajayi — portfolio

Personal site for [oluwafikayoajayi.com](https://oluwafikayoajayi.com) (Cloudflare DNS, Netlify static hosting).

One-page home (`index.html`) with a work list at `work.html`. The contact form uses Netlify Forms.

## Preview locally

```bash
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080).

## Deploy

Point Netlify at this repo. Canonical URLs use the apex domain `https://oluwafikayoajayi.com/`. `www` is redirected to apex in `netlify.toml` (also configure the same redirect in Cloudflare if www is proxied there).

The old `portfolio_detail.html` placeholder redirects to `work.html`.
