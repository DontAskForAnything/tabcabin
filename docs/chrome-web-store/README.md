# Chrome Web Store submission

Everything needed to publish TabHangar in the
[Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole). Nothing here is
published automatically.

## Package

```bash
pnpm install
pnpm zip:ext            # → apps/extension/.output/tabhangar-<version>-chrome.zip
```

Upload that zip as the item package. Bump `version` in `apps/extension/package.json` for every new
upload.

## Assets

| Field                               | File                                                       |
| ----------------------------------- | ---------------------------------------------------------- |
| Store icon (128×128, 96×96 artwork) | [`icon-128.png`](icon-128.png)                             |
| Screenshots (1280×800)              | [`screenshots/`](screenshots) — upload in file name order  |
| Small promo tile (440×280)          | [`promo-small-440x280.png`](promo-small-440x280.png)       |
| Marquee promo tile (1400×560)       | [`promo-marquee-1400x560.png`](promo-marquee-1400x560.png) |

Regenerate them with `pnpm --filter @tabhangar/extension store-assets` (needs network access for the
demo favicons).

## Store listing

**Item name:** TabHangar

**Summary** (max. 132 characters):

> Boards for your tabs, links, notes and to-dos in every new tab. Save pages, set reminders, search everything. Local-first.

**Category:** Productivity → Workflow & planning

**Languages:** English, Polish

### Description (English)

```text
TabHangar turns your new tab page into a calm home for everything you want to keep: tabs, links, notes and to-dos, organized in boards.

Too many tabs open because closing them feels like losing them? Drag a tab into a group, add a note, set a reminder, close it. It's one new tab away whenever you need it.

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

MAKE IT YOURS
• Light and dark theme, compact layout, English and Polish
• Rebindable keyboard shortcuts
• Import from a TabHangar backup, a tabExtend JSON export, Chrome bookmark folders or your most visited sites
• Export as JSON, a bookmarks file or CSV

PRIVATE BY DESIGN
Your data stays in your browser. No account, no analytics, no ads. TabHangar has no access to the pages you visit unless you click it on one. It's open source (MIT).

Coming next: optional sync between computers through a server you host yourself.
```

### Description (Polish)

```text
TabHangar zamienia stronę nowej karty w spokojne miejsce na wszystko, co chcesz zachować: karty, linki, notatki i zadania, ułożone na tablicach.

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

PO TWOJEMU
• Motyw jasny i ciemny, widok kompaktowy, polski i angielski
• Własne skróty klawiszowe
• Import z kopii TabHangar, eksportu JSON z tabExtend, folderów zakładek Chrome i najczęściej odwiedzanych stron
• Eksport do JSON, pliku zakładek lub CSV

PRYWATNIE
Dane zostają w Twojej przeglądarce. Bez konta, bez analityki, bez reklam. TabHangar nie ma dostępu do odwiedzanych stron, dopóki go na nich nie klikniesz. Kod jest otwarty (MIT).

Wkrótce: opcjonalna synchronizacja między komputerami przez serwer, który hostujesz sam.
```

## Privacy practices tab

### Single purpose

> TabHangar replaces the new tab page with a board where the user saves and organizes tabs, links,
> notes and to-dos, and finds them again.

### Permission justifications

| Permission                    | Justification                                                                                                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tabs`                        | Lists the user's open tabs in the side panel of the board so they can be saved, focused or closed, and reads the URL and title of a tab when the user saves it.         |
| `tabGroups`                   | Shows Chrome tab groups in the open tabs panel and lets the user save a whole tab group as a group of links.                                                            |
| `storage`, `unlimitedStorage` | Stores the user's boards, notes and settings locally in IndexedDB; collections of saved links can exceed the default quota.                                             |
| `contextMenus`                | Adds "Save page / link / selection / image to TabHangar" to the right-click menu.                                                                                       |
| `activeTab`, `scripting`      | After the user clicks the toolbar button, shortcut or context menu, shows the save popover or a confirmation toast on that one page. No host permissions are requested. |
| `favicon`                     | Shows website icons next to saved links using the browser's favicon cache.                                                                                              |
| `alarms`                      | Fires the user's reminders at the time they set.                                                                                                                        |
| `sidePanel`                   | Lets the user open the board in Chrome's side panel.                                                                                                                    |
| `bookmarks` (optional)        | Requested only when the user searches bookmarks or imports bookmark folders.                                                                                            |
| `topSites` (optional)         | Requested only when the user adds a group of their most visited sites.                                                                                                  |
| `notifications` (optional)    | Requested when the user sets a reminder, to show it as a desktop notification.                                                                                          |

### Remote code

> No, I am not using remote code. All JavaScript is bundled in the package.

### Data usage

Tick **none** of the data types (TabHangar does not collect or transmit user data), then certify:

- [x] I do not sell or transfer user data to third parties, outside of the approved use cases
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes

### Privacy policy URL

Use the privacy page of the landing site, e.g. `https://tabs.example.com/privacy` (replace with the real
domain once the landing page is deployed).

## Submission checklist

1. Developer account registered (one-time fee) and verified email.
2. **Items → New item** → upload `tabhangar-<version>-chrome.zip`.
3. **Store listing:** paste the summary and description, upload the icon, screenshots and promo tiles,
   set category and languages; add the Polish description under **Add localized listing**.
4. **Privacy practices:** paste the single purpose and permission justifications, answer "no remote
   code", certify data usage, set the privacy policy URL.
5. **Distribution:** public (or unlisted for a soft launch), all regions.
6. Submit for review. Reviews usually take a few days; optional permissions and no host permissions
   keep the review simple.
