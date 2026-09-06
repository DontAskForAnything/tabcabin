# Self-hosting the sync server

The TabHangar extension works without a server. Run one when you want the same boards in several
browsers or on several computers. The server is a single small container with an SQLite database;
a 1 vCPU / 512 MB VPS is plenty for a household.

What you need:

- a Linux server with [Docker](https://docs.docker.com/engine/install/) and the Compose plugin
- a domain or subdomain pointing at it (an `A`/`AAAA` record, e.g. `tabs.example.com`)
- ports 80 and 443 open (for HTTPS certificates)

## 1. Get the code

```bash
sudo mkdir -p /opt/tabhangar && sudo chown "$USER" /opt/tabhangar
git clone https://github.com/DontAskForAnything/tabhangar.git /opt/tabhangar
cd /opt/tabhangar
```

## 2. Configure

```bash
cp .env.example .env
nano .env
```

| Variable                           | Meaning                                                                     |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `DOMAIN`                           | Your domain, e.g. `tabs.example.com`                                        |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | First account, created on the first start (remove the password afterwards)  |
| `ALLOW_SIGNUP`                     | `true` lets anyone who knows the address create an account. Default `false` |
| `SESSION_TTL_DAYS`                 | How long an unused device stays signed in. Default `30`                     |

## 3. Start

```bash
docker compose --profile caddy up -d
docker compose logs -f
```

This builds the image, starts the server and a [Caddy](https://caddyserver.com) proxy that fetches a
certificate for `DOMAIN` automatically. Check it from your computer:

```bash
curl https://tabs.example.com/health
# {"ok":true,"name":"tabhangar","version":"0.1.0"}
```

After the first start, remove `ADMIN_PASSWORD` from `.env`.

## 4. Connect the extension

In TabHangar open **Settings → Account & sync** (or **More → Account & sync**), enter
`https://tabs.example.com`, wait for "Server responds", then sign in. If the browser already has
boards and so does your account, choose **Keep both** or **Use the server's data**. Repeat on every
browser you want to sync.

## Managing accounts

The image includes a small command-line tool:

```bash
docker compose exec tabhangar tabhangar list-users
docker compose exec tabhangar tabhangar create-user anna          # asks for a password
docker compose exec tabhangar tabhangar create-user anna --admin
docker compose exec tabhangar tabhangar reset-password anna      # also signs out every device
docker compose exec tabhangar tabhangar delete-user anna         # deletes the account and its data
```

## Backups

`deploy/backup.sh` writes a consistent copy of the database (SQLite online backup) to `./backups`
and keeps the newest seven:

```bash
./deploy/backup.sh
```

Run it every night with cron (`crontab -e`):

```cron
15 3 * * * /opt/tabhangar/deploy/backup.sh >> /var/log/tabhangar-backup.log 2>&1
```

`BACKUP_DIR` and `KEEP` change the folder and the number of copies. Copy the backups off the server
from time to time (for example with `rsync` or your VPS provider's snapshots).

### Restore

```bash
docker compose stop tabhangar
docker compose cp backups/tabhangar-YYYYMMDD-HHMMSS.db tabhangar:/data/tabhangar.db
docker compose run --rm --user root tabhangar sh -c 'rm -f /data/tabhangar.db-wal /data/tabhangar.db-shm && chown node:node /data/tabhangar.db'
docker compose start tabhangar
```

Devices pick up the restored state on their next sync.

## Updating

```bash
cd /opt/tabhangar
git pull
docker compose --profile caddy up -d --build
```

Database migrations run automatically when the server starts.

## Already running a reverse proxy?

Start only the server (`docker compose up -d`, without `--profile caddy`). It listens on
`127.0.0.1:8787`. Point your proxy at it and make sure server-sent events are not buffered:

- **Caddy on the host** — see [`deploy/Caddyfile.example`](../deploy/Caddyfile.example).
- **nginx**

  ```nginx
  server {
      server_name tabs.example.com;
      location / {
          proxy_pass http://127.0.0.1:8787;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header Host $host;
          proxy_buffering off;          # live sync
          proxy_read_timeout 1h;
      }
      # listen 443 ssl; ssl_certificate … (e.g. from certbot)
  }
  ```

Keep `TRUST_PROXY=true` (set in `docker-compose.yml`) only when a proxy sits in front of the server;
the login rate limit uses the client address it forwards.

## Without Docker

Node.js 22+ and pnpm are enough:

```bash
pnpm install
pnpm --filter @tabhangar/server build
cd apps/server
DATA_DIR=/var/lib/tabhangar ADMIN_USERNAME=me ADMIN_PASSWORD='…' node dist/main.js
```

Run it as a service (systemd, pm2…) and put an HTTPS proxy in front of it.

## Troubleshooting

| Problem                               | What to check                                                                                                    |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| "Can't reach a TabHangar server here" | `curl https://your-domain/health` from your computer; DNS record; ports 80/443 open; `docker compose logs caddy` |
| Certificate errors                    | The domain must resolve to this server before the first start; Caddy retries automatically                       |
| Changes appear only after a minute    | The proxy buffers responses — disable buffering for `/events` (see above)                                        |
| "Too many attempts" when signing in   | Wait 15 minutes, or restart the container to clear the counters                                                  |
| Forgot the password                   | `docker compose exec tabhangar tabhangar reset-password <name>`                                                  |

## What is stored

Accounts (username and a scrypt password hash), active sessions (only a hash of each token), and the
rows your browsers sync: workspaces, categories, groups, links, notes and reminders. Nothing is sent
anywhere else; there is no telemetry.
