# UI audit 38 — Android i ponowna weryfikacja 32 ustaleń

Data: 5 listopada 2026. Zakres: issue [#38](https://github.com/SenswaveLabs/Mobile/issues/38),
komenda `$impeccable audit`, natywna procedura Android/Operate. Punktem odniesienia
jest [pierwotny audyt](ui-audit.md), szczególnie sekcje 8–10 i 12.3.
Lokalny branch `chore/ui-audit-38-android` powstał z pobranego `origin/next-dev`
`73e1d70bee2a32f4f25e507a2212d8f8bdc08bbe`. Nie używano worktree.

## Werdykt

Przejrzano **32/32 pierwotne ustalenia**, ich poprawki, rzeczywistych callerów i
regresje. Pierwotne mechanizmy błędów są usunięte w źródłach. Nie znaleziono
ponownego wejścia w wycofane warianty UI ani globalne toasty. Natywne próbki
potwierdzają m.in. pionowe dialogi, czytelne read-only operation details,
rozróżnienie pustego Home od błędu oraz dostępne sterowanie roli Display.

Audyt ujawnił **dwa dodatkowe ustalenia P2**, naprawione w tym PR: spóźnione
komunikaty kopiowania zaproszenia oraz retained Retry resetujące stan zapisu lub
zaakceptowanego usunięcia automatyzacji. Nie zmieniono kontraktów API, uprawnień,
zależności, palet ikon ani payloadów.

**32/32 oznacza rozliczenie ustaleń, a nie pełne zaliczenie każdej kombinacji
ekranu, stanu, roli, rozmiaru i TalkBack.** Poniższe ograniczenia pozostają jawne.
Zakres 8 (`$impeccable polish`) i końcowa weryfikacja całej kolejki pozostają
osobnym zadaniem; ten raport nie zamyka ich automatycznie.

| Wymiar Impeccable Native | Ocena | Podstawa i granica |
| --- | ---: | --- |
| Dostępność | 3/4 | Poprawione pary kontrastu, nazwy/statusy, błędy selektorów i skalowanie. TalkBack uruchomiono, ale nie wykonano pełnego odsłuchu i traversal wszystkich nakładek. |
| Wydajność | 3/4 | Główne listy i 318 ikon są wirtualizowane; siatka ma ograniczoną geometrię. Brak benchmarku FPS, pamięci i startupu na sprzęcie. |
| Wygląd i motyw | 4/4 | Jeden aktualny system, wspólne tokeny, neutralne znaczniki operacji i pełny foreground read-only. Kontrast obu palet sprawdzają testy rzeczywistych tokenów. |
| Zgodność Android | 3/4 | Nowy klient natywny, poprawione dialogi/Back/insets i lokalne recovery. Predictive Back oraz wszystkie warianty systemowych pasków nie są zaliczone. |
| Adaptacja | 3/4 | Próbki 320/448/800 dp, oba motywy i tekst do 200%; scroll formularzy i dialogów. Nie wykonano kompletnej macierzy multi-window/foldable. |
| **Łącznie** | **16/20** | **Good w ocenionym zakresie. Ocena ekspercka, nie certyfikacja dostępności ani benchmark.** |

## Poprawki wykonane w tym PR

### N01 — P2 — spóźniony wynik kopiowania zaproszenia przechodził do innej wizyty

`src/app/(app)/home/share.tsx`, `copyToClipboard`: po zaakceptowaniu zaproszenia A
rozpoczęte kopiowanie mogło zakończyć się już po zmianie domu, trasy, roli albo
blur/refocus. Jego odrzucona obietnica dopisywała wtedy błąd do nowego widoku;
sukces również mógł zmienić nieaktualny stan.

Poprawka przechwytuje istniejącą generację wizyty i po `await` ponownie sprawdza
focus, binding oraz generację przed aktualizacją feedbacku. Nie zmienia kodu
zaproszenia ani operacji schowka. `tests/homeSharing.test.mjs` odtworzył błąd
przed zmianą, a po zmianie sprawdza późny sukces/odrzucenie w pięciu przejściach
tożsamości/wizyty oraz zwykłe „Code copied”. To dowód handlera; nie symulowano
natywnej awarii schowka Androida.

### N02 — P2 — stary read Retry kasował blokadę zapisu i accepted deletion

`src/app/(app)/automation/details.tsx`, `load`: callback zachowany z wcześniejszego
błędu odczytu mógł wyczyścić sesję i blokady podczas PATCH/PUT/DELETE, uruchomić
GET i pozwolić na drugą mutację. Po zaakceptowanym DELETE i błędzie nawigacji
ten sam callback kasował accepted oraz zastępował return-only recovery odczytem.

Poprawka odrzuca odczyt dla nieaktualnej trasy, pasującego aktywnego zapisu lub
zaakceptowanego usunięcia. Zmiana A → B nadal może odczytać B podczas zapisu A.
Nowe regresje w `tests/automationDetails.test.mjs` przeszły RED → GREEN: brak
dodatkowego GET i mutacji, zachowany token/pending/accepted, ponowienie wyłącznie
powrotu. Sprawdzono metadata PATCH, state PUT, DELETE, stary callback innej trasy,
retained confirmation i refocus. Nie wymuszano błędu routera na prawdziwym API.

## Rozliczenie A01–A32

`K` oznacza źródła i adekwatne testy handlerów; `R` — wskazaną próbę Androida.
Brak `R` nie jest deklaracją pełnej weryfikacji natywnej. Commity wskazują
wdrożone poprawki sprzed tego PR; obecne uzupełnienia opisano powyżej.

| ID | Poprawka / plik i commit | Ponowna weryfikacja |
| --- | --- | --- |
| A01 | `components/ui/alert-dialog.tsx`, native footer pionowy; `08d4c27`. | K: wszyscy callerzy stopki i shared Button. R: Delete account przy 800 × 1000 dp/Light — obie akcje widoczne, pionowe; anulowano. |
| A02 | `components/common/ConfirmDialog.tsx`, Reusables/Modal/Portal, scroll i insets; `bbdb13a`, `08d4c27`. | K: Device/subscriptions zachowują potwierdzenie. R: Delete Device, 320 × 480 dp/Dark/200%, dostępne Cancel/Delete nad gestem, body scroll; Back anuluje. |
| A03 | `components/room/RoomSelector.tsx`, foreground Create room; `f916be8`. | K: `theme` liczy AA w obu motywach; `roomSelector` zachowuje przejście po dismiss. Osobnej natywnej próbki Create room nie wykonano. |
| A04 | `app/(app)/index.tsx`, wspólny exit dialog nad gałęziami; `8e9d294`. | K: loading/error/empty/filled, Cancel/Exit/blur. R: Back otwiera dialog na kontrolowanym błędzie i potwierdzonym empty; kolejny Back zamyka. |
| A05 | `app/(app)/home/share.tsx`, routed/current owner binding, captured home i accepted przed JSON; `8e9d294`. | K: nazwa/kod/ID, spóźnione odpowiedzi i malformed accepted; N01 dodatkowo chroni kopiowanie. Bez wysyłania prawdziwego zaproszenia. |
| A06 | `useDeviceTileAction`, `DeviceListProvider`, `DisplayDeviceTile`, `DeviceForm`, `WidgetDetailsProvider`, broker details/subscriptions; `8e9d294`, `32e8051`. | K: wszystkie cztery granice z audytu, matching IDs, malformed consumed fields, zachowany cache/draft i lokalne GET-only Retry. Nie podawano uszkodzonych danych do backendu. |
| A07 | `SenswaveModal`/`BottomSheetSelect`, nazwane Close ≥48 dp; stary Clear usunięty; `bbdb13a`, `08d4c27`. | K: geometria i anulowanie; R: bieżący selector oraz Options modal mają aktualną powłokę i Close. |
| A08 | `IconSelector.tsx`, bieżący `useWindowDimensions`, cztery kolumny i FlatList; `bbdb13a`. | K: brak stałej szerokości modułu, 318 kluczy i wirtualizacja. Live resize otwartego katalogu pozostaje bez izolowanego dowodu. |
| A09 | AGENTS/UI/API guide i `iconSelector` mają jedną zasadę sheetów; `bbdb13a`. | K: bez wyjątków legacy/search dla Automation; Dashboard16, Radio15, Automation318 i historical keys zachowane. Odczyt lokalnego API Home22/Device36 dokładnie zgadza się z kolejnością key/labelKey fixture. |
| A10 | `operation/OperationTile.tsx`, neutralne role foreground/surface; `f916be8`. | K: sześć typów i unknown, obie palety oraz compositing disabled; `theme` potwierdza AA. |
| A11 | `operation/OperationForm.tsx`, selectable read-only tekst; `f916be8`. | K: sześć typów, false/0/"0", JSON i brak mutacji. R: matching Number, 320 dp/Dark/200%, Name/Topic czytelne w pełnym foreground. |
| A12 | `contexts/ThemeProvider.tsx`, explicit Light/Dark przed System; `f916be8`. | K: zmiana systemu, restart/persistence, late storage/reset i rejected read. R: zapis przez rzeczywiste API: Light pozostaje jasny przy System Dark, Dark ciemny przy System Light; System wraca do jasnego wraz z systemem. Przywrócono account default. Restart z zapisanym Light/Dark nie był osobną próbą. |
| A13 | ToastProvider i zależności usunięte; `bbdb13a`. | K: invariant źródeł/dependencies, lokalne Result/state; nie naprawiano kolorów wycofanego renderera. |
| A14 | `AddSubscriptionForm.tsx`, growing action w jednym scrollu; `73e1d70`. | K: lifecycle i payload. R: 320 dp/Dark/200%, Topic i czytelna akcja osiągalne nad IME po ręcznym przewijaniu. |
| A15 | `DataSourceForm.tsx`, required po submit także w edit; `32e8051`. | K: osobno puste Name/Server/Client name, widoczny powód blokady bez PATCH; untouched pozostaje spokojne. |
| A16 | `DataSourceDetailsSection.tsx`, wspólny synchroniczny Save/Delete lock; `32e8051`. | K: oba kierunki, retained callbacks, anulowanie, blur i accepted latch. Nie wykonywano równoległych mutacji istniejącego brokera. |
| A17 | broker details/section, retired tabs i return-only recovery; `32e8051`. | K: accepted DELETE/404, direct entry, thrown return, brak ponownego DELETE i wywołań starego overview. |
| A18 | `DataSourceStateGet.tsx`, walidacja znanych stanów; `32e8051`. | K: nieznany status unavailable, Retry odczytuje GET; aktualni callerzy walidują przed badge. |
| A19 | `DataSourceDetailsSection.tsx`, `AlertDialogTrigger asChild` i forwarded ref; `32e8051`. | K: trigger/Cancel/Back. TalkBack włączono; ograniczenie sondy i pełnego dowodu powrotu fokusu opisano niżej. Nie zaliczono samego testu adaptera jako native pass. |
| A20 | `AutomationTile.tsx`, Enabled/Disabled w dostępnej nazwie; `32e8051`. | K: oba statusy, jeden target. R: lokalna filled list udostępnia „Audit automation, Enabled” i „Audit disabled, Disabled”. |
| A21 | oba automation child forms i `BottomSheetSelect`, inline alert oraz scroll/focus; `32e8051`. | K: pierwszy błędny Device/Operation, brak submit i zachowane typed drafts. Pełny natywny odsłuch i focus obu pól pozostają niezaliczone. |
| A22 | `utils/operationLabels.ts`, etykiety powtórzeń i multiline; `73e1d70`. | K: duplikaty nazwy/typu/prefiksu w obu formularzach, zgodna selected label, exact raw IDs/names. Natywne 320 dp/200% obu child selectors potwierdzono w raporcie 37; nie traktuje się tego jako nowej próbki tego PR. |
| A23 | `HomeProvider` i Home, błąd odrębny od empty; `bbdb13a`, `8e9d294`, `32e8051`. | K: JSON/shape/transport, zachowany cache i late reads. R: lokalne 503 daje Retry/Choose home, 404 daje Create/Join. |
| A24 | `app/(app)/device/add.tsx`, ready managed home/focus/payload gate; `32e8051`. | K: Owner/Manage/Display i retained submissions. R: syntetyczna rola Display nie montuje formularza; dashboard nadal pozwala sterować. Pełna natywna macierz ról nie została wykonana. |
| A25 | Create device, accepted przed refresh i lokalny Return; `32e8051`. | K: POST raz, failed refresh/return, refocus i zmiana domu. Bez tworzenia prawdziwego urządzenia. |
| A26 | `common/Expander.tsx`, button i expanded; `32e8051`. | K: collapsed/expanded i zachowany target 48 dp. Wypowiedzi TalkBack nie zaliczono. |
| A27 | `WhatsNewModal.tsx`, bez line caps, aktualny tekst zamiast FAB; `bbdb13a`, `73e1d70`. | K: pełny tekst i niezmieniony version lifecycle. Raport 37 potwierdza 320/448 dp; tutaj nie resetowano wersji w danych konta. |
| A28 | `SenswaveModal.tsx`, bez drugiego KeyboardAvoidingView; `08d4c27`. | K: Options i Radio mają po jednym keyboard-aware scrollu. R: Options modal otwarto przy 448 dp. Próba IME została przerwana przez systemowe UI klienta; nie zaliczono 320 dp/130% ani Radio IME. |
| A29 | automation/details, scroll recovery, Retry primary/Return outline; `73e1d70`. | K: error/missing ID/Retry/return; source hierarchy zgodna. Bieżący native saved detail sprawdzono na fixture, nie wszystkie recovery sizes. |
| A30 | `DataSourceForm.tsx`, gap wewnątrz widocznego layoutu; `73e1d70`. | K: spacer biblioteki nie dostaje gap, create action rośnie, edit bez zmiany. Pomiar 25 dp z raportu 37 nie był ponawiany. |
| A31 | IconSelector, SenswaveModal, ConfirmDialog i helpery mają jeden aktualny render; `bbdb13a`. | K: exact palettes, historical keys, read-only/disabled/cancel; brak starych branchy w audytowanych rodzinach. R: aktualne dialogi, sheet i operation read-only. |
| A32 | root/HTTP/Home bez RootToast/RootSiblingParent i error-driven Keyboard.dismiss; `bbdb13a`. | K: rekurencyjny invariant wszystkich źródeł i zależności, unknown/new paths, HTTP/account/late Home responses. R: lokalne Home/consent/widget recovery. Dev LogBox to odrębne narzędzie klienta. |

Ścieżki w tabeli zaczynają się w `src/`. Aktualny rejestr zawiera 46 tras TSX
bez layoutów (45 ekranów i alias), trzy layouty oraz 134 komponenty TSX.
Nie przenoszono wprost starego licznika 135 po usunięciu Dialog.

## Runtime i poziom dowodu

Zbudowano przez Expo prebuild oraz Gradle `:app:assembleDebug` dla **x86_64**,
zainstalowano i uruchomiono nowy klient `com.develite.senswave.nextdev`,
versionCode **20261107**, versionName **1.1.0**, target SDK 36.
Emulator: `emulator-5554`, Android **17 / API 37**, `sdk_gphone16k_x86_64`.
To świeży build natywny, nie tylko JS na starym APK. Kod JS ładowano przez Metro.

Próbki obejmowały 448 dp Light/Dark przy 100%, 320 × 480 dp Dark przy 200%
oraz 800 × 1000 dp Light przy 100%. Użyto prawdziwego lokalnego API i konta
testowego. Lokalne odpowiedzi kontrolowane służyły do 503/404, roli Display,
consent oraz saved automation i dashboardu z siedmioma rendererami.
Nie są dowodem autoryzacji backendu, dostarczenia MQTT ani działania hardware.

- Consent: poprawny gate z brakującą zgodą, przyjęty lokalny POST, błędny account
  GET, Retry GET i udany account GET/return. Log requestów potwierdził jeden
  przyjęty POST i kolejne wyłącznie GET. Nie zmieniono zgody rzeczywistego konta.
- Home: potwierdzony empty oraz błąd pierwszego odczytu, właściwe działania
  recovery i Back/Cancel w obu gałęziach.
- Dashboard/Display: widoczne Button, Display z zerem, Switch, Slider, Color,
  Radio i Invalid. Zarządzanie ukryte, live Button aktywny; kontrolowane 503 daje
  lokalny snackbar. Porównanie natywnych bounds wszystkich siedmiu rendererów
  przed błędem i podczas niego potwierdziło identyczną geometrię.
- Motyw: na zwykłym API zapisano Light, Dark i System; obrazy potwierdziły jawne
  nadpisanie przeciwnego motywu systemu. Konto przywrócono do `default`/System.
- Saved automation: lokalna filled list z dwoma statusami oraz poprawny detail.
  Nie zapisywano ani nie usuwano automatyzacji backendu.
- TalkBack: usługa rzeczywiście aktywna, sprawdzano native accessibility tree
  i pozycję fokusu. Bez odsłuchu pełnych wypowiedzi i dotykowej traversal.
  Dodatkowo produkcyjny JS i rzeczywista nawigacja klawiaturą potwierdziły powrót Theme → Back → Theme na niezmienionej implementacji. Bezpośrednie `ACTION_ACCESSIBILITY_FOCUS` sondy nie odtwarza historii nawigacji
  TalkBack; wyników takiej sondy nie uznano za dowód usterki A19 ani native pass.
  Eksperymentalne zmiany przywracania fokusu wycofano w całości.

## Rozliczenie otwartych luk z sekcji 8–9

| Obszar pierwotnej luki | Wynik / pozostająca granica |
| --- | --- |
| Consent gate i accepted-once | Uzupełnione natywnie lokalnymi odpowiedziami; Cancel/logout/legal Back nadal mają dowód handlerów, nie pełną native macierz. |
| Saved automations | Uzupełnione filled list/detail na fixture; partial saves, child writes i delete recovery sprawdzono handlerami, także N02. |
| Owner/Manage/Display | Źródła i testy obejmują macierz; native dodatkowo Display live controls i Create denial. Nie przełączano uprawnień prawdziwego konta. |
| Widgety i stabilność błędu | Siedem rendererów i bounds podczas kontrolowanego błędu sprawdzone; nie zaliczono wszystkich retry/scroll offset/late success ani sprzętu. |
| Placement drag/resize/collision/termination | Testy geometrii i retained callbacks zielone. Bieżącego rzeczywistego drag/resize/zapisu nie wykonano. |
| Slider/Switch pending i hardware | Native render oraz testy exact payload/locking/rollback. Nie wysyłano komend do fizycznego urządzenia; drag/release/pending macierz niezaliczona. |
| TalkBack i focus wszystkich nakładek | Częściowo uruchomione; pełny odsłuch/traversal, A19/A21 i wszystkie nested sheets nadal wymagają oddzielnego sprawdzenia. |
| Remove animations i predictive Back | Źródła sprawdzono; ustawień i pełnej animacji gestu nie zaliczono. KeyEvent Back nie jest predictive gesture. |
| Bardzo niskie recovery/multi-window | N02 nie zmienia layoutu. Niskie recovery Home source select, automation parent/children oraz obu broker-child tras nadal wymagają próby z długim komunikatem. |
| Room 64 znaków/200% | Bez nowego natywnego dowodu; nie zgłoszono defektu wyłącznie na podstawie źródła. |
| Wszystkie warianty operation/widget forms | Pełne suite handlerów zielone; native Options i Number/read-only to próbki, nie wszystkie conditional/nested konfiguracje. |
| Krótkie listy widgetów/placement przy 200% | Bez kompletnej bieżącej próby. |
| Subscriptions >300 | Limit kontraktu nieustalony, nadal otwarte ryzyko poza 32 IDs; bez zmiany paginacji w audycie. |
| Nietypowy długi Markdown | Wspólny renderer aktualny; tabele/code blocks/długie linki i ich native errors niezaliczone. |
| Topic w remove-subscription confirmation | Generic warning pozostaje ryzykiem do osobnej próby; nie usuwano istniejących subskrypcji. |
| Autokorekta broker Username/reset entry | Istniejące testy auth/broker zielone; bez nowej pełnej próby natywnego IME tych pól. |
| Publiczne wdrożenie katalogów API | Lokalne API zweryfikowane: Home22/Device36, exact ordered key/labelKey. Nie porównywano prywatnej sesji z publicznym środowiskiem wdrożonym. |
| Release, stare Androidy, tablet/foldable/hardware | Lokalny nowy x86_64 debug i produkcyjny JS export. Bez lokalnego ARM64/release, starszych systemów, fizycznego sprzętu, zawiasu i benchmarku. |

## Kontrole i handoff

Frozen install i hooks wykonano na Node **26.12.1**, pnpm **12.8.1**, Java 17.
Wymagane `pnpm typecheck`, `pnpm lint` i `pnpm test:poc` przeszły; PoC **112/112**.
Pełny zestaw `pnpm exec node --test tests/*.test.mjs`: **692/692**, zero failures,
skips i cancellations. Produkcyjny Android JS export przeszedł; artefakt w `/tmp`.
Przywrócono fizyczny rozmiar 1344 × 2992 px, 480 dpi, tekst 100%, system Light,
TalkBack wyłączony, konto System i oryginalny `.env`. Klient ponownie uruchomiono
z produkcyjnym JS na świeżym Metro 8083; odczyt bundle potwierdza zwykły endpoint
`http://10.0.2.2:7070`, bez adresu proxy. Sondę odinstalowano z emulatora.
Niezależny review obu poprawek i uzupełnienia pending-write nie zgłosił dalszych
uwag; reviewer uruchomił skupione testy **31/31**.

Po testach adapterów i przeglądzie źródeł właściwy dalszy krok to uzupełnienie
oznaczonych prób `$impeccable audit`, następnie osobny `$impeccable polish`.
Nie oznaczać ograniczeń jako naprawionych wyłącznie na podstawie zielonego testu.

PNG/XML, sonda Android, lokalny proxy, logi i plan pozostały w `/tmp`, poza PR.
Jedyny dodany artefakt raportowy to niniejsze podsumowanie. Nie ma zmian produkcji,
merga, wydania ani aktualizacji kontraktu backendu.
