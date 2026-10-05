# Self-hosting the sync server

The TabHangar extension works without a server, and the official build syncs through the TabHangar
server. Run your own when you want your boards on hardware you control, for yourself, your family or
anyone you let in. The server is a single small container with an SQLite database; a 1 vCPU /
512 MB VPS is plenty for a household.

What you need:

- a Linux server with [Docker](https://docs.docker.com/engine/install/) and the Compose plugin
- a domain or subdomain pointing at it (an `A`/`AAAA` record, e.g. `tabs.example.com`)
- ports 80 and 443 open (for HTTPS certificates)

## 1. Get the code

```bash
sudo mkdir -p /opt/tabhangar && sudo chown "$USER" /opt/tabhangar
git clone https://github.com/DontAskForAnything/tabcabin.git /opt/tabhangar
cd /opt/tabhangar
```

## 2. Configure

```bash
cp .env.example .env
nano .env
```

| Variable                           | Meaning                                                                          |
| ---------------------------------- | -------------------------------------------------------------------------------- |
| `DOMAIN`                           | Your domain, e.g. `tabs.example.com`                                             |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | First account, created on the first start (remove the password afterwards)       |
| `ALLOW_SIGNUP`                     | `true` lets anyone create an account (password or Google). Default `false`       |
| `SESSION_TTL_DAYS`                 | How long an unused device stays signed in. Default `30`                          |
| `GOOGLE_CLIENT_ID`, `…_SECRET`     | Turn on "Continue with Google" (see [Sign in with Google](#sign-in-with-google)) |
| `SIGNUP_EMAILS`                    | Google addresses that may join while signup is off: `ola@gmail.com,@family.org`  |
| `MAX_USERS`                        | Most accounts the server accepts. Default `0` (no limit)                         |
| `SIGNUPS_PER_IP_PER_DAY`           | New accounts one network may create per day. Default `5`                         |
| `MAX_RECORDS_PER_USER`             | Synced boards, groups, links and notes per account. Default `100000`             |

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

## 4. Build the extension for your server

The sync server is part of the extension build, so nobody has to type an address. Build it with
yours (needs Node 24 and pnpm):

```bash
cd /path/to/tabhangar            # on your computer
echo 'WXT_SYNC_SERVER=https://tabs.example.com' > apps/extension/.env
pnpm install
pnpm --filter @tabcabin/extension build
```

Load `apps/extension/.output/chrome-mv3` in `chrome://extensions` (Developer mode → **Load
unpacked**), or `pnpm zip:ext` for a zip to share with your family.

Then click **Sign in** in the top bar of a new tab. If the browser already has boards and so does the
account, choose **Keep both** or **Use the server's data**. From then on syncing runs by itself:
every change is sent right away and changes from other computers arrive live.

## Sign in with Google

Optional, but nicer for people who don't want another password.

1. Open [Google Cloud Console](https://console.cloud.google.com/) → create a project.
2. **APIs & Services → OAuth consent screen**: user type **External**, app name "TabHangar", your
   support e-mail. Scopes: only `openid`, `email` and `profile` (no verification needed for these).
   Then **Publish app** so it is not limited to test users.
3. **Credentials → Create credentials → OAuth client ID** → type **Web application** → authorized
   redirect URI `https://tabs.example.com/auth/google/callback`.
4. Put the client ID and secret into `.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, then
   `docker compose up -d`.

Who can come in with Google:

- everyone, when `ALLOW_SIGNUP=true`;
- addresses and domains listed in `SIGNUP_EMAILS` (e.g. `ola@gmail.com,@studio.dev`);
- existing users whose address you set: `tabhangar set-email michal michal@gmail.com`. Their
  password keeps working too.

Optionally, set `EXTENSION_IDS` to the id of your extension build (from `chrome://extensions`) so
sign-ins can only be handed to it.

## Limits

A public server needs a few brakes. Sign-ins are rate-limited (20 attempts per 15 minutes per
network, 8 failures per account), each network can create `SIGNUPS_PER_IP_PER_DAY` accounts a day,
`MAX_USERS` caps the total and `MAX_RECORDS_PER_USER` the size of one account. When an account is
full, the extension says so and keeps new things locally until there is room again.

## Managing accounts

The image includes a small command-line tool:

```bash
docker compose exec tabhangar tabhangar list-users
docker compose exec tabhangar tabhangar create-user anna          # asks for a password
docker compose exec tabhangar tabhangar create-user anna --admin
docker compose exec tabhangar tabhangar create-user anna --email anna@gmail.com  # can also use Google
docker compose exec tabhangar tabhangar set-email anna anna@gmail.com           # link Google later
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
pnpm --filter @tabcabin/server build
cd apps/server
DATA_DIR=/var/lib/tabhangar ADMIN_USERNAME=me ADMIN_PASSWORD='…' node dist/main.js
```

Run it as a service (systemd, pm2…) and put an HTTPS proxy in front of it.

## Troubleshooting

| Problem                               | What to check                                                                                                    |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| "Can't reach <your-domain> right now" | `curl https://your-domain/health` from your computer; DNS record; ports 80/443 open; `docker compose logs caddy` |
| Certificate errors                    | The domain must resolve to this server before the first start; Caddy retries automatically                       |
| Changes appear only after a minute    | The proxy buffers responses — disable buffering for `/events` (see above)                                        |
| "Too many attempts" when signing in   | Wait 15 minutes, or restart the container to clear the counters                                                  |
| "This Google account can't join"      | Signup is off: add the address to `SIGNUP_EMAILS` or run `tabhangar set-email <user> <address>`                  |
| Google shows `redirect_uri_mismatch`  | The OAuth client needs exactly `https://<DOMAIN>/auth/google/callback` and `PUBLIC_URL` must match `DOMAIN`      |
| Forgot the password                   | `docker compose exec tabhangar tabhangar reset-password <name>`                                                  |

## What is stored

Accounts (username, a scrypt password hash, and the e-mail and Google account id when Google
sign-in is used), active sessions (only a hash of each token), and the
rows your browsers sync: workspaces, categories, groups, links, notes and reminders. Nothing is sent
anywhere else; there is no telemetry.
