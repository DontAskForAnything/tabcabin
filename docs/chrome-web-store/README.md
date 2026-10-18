# Chrome Web Store submission

Everything needed to publish TabCabin in the
[Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole). The first
version goes in by hand; later ones can be sent from GitHub (see
[Updates from GitHub](#updates-from-github)). Nothing is published automatically.

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

**Item name / title:** TabCabin – Tab Manager, Boards & Notes (Polish: TabCabin – menedżer kart,
tablice i notatki). The store takes it from the manifest name (`extName` in `public/_locales`);
Chrome shows the short name, TabCabin, where space is tight.

**Summary** (max. 132 characters, also the manifest description):

> A calm cabin for your tabs: boards for tabs, links, notes and to-dos in every new tab. Private, works offline.

**Category:** Productivity → Workflow & planning

**Languages:** English, Polish; the listing also in German, Spanish, French, Portuguese (Brazil)
and Japanese (see below)

### Description (English)

```text
TabCabin is a calm cabin for your tabs. Every new tab becomes a quiet set of boards for the things you want to keep: tabs, links, notes and to-dos.

Too many tabs open because closing them feels like losing them? Drag a tab into a group, add a note, set a reminder, close it. It waits for you one new tab away.

ORGANIZE
• Boards with categories and groups — big emoji headers, resizable columns
• Collections view — the same groups as wide panels of link cards
• Notes and to-dos right next to your links, in nine colors
• Stacks — hold one link over another to combine them
• Workspaces for work, home and side projects, empty or from a template

CAPTURE
• Open tabs panel: drag tabs (or whole Chrome tab groups) into a group to save them
• Select several tabs and save them at once, close duplicates
• Save a whole window as one group and close it, then open it again in one click
• Right-click any page, link, image or selected text to save it
• Save popover (Ctrl+Shift+S): add a sticky note, pick the group, set a reminder
• Inbox (Alt+Shift+S): save the page without choosing a group, sort it later
• The toolbar icon shows when the current page is already saved

FIND AND REMEMBER
• Search everything with Ctrl+K: this workspace, all workspaces, open tabs and bookmarks
• Reminders — one-time, weekly or monthly — with desktop notifications
• Undo for every change, and a bin to restore what you deleted

ON ALL YOUR COMPUTERS
• Sign in with Google (or a username and password) and your boards stay in sync between computers
• Changes arrive live; without signing in everything stays in this browser
• Share a group as a read-only link with people who don't use TabCabin

MAKE IT YOURS
• Light and dark theme, compact layout, English and Polish
• Rebindable keyboard shortcuts
• Import from other tab managers, bookmark files or your most visited sites
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
• Osobne przestrzenie na pracę, dom i projekty po godzinach, puste albo z szablonu

ZAPISYWANIE
• Panel otwartych kart: przeciągnij kartę (albo całą grupę kart Chrome) do grupy
• Zaznacz kilka kart i zapisz je naraz, zamknij duplikaty
• Zapisz całe okno jako jedną grupę i zamknij je, a potem otwórz jednym kliknięciem
• Prawy przycisk na stronie, linku, obrazku lub zaznaczonym tekście zapisuje go
• Okienko zapisu (Ctrl+Shift+S): notatka, wybór grupy, przypomnienie
• Skrzynka (Alt+Shift+S): zapisz stronę bez wybierania grupy i posortuj później
• Ikona rozszerzenia pokazuje, że bieżąca strona jest już zapisana

SZUKANIE I PRZYPOMNIENIA
• Szukaj wszystkiego przez Ctrl+K: w tej przestrzeni, we wszystkich, w otwartych kartach i zakładkach
• Przypomnienia jednorazowe, co tydzień lub co miesiąc — z powiadomieniami
• Cofanie każdej zmiany i kosz z przywracaniem

NA WSZYSTKICH KOMPUTERACH
• Zaloguj się przez Google (albo nazwą użytkownika i hasłem), a tablice zostaną zsynchronizowane między komputerami
• Zmiany przychodzą na żywo; bez logowania wszystko zostaje w tej przeglądarce
• Udostępnij grupę jako link tylko do odczytu osobom, które nie używają TabCabin

PO TWOJEMU
• Motyw jasny i ciemny, widok kompaktowy, polski i angielski
• Własne skróty klawiszowe
• Import z innych menedżerów kart, plików zakładek i najczęściej odwiedzanych stron
• Eksport do JSON, pliku zakładek lub CSV

PRYWATNIE
Bez analityki, bez reklam, bez śledzenia. TabCabin nie ma dostępu do odwiedzanych stron, dopóki go na nich nie klikniesz. Tablice opuszczają przeglądarkę tylko wtedy, gdy zalogujesz się do synchronizacji. Kod jest otwarty (MIT).
```

The listing is also in German, Spanish, French, Portuguese (Brazil) and Japanese: the name and
summary come from the manifest (`public/_locales/<lang>`), and the descriptions below go into
**Store listing → language → Add language** in the dashboard. The app itself stays in English and
Polish, and these texts say so.

### Description (German)

```text
TabCabin ist eine ruhige Hütte für deine Tabs. Jeder neue Tab wird zu stillen Boards für alles, was du behalten möchtest: Tabs, Links, Notizen und To-dos.

Zu viele Tabs offen, weil sich Schließen wie Verlieren anfühlt? Zieh einen Tab in eine Gruppe, füg eine Notiz hinzu, stell eine Erinnerung ein und schließ ihn. Er wartet einen neuen Tab entfernt auf dich.

ORDNEN
• Boards mit Kategorien und Gruppen – große Emoji-Überschriften, Spalten in beliebiger Breite
• Sammlungsansicht – dieselben Gruppen als breite Felder mit Link-Karten
• Notizen und To-dos direkt neben deinen Links, in neun Farben
• Stapel – halte einen Link über einen anderen, um sie zu kombinieren
• Arbeitsbereiche für Arbeit, Zuhause und Nebenprojekte, leer oder aus einer Vorlage

SPEICHERN
• Seitenleiste mit offenen Tabs: Tabs (oder ganze Chrome-Tabgruppen) in eine Gruppe ziehen, um sie zu speichern
• Mehrere Tabs auswählen und auf einmal speichern, Duplikate schließen
• Ein ganzes Fenster als eine Gruppe speichern und schließen, später mit einem Klick wieder öffnen
• Rechtsklick auf eine Seite, einen Link, ein Bild oder markierten Text speichert ihn
• Speicherfenster (Strg+Umschalt+S): Notiz hinzufügen, Gruppe wählen, Erinnerung einstellen
• Inbox (Alt+Umschalt+S): die Seite ohne Gruppe speichern und später einsortieren
• Das Symbol in der Symbolleiste zeigt, wenn die aktuelle Seite schon gespeichert ist

FINDEN UND ERINNERN
• Alles mit Strg+K durchsuchen: diesen Arbeitsbereich, alle Arbeitsbereiche, offene Tabs und Lesezeichen
• Erinnerungen – einmalig, wöchentlich oder monatlich – mit Desktop-Benachrichtigungen
• Jede Änderung lässt sich rückgängig machen, Gelöschtes wartet im Papierkorb

AUF ALLEN DEINEN COMPUTERN
• Mit Google (oder Benutzername und Passwort) anmelden, und deine Boards bleiben zwischen deinen Computern synchron
• Änderungen kommen live an; ohne Anmeldung bleibt alles in diesem Browser
• Eine Gruppe als schreibgeschützten Link mit Leuten teilen, die TabCabin nicht nutzen

SO, WIE DU ES MAGST
• Helles und dunkles Design, kompakte Ansicht; Oberfläche auf Englisch oder Polnisch
• Frei belegbare Tastenkürzel
• Import aus anderen Tab-Managern, Lesezeichen-Dateien oder deinen meistbesuchten Seiten
• Export als JSON, Lesezeichen-Datei oder CSV

PRIVAT VON ANFANG AN
Keine Analyse, keine Werbung, kein Tracking. TabCabin hat keinen Zugriff auf die Seiten, die du besuchst, solange du es dort nicht anklickst. Deine Boards verlassen den Browser nur, wenn du dich zur Synchronisierung anmeldest. Der Quellcode ist offen (MIT).
```

### Description (Spanish)

```text
TabCabin es una cabaña tranquila para tus pestañas. Cada pestaña nueva se convierte en un conjunto sereno de tableros para lo que quieres guardar: pestañas, enlaces, notas y tareas.

¿Tienes demasiadas pestañas abiertas porque cerrarlas parece perderlas? Arrastra una pestaña a un grupo, añade una nota, pon un recordatorio y ciérrala. Te espera a una pestaña nueva de distancia.

ORGANIZA
• Tableros con categorías y grupos: grandes encabezados con emoji y columnas del ancho que quieras
• Vista de colecciones: los mismos grupos como paneles anchos con tarjetas de enlaces
• Notas y tareas junto a tus enlaces, en nueve colores
• Pilas: mantén un enlace sobre otro para combinarlos
• Espacios de trabajo para el trabajo, la casa y los proyectos personales, vacíos o a partir de una plantilla

GUARDA
• Panel de pestañas abiertas: arrastra pestañas (o grupos de pestañas de Chrome enteros) a un grupo para guardarlas
• Selecciona varias pestañas y guárdalas a la vez, cierra las duplicadas
• Guarda una ventana entera como un grupo y ciérrala; vuelve a abrirla con un clic
• Haz clic derecho en una página, un enlace, una imagen o un texto seleccionado para guardarlo
• Ventana de guardado (Ctrl+Mayús+S): añade una nota, elige el grupo, pon un recordatorio
• Inbox (Alt+Mayús+S): guarda la página sin elegir grupo y ordénala después
• El icono de la barra de herramientas indica cuándo la página actual ya está guardada

ENCUENTRA Y RECUERDA
• Busca todo con Ctrl+K: este espacio, todos los espacios, las pestañas abiertas y los marcadores
• Recordatorios únicos, semanales o mensuales, con notificaciones de escritorio
• Deshacer para cada cambio y una papelera para recuperar lo que borraste

EN TODOS TUS EQUIPOS
• Inicia sesión con Google (o con usuario y contraseña) y tus tableros se mantienen sincronizados entre tus equipos
• Los cambios llegan en directo; sin iniciar sesión, todo se queda en este navegador
• Comparte un grupo como enlace de solo lectura con personas que no usan TabCabin

A TU MANERA
• Tema claro y oscuro, vista compacta; interfaz en inglés o polaco
• Atajos de teclado personalizables
• Importa desde otros gestores de pestañas, archivos de marcadores o tus sitios más visitados
• Exporta como JSON, archivo de marcadores o CSV

PRIVADO POR DISEÑO
Sin analíticas, sin anuncios, sin rastreo. TabCabin no tiene acceso a las páginas que visitas a menos que hagas clic en él en una de ellas. Tus tableros solo salen del navegador cuando inicias sesión para sincronizar. Es de código abierto (MIT).
```

### Description (French)

```text
TabCabin est une cabane paisible pour vos onglets. Chaque nouvel onglet devient un ensemble calme de tableaux pour tout ce que vous voulez garder : onglets, liens, notes et tâches.

Trop d’onglets ouverts parce que les fermer donne l’impression de les perdre ? Glissez un onglet dans un groupe, ajoutez une note, réglez un rappel, fermez-le. Il vous attend dans un nouvel onglet.

ORGANISER
• Tableaux avec catégories et groupes : grands titres avec emoji, colonnes redimensionnables
• Vue collections : les mêmes groupes en larges panneaux de cartes de liens
• Notes et tâches juste à côté de vos liens, en neuf couleurs
• Piles : maintenez un lien au-dessus d’un autre pour les combiner
• Espaces de travail pour le travail, la maison et les projets perso, vides ou à partir d’un modèle

ENREGISTRER
• Panneau des onglets ouverts : glissez des onglets (ou des groupes d’onglets Chrome entiers) dans un groupe pour les enregistrer
• Sélectionnez plusieurs onglets et enregistrez-les d’un coup, fermez les doublons
• Enregistrez une fenêtre entière comme un seul groupe et fermez-la, puis rouvrez-la en un clic
• Clic droit sur une page, un lien, une image ou un texte sélectionné pour l’enregistrer
• Fenêtre d’enregistrement (Ctrl+Maj+S) : ajoutez une note, choisissez le groupe, réglez un rappel
• Inbox (Alt+Maj+S) : enregistrez la page sans choisir de groupe et triez-la plus tard
• L’icône de la barre d’outils indique quand la page actuelle est déjà enregistrée

RETROUVER ET SE SOUVENIR
• Cherchez tout avec Ctrl+K : cet espace, tous les espaces, les onglets ouverts et les favoris
• Rappels ponctuels, hebdomadaires ou mensuels, avec notifications sur le bureau
• Annulation de chaque modification et une corbeille pour restaurer ce que vous avez supprimé

SUR TOUS VOS ORDINATEURS
• Connectez-vous avec Google (ou un nom d’utilisateur et un mot de passe) et vos tableaux restent synchronisés entre vos ordinateurs
• Les modifications arrivent en direct ; sans connexion, tout reste dans ce navigateur
• Partagez un groupe sous forme de lien en lecture seule avec des personnes qui n’utilisent pas TabCabin

À VOTRE FAÇON
• Thème clair et sombre, affichage compact ; interface en anglais ou en polonais
• Raccourcis clavier personnalisables
• Import depuis d’autres gestionnaires d’onglets, des fichiers de favoris ou vos sites les plus visités
• Export en JSON, fichier de favoris ou CSV

PRIVÉ PAR CONCEPTION
Pas d’analyse, pas de publicité, pas de pistage. TabCabin n’a aucun accès aux pages que vous visitez, sauf si vous cliquez dessus sur l’une d’elles. Vos tableaux ne quittent le navigateur que lorsque vous vous connectez pour les synchroniser. Le code est ouvert (MIT).
```

### Description (Portuguese, Brazil)

```text
TabCabin é uma cabana tranquila para suas abas. Cada nova aba vira um conjunto calmo de quadros para o que você quer guardar: abas, links, notas e tarefas.

Abas demais abertas porque fechá-las parece perdê-las? Arraste uma aba para um grupo, adicione uma nota, defina um lembrete e feche. Ela espera por você a uma nova aba de distância.

ORGANIZE
• Quadros com categorias e grupos: grandes títulos com emoji, colunas redimensionáveis
• Visualização de coleções: os mesmos grupos como painéis largos com cartões de links
• Notas e tarefas ao lado dos seus links, em nove cores
• Pilhas: segure um link sobre outro para combiná-los
• Espaços de trabalho para trabalho, casa e projetos pessoais, vazios ou a partir de um modelo

SALVE
• Painel de abas abertas: arraste abas (ou grupos de abas do Chrome inteiros) para um grupo para salvá-las
• Selecione várias abas e salve todas de uma vez, feche as duplicadas
• Salve uma janela inteira como um grupo e feche-a; depois abra de novo com um clique
• Clique com o botão direito em uma página, link, imagem ou texto selecionado para salvá-lo
• Janela de salvamento (Ctrl+Shift+S): adicione uma nota, escolha o grupo, defina um lembrete
• Inbox (Alt+Shift+S): salve a página sem escolher um grupo e organize depois
• O ícone na barra de ferramentas mostra quando a página atual já está salva

ENCONTRE E LEMBRE
• Pesquise tudo com Ctrl+K: este espaço, todos os espaços, abas abertas e favoritos
• Lembretes únicos, semanais ou mensais, com notificações na área de trabalho
• Desfazer para cada alteração e uma lixeira para recuperar o que você apagou

EM TODOS OS SEUS COMPUTADORES
• Entre com o Google (ou com usuário e senha) e seus quadros ficam sincronizados entre computadores
• As alterações chegam ao vivo; sem entrar, tudo fica neste navegador
• Compartilhe um grupo como link somente leitura com quem não usa o TabCabin

DO SEU JEITO
• Tema claro e escuro, layout compacto; interface em inglês ou polonês
• Atalhos de teclado personalizáveis
• Importe de outros gerenciadores de abas, arquivos de favoritos ou dos sites mais visitados
• Exporte como JSON, arquivo de favoritos ou CSV

PRIVADO DESDE O INÍCIO
Sem análises, sem anúncios, sem rastreamento. O TabCabin não tem acesso às páginas que você visita, a menos que você clique nele em uma delas. Seus quadros só saem do navegador quando você entra para sincronizar. O código é aberto (MIT).
```

### Description (Japanese)

```text
TabCabinは、タブのための静かな小屋です。新しいタブを開くたびに、残しておきたいもの（タブ、リンク、メモ、ToDo）をまとめた落ち着いたボードが表示されます。

閉じると失くしそうで、タブを開いたままにしていませんか？タブをグループにドラッグし、メモを添え、リマインダーを設定して閉じましょう。新しいタブを開けば、いつでもそこにあります。

整理する
• カテゴリーとグループで作るボード：大きな絵文字の見出し、幅を変えられる列
• コレクション表示：同じグループをリンクカードの横長パネルで表示
• リンクのすぐ横にメモとToDo（9色）
• スタック：リンクを別のリンクに重ねてまとめる
• 仕事、家庭、個人プロジェクト用のワークスペース（空から、またはテンプレートから）

保存する
• 開いているタブのパネル：タブ（またはChromeのタブグループ全体）をグループにドラッグして保存
• 複数のタブを選んで一度に保存、重複したタブを閉じる
• ウィンドウ全体を1つのグループとして保存して閉じ、あとでワンクリックで開き直す
• ページ、リンク、画像、選択したテキストを右クリックで保存
• 保存ポップアップ（Ctrl+Shift+S）：メモを追加し、グループを選び、リマインダーを設定
• Inbox（Alt+Shift+S）：グループを選ばずに保存して、あとで整理
• 現在のページが保存済みなら、ツールバーのアイコンでわかります

探す・思い出す
• Ctrl+Kですべてを検索：このワークスペース、すべてのワークスペース、開いているタブ、ブックマーク
• 1回限り・毎週・毎月のリマインダーとデスクトップ通知
• すべての変更を元に戻せて、削除したものはゴミ箱から復元できます

すべてのパソコンで
• Google（またはユーザー名とパスワード）でサインインすると、ボードがパソコン間で同期されます
• 変更はリアルタイムで届きます。サインインしなければ、すべてこのブラウザに残ります
• グループを閲覧専用リンクで、TabCabinを使っていない人とも共有できます

自分好みに
• ライト／ダークテーマ、コンパクト表示。画面の表示言語は英語またはポーランド語です
• キーボードショートカットを変更可能
• 他のタブ管理ツール、ブックマークファイル、よく見るサイトからインポート
• JSON、ブックマークファイル、CSVでエクスポート

プライバシー重視
分析、広告、トラッキングは一切ありません。TabCabinは、あなたがページ上でクリックしない限り、閲覧中のページにアクセスしません。ボードがブラウザの外に出るのは、同期のためにサインインしたときだけです。オープンソース（MIT）です。
```

## Privacy practices tab

### Single purpose

> TabCabin replaces the new tab page with a board where the user saves and organizes tabs, links,
> notes and to-dos, finds them again and, after signing in, keeps them in sync between computers.

### Permission justifications

| Permission                              | Justification                                                                                                                                                                                                                                                                                             |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tabs`                                  | Lists the user's open tabs in the side panel of the board so they can be saved, focused or closed, reads the URL and title of a tab when the user saves it, and counts how many tabs with a page are closed each day for the week view (only the number, no addresses).                                   |
| `tabGroups`                             | Shows Chrome tab groups in the open tabs panel and lets the user save a whole tab group as a group of links.                                                                                                                                                                                              |
| `storage`, `unlimitedStorage`           | Stores the user's boards, notes and settings locally in IndexedDB; collections of saved links can exceed the default quota.                                                                                                                                                                               |
| `contextMenus`                          | Adds "Save page / link / selection / image to TabCabin" to the right-click menu.                                                                                                                                                                                                                          |
| `activeTab`, `scripting`                | After the user clicks the toolbar button, shortcut or context menu, shows the save popover or a confirmation toast on that one page. No host permissions are requested.                                                                                                                                   |
| `favicon`                               | Shows website icons next to saved links using the browser's favicon cache.                                                                                                                                                                                                                                |
| `alarms`                                | Fires the user's reminders at the time they set.                                                                                                                                                                                                                                                          |
| `sidePanel`                             | Lets the user open the board in Chrome's side panel.                                                                                                                                                                                                                                                      |
| `bookmarks` (optional)                  | Requested only when the user searches bookmarks or imports bookmark folders.                                                                                                                                                                                                                              |
| `topSites` (optional)                   | Requested only when the user adds a group of their most visited sites.                                                                                                                                                                                                                                    |
| `notifications` (optional)              | Requested when the user sets a reminder, to show it as a desktop notification.                                                                                                                                                                                                                            |
| `identity` (optional)                   | Requested only when the user chooses "Continue with Google" on the sign-in page, to open Google's sign-in window.                                                                                                                                                                                         |
| `<all_urls>` (optional host permission) | Requested only when the user turns on "Mark links that no longer load" in Settings: the extension sends a HEAD (or GET) request to each saved address about once a week and marks the ones that answer 404/410 or not at all. Results stay on the device; turning the setting off removes the permission. |

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

Use the privacy page of the website, `https://<SITE_URL>/privacy/` — the address you build the site
with (see [../landing.md](../landing.md)).

## Submission checklist

1. Developer account registered (one-time fee) and verified email.
2. **Items → New item** → upload `tabcabin-<version>-chrome.zip` (built with your `WXT_SYNC_SERVER`).
3. **Store listing:** paste the summary and description, upload the icon, screenshots and promo tiles,
   set category and languages; add the Polish description under **Add localized listing**.
4. **Privacy practices:** paste the single purpose and permission justifications, answer "no remote
   code", certify data usage, set the privacy policy URL.
5. **Distribution:** public (or unlisted for a soft launch), all regions.
6. Submit for review. Reviews usually take a few days. The only host permission is optional
   (link checks), which keeps the review simple; expect a question about it.

## Updates from GitHub

After the first version is in the store, the **Chrome Web Store** workflow
([`.github/workflows/store.yml`](../../.github/workflows/store.yml)) builds the zip with your
addresses, uploads it and sends it for review. It runs only when you start it (**Actions → Chrome
Web Store → Run workflow**; untick "Send for review" to leave the upload as a draft). Set it up
once:

1. [Google Cloud Console](https://console.cloud.google.com/): in a project (the one with the Google
   sign-in client is fine) open **APIs & Services → Library**, find **Chrome Web Store API** and
   enable it.
2. **IAM & Admin → Service accounts → Create service account** (e.g. `store-upload`, no roles).
   Open it → **Keys → Add key → Create new key → JSON**. Keep the downloaded file private.
3. Developer Dashboard → **Account** → add the service account's e-mail (`…@….iam.gserviceaccount.com`).
   A publisher can have one service account.
4. GitHub → **Settings → Secrets and variables → Actions**:
   - secret `CWS_SERVICE_ACCOUNT` — the whole content of the JSON key file;
   - variable `CWS_PUBLISHER_ID` — Developer Dashboard → **Publisher → Settings**;
   - variable `CWS_EXTENSION_ID` — the item's id (in the dashboard and in its store address);
   - the `WXT_SYNC_SERVER` and `SITE_URL` variables, as for the Build workflow. The store workflow
     refuses to run without `WXT_SYNC_SERVER`, because the listing describes sync.

For every update, raise `version` in `apps/extension/package.json` (and add the changelog section)
before running it: the store refuses a version it already has. After changing the visibility in
the dashboard (for example from unlisted to public), publish once from the dashboard; until then the
workflow can upload but not publish.
