# Chrome Web Store submission

Everything needed to publish TabCabin in the
[Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole). Nothing here is
published automatically.

## Package

```bash
pnpm install
pnpm zip:ext            # → apps/extension/.output/tabcabin-<version>-chrome.zip
```

Upload that zip as the item package. Bump `version` in `apps/extension/package.json` for every new
upload.

## Assets

| Field                               | File                                                                                    |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| Store icon (128×128, 96×96 artwork) | [`icon-128.png`](icon-128.png)                                                          |
| Screenshots (1280×800)              | [`screenshots/`](screenshots) — upload in file name order                               |
| Small promo tile (440×280)          | [`promo-small-440x280.png`](promo-small-440x280.png)                                    |
| Marquee promo tile (1400×560)       | [`promo-marquee-1400x560.png`](promo-marquee-1400x560.png)                              |
| Promo video (YouTube link)          | upload [`promo.mp4`](../../apps/landing/public/promo.mp4) to YouTube (unlisted is fine) |

Regenerate them with `pnpm --filter @tabcabin/extension store-assets` (needs network access for the
demo favicons). Stills from the promo film for social posts are in [`../promo/`](../promo).

## Store listing

**Item name / title:** TabCabin – Tab Manager, Boards & Notes

**Summary** (max. 132 characters, also the manifest description):

> A calm cabin for your tabs: boards for tabs, links, notes and to-dos in every new tab. Private, works offline.

**Category:** Productivity → Workflow & planning

**Languages:** English, Polish

### Description (English)

```text
TabCabin is a calm cabin for your tabs. Every new tab becomes a quiet set of boards for the things you want to keep: tabs, links, notes and to-dos.

Too many tabs open because closing them feels like losing them? Drag a tab into a group, add a note, set a reminder, close it. It waits for you one new tab away.

ORGANIZE
• Boards with categories and groups — big emoji headers, resizable columns
• Collections view — the same groups as wide panels of link cards
• Notes and to-dos right next to your links, in nine colors
• Stacks — hold one link over another to combine them
• Workspaces for work, home and side projects

CAPTURE
• Open tabs panel: drag tabs (or whole Chrome tab groups) into a group to save them
• Select several tabs and save them at once, close duplicates
• Right-click any page, link, image or selected text to save it
• Save popover (Ctrl+Shift+S): add a sticky note, pick the group, set a reminder
• The toolbar icon shows when the current page is already saved

FIND AND REMEMBER
• Search everything with Ctrl+K: this workspace, all workspaces, open tabs and bookmarks
• Reminders — one-time, weekly or monthly — with desktop notifications
• Undo for every change, and a bin to restore what you deleted

ON ALL YOUR COMPUTERS
• Sign in with Google (or a username and password) and your boards stay in sync between computers
• Changes arrive live; without signing in everything stays in this browser

MAKE IT YOURS
• Light and dark theme, compact layout, English and Polish
• Rebindable keyboard shortcuts
• Import from TabCabin backups, Toby, tabExtend, OneTab lists, bookmark files, Chrome bookmark folders or your most visited sites
• Export as JSON, a bookmarks file or CSV

PRIVATE BY DESIGN
No analytics, no ads, no tracking. TabCabin has no access to the pages you visit unless you click it on one. Your boards leave the browser only when you sign in to sync. It's open source (MIT).
```

### Description (Polish)

```text
TabCabin to spokojny domek dla Twoich kart. Każda nowa karta staje się cichym zestawem tablic na to, co chcesz zachować: karty, linki, notatki i zadania.

Masz otwarte za dużo kart, bo zamknięcie ich to jak ich zgubienie? Przeciągnij kartę do grupy, dodaj notatkę, ustaw przypomnienie i zamknij. Wszystko czeka w nowej karcie.

PORZĄDEK
• Tablice z kategoriami i grupami — duże emoji, kolumny o dowolnej szerokości
• Widok kolekcji — te same grupy jako szerokie panele z kafelkami linków
• Notatki i zadania obok linków, w dziewięciu kolorach
• Stosy — przytrzymaj jeden link nad drugim, żeby je połączyć
• Osobne przestrzenie na pracę, dom i projekty po godzinach

ZAPISYWANIE
• Panel otwartych kart: przeciągnij kartę (albo całą grupę kart Chrome) do grupy
• Zaznacz kilka kart i zapisz je naraz, zamknij duplikaty
• Prawy przycisk na stronie, linku, obrazku lub zaznaczonym tekście zapisuje go
• Okienko zapisu (Ctrl+Shift+S): notatka, wybór grupy, przypomnienie
• Ikona rozszerzenia pokazuje, że bieżąca strona jest już zapisana

SZUKANIE I PRZYPOMNIENIA
• Szukaj wszystkiego przez Ctrl+K: w tej przestrzeni, we wszystkich, w otwartych kartach i zakładkach
• Przypomnienia jednorazowe, co tydzień lub co miesiąc — z powiadomieniami
• Cofanie każdej zmiany i kosz z przywracaniem

NA WSZYSTKICH KOMPUTERACH
• Zaloguj się przez Google (albo nazwą użytkownika i hasłem), a tablice zostaną zsynchronizowane między komputerami
• Zmiany przychodzą na żywo; bez logowania wszystko zostaje w tej przeglądarce

PO TWOJEMU
• Motyw jasny i ciemny, widok kompaktowy, polski i angielski
• Własne skróty klawiszowe
• Import z kopii TabCabin, Toby, tabExtend, list OneTab, plików zakładek, folderów zakładek Chrome i najczęściej odwiedzanych stron
• Eksport do JSON, pliku zakładek lub CSV

PRYWATNIE
Bez analityki, bez reklam, bez śledzenia. TabCabin nie ma dostępu do odwiedzanych stron, dopóki go na nich nie klikniesz. Tablice opuszczają przeglądarkę tylko wtedy, gdy zalogujesz się do synchronizacji. Kod jest otwarty (MIT).
```

## Privacy practices tab

### Single purpose

> TabCabin replaces the new tab page with a board where the user saves and organizes tabs, links,
> notes and to-dos, finds them again and, after signing in, keeps them in sync between computers.

### Permission justifications

| Permission                    | Justification                                                                                                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tabs`                        | Lists the user's open tabs in the side panel of the board so they can be saved, focused or closed, and reads the URL and title of a tab when the user saves it.         |
| `tabGroups`                   | Shows Chrome tab groups in the open tabs panel and lets the user save a whole tab group as a group of links.                                                            |
| `storage`, `unlimitedStorage` | Stores the user's boards, notes and settings locally in IndexedDB; collections of saved links can exceed the default quota.                                             |
| `contextMenus`                | Adds "Save page / link / selection / image to TabCabin" to the right-click menu.                                                                                        |
| `activeTab`, `scripting`      | After the user clicks the toolbar button, shortcut or context menu, shows the save popover or a confirmation toast on that one page. No host permissions are requested. |
| `favicon`                     | Shows website icons next to saved links using the browser's favicon cache.                                                                                              |
| `alarms`                      | Fires the user's reminders at the time they set.                                                                                                                        |
| `sidePanel`                   | Lets the user open the board in Chrome's side panel.                                                                                                                    |
| `bookmarks` (optional)        | Requested only when the user searches bookmarks or imports bookmark folders.                                                                                            |
| `topSites` (optional)         | Requested only when the user adds a group of their most visited sites.                                                                                                  |
| `notifications` (optional)    | Requested when the user sets a reminder, to show it as a desktop notification.                                                                                          |
| `identity` (optional)         | Requested only when the user chooses "Continue with Google" on the sign-in page, to open Google's sign-in window.                                                       |

### Remote code

> No, I am not using remote code. All JavaScript is bundled in the package.

### Data usage

It depends on the build:

- **Built without a sync server** (no `WXT_SYNC_SERVER`): tick **none** of the data types, nothing
  leaves the browser.
- **Built with a sync server:** when a user signs in, their boards (titles and addresses of saved
  pages, notes, reminders) and their account (username, or e-mail with Google sign-in) go to that
  server, only to sync them. Tick **Personally identifiable information** (e-mail address) and
  **Web history** (addresses of saved pages), and describe them as used for the sync feature only.

Then certify:

- [x] I do not sell or transfer user data to third parties, outside of the approved use cases
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes

### Privacy policy URL

Use the privacy page of the website, `https://<SITE_URL>/privacy` — the address you build the site
with (see [../landing.md](../landing.md)).

## Submission checklist

1. Developer account registered (one-time fee) and verified email.
2. **Items → New item** → upload `tabcabin-<version>-chrome.zip` (built with your `WXT_SYNC_SERVER`).
3. **Store listing:** paste the summary and description, upload the icon, screenshots and promo tiles,
   set category and languages; add the Polish description under **Add localized listing**.
4. **Privacy practices:** paste the single purpose and permission justifications, answer "no remote
   code", certify data usage, set the privacy policy URL.
5. **Distribution:** public (or unlisted for a soft launch), all regions.
6. Submit for review. Reviews usually take a few days; optional permissions and no host permissions
   keep the review simple.
