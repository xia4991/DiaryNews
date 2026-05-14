# Cloudflare Public Access

This project can be exposed publicly while still running on your local machine.

Recommended architecture:

1. FastAPI backend on `localhost:8000`
2. Built React frontend served by Caddy on `localhost:8080`
3. Cloudflare Tunnel maps `app.your-domain.com` to `http://localhost:8080`

## Why this setup

- One public hostname for the whole app
- Frontend keeps using relative `/api` calls
- No public inbound ports
- Easier Google OAuth and CORS setup

## Files added in this repo

- Caddy config: [deploy/cloudflare/Caddyfile](/Users/yongbinjiang/Desktop/XAB/projects/DiaryNews/deploy/cloudflare/Caddyfile)
- Cloudflare Tunnel config template: [deploy/cloudflare/cloudflared-config.yml.example](/Users/yongbinjiang/Desktop/XAB/projects/DiaryNews/deploy/cloudflare/cloudflared-config.yml.example)

## Prerequisites

On macOS with Homebrew:

```bash
brew install caddy cloudflared
```

## 1. Update environment variables

In your project root `.env`, change `CORS_ORIGINS` so it includes your public app domain.

Example:

```env
CORS_ORIGINS=http://localhost:5173,https://app.your-domain.com
```

Keep `JWT_SECRET`, `GOOGLE_CLIENT_ID`, and `ADMIN_EMAILS` set.

## 2. Build the frontend

```bash
cd /Users/yongbinjiang/Desktop/XAB/projects/DiaryNews/react-frontend
npm install
npm run build
```

This creates:

- `/Users/yongbinjiang/Desktop/XAB/projects/DiaryNews/react-frontend/dist`

## 3. Run the backend

```bash
cd /Users/yongbinjiang/Desktop/XAB/projects/DiaryNews
source .venv/bin/activate
python main.py
```

Backend will listen on:

- `http://localhost:8000`

## 4. Run Caddy

Use the provided Caddyfile:

```bash
caddy run --config /Users/yongbinjiang/Desktop/XAB/projects/DiaryNews/deploy/cloudflare/Caddyfile
```

Caddy will listen on:

- `http://localhost:8080`

It will:

- serve the built frontend
- proxy `/api/*` to FastAPI
- proxy `/uploads/*` to FastAPI
- provide SPA fallback to `index.html`

Keep the API and uploads proxy rules ahead of the SPA fallback. If `/api/news`
starts returning `index.html`, the Caddy route order has been broken.

## 5. Create a Cloudflare Tunnel

Authenticate:

```bash
cloudflared tunnel login
```

Create a named tunnel:

```bash
cloudflared tunnel create diarynews
```

Cloudflare will give you a tunnel ID and create a credentials JSON file under `~/.cloudflared/`.

## 6. Create your tunnel config

Copy the example:

```bash
cp /Users/yongbinjiang/Desktop/XAB/projects/DiaryNews/deploy/cloudflare/cloudflared-config.yml.example ~/.cloudflared/config.yml
```

Then edit `~/.cloudflared/config.yml`:

- replace `YOUR_TUNNEL_ID`
- replace `app.example.com` with your real hostname, for example `app.your-domain.com`

For your current domain, the recommended hostname is:

- `app.huarenpt.com`

Make sure the Cloudflare account has the `huarenpt.com` zone.

Expected result:

```yaml
tunnel: 12345678-1234-1234-1234-123456789abc
credentials-file: /Users/yongbinjiang/.cloudflared/12345678-1234-1234-1234-123456789abc.json

ingress:
  - hostname: app.huarenpt.com
    service: http://localhost:8080
  - service: http_status:404
```

## 7. Route DNS to the tunnel

Create the DNS route from your hostname to the tunnel:

```bash
cloudflared tunnel route dns diarynews app.huarenpt.com
```

## 8. Start the tunnel

```bash
cloudflared tunnel run diarynews
```

After this, your site should be reachable at:

- `https://app.huarenpt.com`

## 9. Update Google OAuth

Because this project uses Google login, go to your Google Cloud Console and add:

- Authorized JavaScript origin:
  - `https://app.huarenpt.com`

If needed, also add the same domain in any allowed origin or redirect settings used by your OAuth app.

## 10. Recommended local run order

Open three terminals:

### Terminal 1

```bash
cd /Users/yongbinjiang/Desktop/XAB/projects/DiaryNews
source .venv/bin/activate
python main.py
```

### Terminal 2

```bash
caddy run --config /Users/yongbinjiang/Desktop/XAB/projects/DiaryNews/deploy/cloudflare/Caddyfile
```

### Terminal 3

```bash
cloudflared tunnel run diarynews
```

## Optional: run as background services

If you want this to stay up after reboots on macOS:

```bash
brew services start caddy
brew services start cloudflared
```

For the backend, you can later add a `launchd` plist or another process manager.

## Verification checklist

1. `http://localhost:8000/api/status` responds locally
2. `http://localhost:8080` loads the built frontend
3. `https://app.your-domain.com` loads publicly
4. Login works on the public domain
5. `/api` requests succeed from the public domain

## Notes

- Your computer must stay powered on and connected to the Internet.
- This is good for testing, demos, and small-scale public access.
- For long-term production, move the app to a server or VPS.
