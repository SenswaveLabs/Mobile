# Audyt UI Senswave Mobile — Android

Data: 4–5 listopada 2026, Europe/Warsaw. Zakończenie prób natywnych: 5 listopada, około 00:06 CET. Gałąź: `next-dev`. Badany commit: `14ed8f652dfa9252b3ac5444531346ffa6bdff1d`.

Uzupełnienie z 5 listopada: użytkownik doprecyzował, że **next-dev nie może renderować dawnych wariantów UI z main ani starych globalnych toastów**. Dodano porównanie historii komponentów i palet ikon, pełną macierz bramki toastów oraz analizę instrukcji utrwalających stare UI (sekcja 12). Kod aplikacji nadal nie został zmieniony.

Zakres: cała aplikacja React Native na Androidzie. Wykonano audyt źródeł i próby na emulatorze. Nie zmieniono kodu, konfiguracji, zależności ani dokumentów projektowych; jedynym dodanym plikiem repozytorium jest ten raport. Nie tworzono ani nie usuwano zasobów backendu, nie wysyłano komend MQTT, zaproszeń, wiadomości rejestracyjnych ani resetów hasła. Potwierdzenia usuwania otwierano i anulowano.

## 1. Werdykt i priorytety

**Migracja UI next-dev jest nieukończona i nie spełnia warunku usunięcia starego interfejsu z main.** W aktywnych trasach pozostały trzy rodziny dawnych wariantów: selektor ikon Automation, domyślna powłoka SenswaveModal oraz ConfirmDialog/Dialog. Nadal działa też globalny RootToast na trzech trasach. Wspólna paleta i zmodernizowane formularze nie wystarczają do zaliczenia migracji. Niezależnie potwierdzono błędy dialogów: na szerokim oknie Cancel wypada poza ekran, a przy dużym tekście potwierdzenie usuwania wchodzi pod paski systemowe.

Inwentaryzacja obejmuje **46 tras: 45 ekranów i jeden alias przekierowujący**, wszystkie trzy layouty routingu oraz **135 plików komponentów TSX**. Z komponentów 122 są osiągalne na Androidzie, 12 nie ma osiągalnego użycia, a jeden jest wariantem wyłącznie webowym. Wszystkie uwzględniono w rejestrze, bez zaliczania historycznego, nieużywanego UI do aktywnych defektów.

**Wynik po uzupełnieniu: 32 ustalenia — P0: 0, P1: 8, P2: 22, P3: 2.** Dodane A31/A32 dotyczą niedozwolonego starego UI i toastów. A09 skorygowano: to potwierdzona sprzeczność instrukcji, a wcześniejszy kategoryczny zarzut braku wyszukiwania Home/Device został wycofany. Licznik obejmuje więc 31 ustaleń implementacyjnych i jedno dotyczące polityki. Cztery pokrewne miejsca awarii renderowania ujęto jako jeden problem systemowy A06. Odrębne są naruszenie zasady migracji i konkretne błędy interakcji w tych samych komponentach; ich koszty naprawy nie powinny być sumowane. Ryzyka bez rozstrzygającego dowodu pozostają poza licznikiem.

| Wymiar Impeccable Native | Ocena | Uzasadnienie |
| --- | ---: | --- |
| Dostępność | 2/4 | Kontrast wybranych etykiet, małe starsze akcje Close/Clear, brak części stanów i ogłoszeń. TalkBack nie był uruchamiany. |
| Wydajność UI | 3/4 | Główne katalogi używają FlatList/SectionList; siatka jest ograniczona. Pełny katalog ikon w brand sheet jest renderowany przez map. Bez profilu FPS/pamięci. |
| Wygląd i motyw | 2/4 | Wspólna paleta i formularze, ale aktywne stare warianty UI i RootToast naruszają warunek migracji; dodatkowo znaczniki operacji, read-only pola i obsługa motywu. |
| Zgodność Android | 2/4 | Natywne kontrolki i Back w wielu nakładkach działają; potwierdzone naruszenia insets w dialogu oraz logiczna pułapka Back bez domu. |
| Adaptacja | 2/4 | Dobre ograniczenie formularzy do 448 dp i przewijanie; błędy dialogów na 800 dp i przy 200%, ograniczenia starszych nakładek. |
| **Łącznie** | **11/20** | **Migracja niezaliczona; istotne poprawki przed uznaniem całego UI za zweryfikowane.** |

To ocena ekspercka zakresu dowodów, a nie wynik certyfikacji WCAG, benchmark wydajności ani potwierdzenie wszystkich stanów produkcyjnego APK.

Priorytety: P0 blokuje wykonanie podstawowego zadania; P1 oznacza poważne utrudnienie lub naruszenie kontraktu platformy wymagające poprawki przed wydaniem; P2 ma obejście albo dotyczy spójności, informacji i odzyskiwania; P3 to drobna korekta wykończenia. Waga uwzględnia alternatywny tekst i dostępny Back, a nie samą liczbę wystąpień.

Najpierw dokończyć migrację A31/A32, naprawić A01–A04 i odporność renderowania A06. Następnie tożsamość zaproszenia A05, pozostały kontrast, formularze i lokalne odzyskiwanie. Zachować nowy system komponentów; usunąć aktywne dawne warianty oraz reguły, które je ponownie dopuszczają.

## 2. Metoda, środowisko i granice dowodów

### Źródła odniesienia

Przeczytano AGENTS.md, PRODUCT.md, DESIGN.md, odpowiednie przewodniki repository/interface/tooling/validation, wszystkie trasy i powiązane komponenty, istotne providery, hooki oraz zainstalowane implementacje selektorów, dialogów i obsługi klawiatury. Graf importów sprawdzono od tras i layoutów, a nie przez same podobieństwa nazw.

Zastosowano Impeccable audit native, tryb Operate. Nie używano przeglądarki jako dowodu Androida ani webowego detektora Impeccable.

Uzupełnienie obejmuje lokalne referencje Git: `main` = `9eb767455dd4e1019b54c4da532a278dc09017bc` (8 września), `origin/main` = `4ab119b1334d72ec62824d1ab03743d496e07de0` (23 października). Nie odświeżano refs ani nie zmieniano checkoutu. `git diff main origin/main -- src/components src/contexts/ToastProvider.tsx` jest pusty: dla porównywanych starych implementacji oba punkty odniesienia są zgodne. Samo pochodzenie pliku z main nie dowodzi starego wyglądu; sprawdzano aktualną gałąź renderowania, wariant i callerów.

Punktem odniesienia są także oficjalne [zalecenia Android dotyczące kontrastu i obszaru dotyku](https://developer.android.com/guide/topics/ui/accessibility/apps): dla małego tekstu 4,5:1, dla dużego 3:1 i efektywny target przynajmniej 48 × 48 dp. Android obsługuje [powiększenie tekstu do 200% i skalowanie nieliniowe](https://developer.android.com/about/versions/14/features#font-scaling); ustawienie systemowe nie oznacza prostego mnożenia każdego elementu layoutu.

### Rzeczywisty runtime

Emulator `emulator-5554`, model `sdk_gphone16k_x86_64`, Android **17 / API 37**, nawigacja gestami. Aplikacja: `com.develite.senswave.nextdev`, wersja 1.1.0, development client zainstalowany 19 października 2026, versionCode 20261019, target SDK 36. Bieżący kod JS uruchomiono przez Metro z Node 26.12.1 i pnpm 12.8.1.

**Ważna granica:** bieżący JS działał na istniejącym kliencie natywnym. Nie zbudowano nowego APK. Nie potwierdza to zgodności wszystkich dzisiejszych ustawień natywnych, splash screenu, release ani innych ABI.

| Próba | Rozdzielczość zrzutu / gęstość | Okno w dp | Motyw / tekst |
| --- | --- | --- | --- |
| Telefon bazowy | 1344 × 2992 px / 480 dpi | 448 × około 997 | Light, 100% |
| Małe, krótkie okno | 960 × 1440 px / 480 dpi | 320 × 480 | Dark, 130% |
| Duży tekst | 960 × 1440 px / 480 dpi | 320 × 480 | Dark, 200% |
| Szerokie okno | 800 × 1000 px / 160 dpi | 800 × 1000 | Light, 100% |
| Próba zmiany rozmiaru w działającej sesji | 448 → 320 dp | zmienne | Light; patrz ograniczenie A08 |

Zrzuty wykonano natywnie przez ADB; nazwy i granice kontrolek sprawdzano dodatkowo przez UIAutomator. Zmiany gęstości i rozmiaru symulują klasy okien na jednym emulatorze, nie stanowią testu kilku fizycznych urządzeń.

Sprawdzono przynajmniej jeden renderowany stan **44 z 45 ekranów**, a także alias listy operacji. Część tych prób obejmowała tylko formularz początkowy albo odzyskiwanie po brakującym ID. **Właściwa bramka zgód nie została obejrzana:** istniejące konto ma aktywną zgodę i trasa prawidłowo wraca do aplikacji. Nie zmieniano konta, żeby wymusić ten stan. Osobne braki każdego ekranu wskazuje rejestr w sekcji 8.

Większość prób prywatnych wykonano z istniejącą rolą Owner i rozłączonym źródłem danych. Nie przeprowadzono pełnej natywnej macierzy Owner/Manage/Display. Nie uruchamiano TalkBack, Remove animations, zewnętrznej klawiatury, trybu trzech przycisków, fizycznego foldable ani testu zawiasu/wycięć bocznych.

Przy zmianach konfiguracji emulatora development runtime pokazał przejściowo stare pomiary, pusty widok oraz ostrzeżenie o wielu konfiguracjach linking. Kolejne stabilne próby wykonywano po ponownym uruchomieniu aplikacji. **Nie zaliczono tych przejściowych objawów do potwierdzonych błędów produkcyjnego UI.** Ostrzeżenia LogBox o GPS/SignalR również nie są traktowane jako produkcyjne toasty ani nachodzenie elementów aplikacji.

Po próbach przywrócono 1344 × 2992 px, 480 dpi, font_scale 1.0 i system Light. Emulator pozostawiono na ekranie głównym launchera; uruchomione na potrzeby audytu Metro zatrzymano. Nie czyszczono danych aplikacji.

### Znaczenie statusów

- **K** — przeczytano implementację i sprawdzono użycie; bez gwarancji renderowania.
- **R** — obejrzano bieżący natywny stan na emulatorze; nie oznacza wszystkich stanów.
- **R częściowo** — natywnie sprawdzono wyłącznie wskazaną gałąź/wariant.
- **NIEZWERYFIKOWANE** — dany widok lub aspekt nie został sprawdzony natywnie; powód podany jawnie.

Robocze PNG/XML znajdują się w `/tmp/senswave-ui-audit/`. To lokalne, nietrwałe materiały audytu; raport nie wymaga ich do zrozumienia usterek. Nie dodawano do repozytorium obrazów z danymi istniejącego konta. Nazwy wybranych dowodów podano poniżej. Nie każdy roboczy plik reprezentuje zakończoną nawigację; wnioski odnoszą się do obejrzanej zawartości, nie samej nazwy pliku.

## 3. Zgodność z istniejącym design systemem

Web sprawdzono wyłącznie jako wzorzec marki, w `../next-frontend/apps/web` i używanym `../next-frontend/packages/ui/src/styles/brand.css`. Aktywne layouty web importują globals, brand i theme; nie porównywano mobile z nieużywaną paletą fallback.

| Element systemu | Wynik |
| --- | --- |
| Canvas, foreground, amber/on-amber, muted text i teal focus | Wartości web po konwersji OKLCH → sRGB odpowiadają rolom mobile w ThemeProvider. Przykłady: canvas #F9F7F1/#100D08, foreground #1B1610/#EEEBE5, primary #F7B817/#FBC031. |
| NativeWind i StyleSheet | Root layout mapuje role tego samego ThemeProvider do zmiennych NativeWind. Nie znaleziono drugiej niezależnej palety dla Reusables. |
| Typography | Android system Roboto; body 16/24, label/support 14/20, metadata 12/18, readout 24/32. FormSection 24/32 i ContentSection 20/28 tworzą rozpoznawalną hierarchię. |
| Przyciski i pola | Brand radius 8 dp, przycisk minimum 48 dp, pole około 52 dp. Auth, tworzenie, settings i większość konfiguracji korzystają ze wspólnych wrapperów. |
| Spacing | Typowy rytm pól 24 dp, wprowadzenie 8 dp, oddzielenie dużych sekcji 40 dp; formularze ograniczone do 448 dp. Gutters 24 dp dla auth/create i 16 dp dla wielu details są zamierzoną różnicą. |
| Nagłówki i nawigacja | Brand DefaultHeader w prywatnych trasach, auth header w przewijanej treści, ProfileHeader na Home. Alias operation/list celowo nie ma własnego nagłówka. |
| Motywy statusów | Znane stany DataSource mają tekst i semantyczne kolory obu motywów; brak zależności wyłącznie od koloru. |

Różnice Geist → Roboto, web secondary teal → mobile charcoal, mocniejsze obrysy pól oraz natywne większe targety wynikają z mobile DESIGN.md i UI policy. **Nie są zgłoszeniami brand drift.** Historyczne 16 ikon Dashboard i 15 ikon Radio bez globalnego search są zapisanym ograniczeniem wyboru, a zachowane klucze ikon nie są błędem wizualnym. Porównanie z main wykazało jednak, że stare pełne browsery oferowały szerszy zbiór niż te quick-listy; dokładne różnice opisuje sekcja 12. Nowe pole i bottom sheet muszą być stosowane także w Automation.

## 4. Potwierdzone usterki P1

Lokalizacje odnoszą się do badanego commitu. Skróty `app/`, `contexts/` i `hooks/` zaczynają się w `src/`; skróty `common/`, `ui/`, `home/`, `homeSharing/`, `room/`, `device/`, `dataSource/`, `automations/` i `user/` w tej części oznaczają katalogi pod `src/components/`. Pełne pliki wszystkich tras i komponentów są podlinkowane w rejestrze.

### A01 — P1 — Cancel wypada poza dialog na szerokim Androidzie

- **Miejsce:** `src/components/ui/alert-dialog.tsx:85`, `src/components/common/Button.tsx:108`; przykład `src/components/user/RemoveAccountDialog.tsx:49`.
- **Dowód R:** na oknie 800 × 1000 dp potwierdzenie Delete account układa akcje w jednym rzędzie. Cancel jest przesunięty w lewo poza ekran; UIAutomator widzi tylko obszar x=144–161 px, bez widocznej etykiety. Delete pozostaje pełnej szerokości. Plik `account-dialog-800-final.png`.
- **Przyczyna i wpływ:** `sm:flex-row` wspólnej stopki nadal obowiązuje od 640 dp mimo lokalnego `flex-col`. Dwa przyciski width=100% nie mieszczą się w rzędzie. Anulowanie nie jest czytelne ani łatwo dostępne w krytycznej decyzji. Android Back nadal zamyka dialog.
- **Zasięg K:** podobne użycie w Exit App, delete/leave/unlink Home, Delete room, Delete dashboard, Delete widget, Remove access i Delete automation. Operation details ma już `sm:flex-col`, a source details własne `sm:flex-col-reverse`; nie przypisuje się im automatycznie tego samego błędu.
- **Poprawka:** zachować pionowe akcje na native także powyżej breakpointu, najlepiej w istniejącym wspólnym primitive; sprawdzić wszystkich callerów z pełną szerokością przycisków. Kategoria: adaptacja/bezpieczeństwo decyzji. Kierunek: `$impeccable adapt`.

### A02 — P1 — Starszy Delete Device nie mieści się przy 200% i narusza Safe Area

- **Miejsce:** `src/components/common/Dialog.tsx:91`, `:102`, `:142`, `:173`; `ConfirmDialog.tsx:28`; `src/app/(app)/device/details.tsx:455`. Ten sam wrapper obsługuje usuwanie subskrypcji.
- **Dowód R:** 320 × 480 dp, Dark, 200%. Ikona i górna część dialogu wychodzą pod status bar, przyciski nachodzą na obszar gestu, Delete zawija się i jest obcięte. `delete-device-dialog-320-dark-200.png`.
- **Przyczyna i wpływ:** brak ograniczenia wysokości, scrollowanego body i jawnego uwzględnienia insets; akcje stale poziome. Destrukcyjna decyzja nie ma stabilnego, w pełni czytelnego układu. Back działa jako anulowanie.
- **Poprawka:** zastosować istniejący wzorzec ograniczonego native Modal/AlertDialog: scroll body, dostępne pionowe akcje minimum 48 dp i zachowane insets. Zachować obecne handlery i potwierdzenie. Kategoria: zgodność Android/adaptacja. `$impeccable adapt`.

### A03 — P1 — Create room w jasnym selektorze ma kontrast 1,66:1

- **Miejsce:** `src/components/room/RoomSelector.tsx:133`; tło `src/components/common/BottomSheetSelect.tsx:257`.
- **Dowód K + obliczenie:** #F7B817 na #F9F7F1 daje **1,6579:1**. To mały tekst, wymagający 4,5:1. Dark daje 10,1326:1. Sam selektor obejrzano natywnie; Create room jest niżej w jego przewijanej liście.
- **Wpływ:** akcja staje się bardzo słabo czytelna w Light, choć sąsiednie opcje używają poprawnego foreground.
- **Poprawka:** użyć authForeground dla tekstowej akcji albo amber fill z authOnPrimary; zachować markową paletę. Kategoria: kontrast/theming. `$impeccable colorize`.

### A04 — P1 — Android Back jest konsumowany bez efektu na ekranie bez domu

- **Miejsce:** `src/app/(app)/index.tsx:43`, wczesne return `:60` i `:61`, modal dopiero w gałęzi `:79`.
- **Dowód K + handler:** listener zawsze zwraca true i ustawia showExitDialog. NoHomeScreen/loading zwracane są przed miejscem montowania dialogu. Odtworzenie w istniejącym adapterze potwierdziło Back=true oraz brak Modal.
- **Wpływ:** nowy użytkownik lub użytkownik po utracie ostatniego domu nie może wyjść standardowym Back. Tego stanu nie wymuszano w istniejącym koncie na emulatorze.
- **Poprawka:** przenieść wspólny dialog ponad rozgałęzienia albo przepuścić Back w gałęziach bez dialogu. Kategoria: nawigacja/platforma. `$impeccable harden`.

### A05 — P1 — Kod zaproszenia może być opisany nazwą innego domu

- **Miejsce:** `src/app/(app)/home/share.tsx:48`, `:58`, `:95`, `:118`, `:157`; wejście z `homeSharing/HomeSharingList.tsx:35`.
- **Dowód K + handler:** request używa domu A, ale Invitation przechowuje tylko kod/email/rolę. Po zmianie current home na B i odpowiedzi dla A ekran pokazuje kod A z opisem dołączenia do B. Przekazany route id również nie wiąże strony z domem.
- **Wpływ:** interfejs może skłonić właściciela do udostępnienia dostępu do innego domu niż ten opisany na ekranie. To problem tożsamości zasobu w UI, nie twierdzenie o obejściu autoryzacji backendu.
- **Poprawka:** związać wizytę i submit z home ID, zapisać homeId/homeName w przyjętym zaproszeniu i używać tej tożsamości w success view. Kategoria: nawigacja/komunikacja stanu. `$impeccable harden`.

### A06 — P1 — Cztery odczyty mogą wyłączyć UI zamiast pokazać lokalne Retry

Wspólna wada odporności renderowania. Główne odczyty mają już walidację; poniższe wejścia nadal dopuszczają nieprawidłowe dane do gotowych komponentów.

| Miejsce | Konkretny mechanizm | Skutek i istniejący wzorzec poprawki |
| --- | --- | --- |
| `device/tile/DisplayDeviceTile.tsx:45`, `hooks/useDeviceTileAction.ts:65,99`, `contexts/custom/DeviceListProvider.tsx:116` | JSON rzutowany na Device; tile=null trafia do lokalnego stanu/cache przed sprawdzeniem. | Następny render odczytuje tile.configuration i rzuca. Walidować konsumowane pola i ID przed set/cache, zachować ostatni poprawny stan i lokalny feedback. |
| `device/DeviceForm.tsx:363,445,452` | Preview operacji przyjmuje dowolny truthy JSON; Slider/Options używa konfiguracji bez walidacji. | configuration=null wywraca Device details, zamiast tylko oznaczyć preview jako niedostępne. Sprawdzać matching ID/type i potrzebny range/options przed montażem podglądu. |
| `contexts/custom/WidgetDetailsProvider.tsx:93,127`, `device/widgets/forms/ButtonForm.tsx:30,169` | Reader zatwierdza obiekt configuration, lecz przepuszcza options=[null]. | ButtonForm czyta option.name i rzuca. Walidować używane elementy opcji i konfigurację przed montażem form; użyć istniejącego loadError/Retry. |
| `app/(app)/dataSource/details.tsx:52`, `dataSource/subscriptions/BrokerSubscriptions.tsx:58,214` | Details ufa consumed polom DTO; subscriptions zapisuje content.items bez sprawdzenia tablicy. | items={length:1} powoduje subscriptions.map is not a function. Walidować konsumowane pola, zgodność ID i listę; zachować ekran z lokalnym Retry. |

Ścieżki w tabeli poza `app`, `hooks` i `contexts` są względne do `src/components/`. Pozostałe są względne do `src/`.

**Dowód:** lokalne odtworzenia rzeczywistych providerów/form w istniejącym nativeComponentHarness, bez sieci. Root ponownie uruchomił cztery grupy asercji urządzeń. Przypadek subscriptions potwierdził niezależny audyt tego modułu. Nie wysyłano uszkodzonych danych do działającego backendu. **Nie twierdzi się, że normalne dane aktualnie powodują te wyjątki na emulatorze.**

Kategoria: stany błędu/odporność UI. Poprawić konkretne granice odczytu, bez nowego globalnego frameworka walidacji. `$impeccable harden`.

## 5. Potwierdzone usterki P2

### A07 — Starsze Close i Clear mają zbyt małe obszary dotyku

**Miejsce:** `common/SenswaveModal.tsx:53,113`, `common/IconSelector.tsx:345`. Default modal ma ikonę 28 dp i padding 4 dp: około 36 × 36 dp bez hitSlop; Clear search ma 18 dp + 8 dp na stronę, nominalnie 34 × 34 dp. Dotyczy browsera ikon Automation i What's New. Native XML browsera potwierdza Close około 36 dp; brand modal ma poprawne 48 dp.

**Wpływ/poprawka:** małe zamykanie i czyszczenie jest trudniejsze niż pozostałe akcje aplikacji. Nadać istniejącym triggerom 48 × 48 dp, bez powiększania samych glifów i bez nachodzących hit area. Kategoria: dostępność/ergonomia. `$impeccable adapt`.

### A08 — Starszy browser ikon liczy komórki z szerokości zapisanej przy ładowaniu modułu

**Miejsce:** `common/IconSelector.tsx:39`–`:41`, `:498`. SCREEN_WIDTH i ICON_CELL_SIZE są stałymi z Dimensions.get, podczas gdy brand wariant korzysta z bieżącego useWindowDimensions.

**Wpływ/poprawka:** przy zmianie okna bez przeładowania JS pięć komórek zachowuje dawną szerokość; przy zwężeniu część kolumn może zniknąć poza prawą krawędzią, przy poszerzeniu powstaje pusty obszar. Liczyć geometrię z bieżącej szerokości dostępnego kontenera. **Dowód źródłowy; próba native resize była zakłócona przebudową development runtime i nie jest izolowanym dowodem przyczyny.** Kategoria: adaptacja. `$impeccable adapt`.

### A09 — Sprzeczne instrukcje selektorów utrwalają stary wariant UI

**Miejsce:** `docs/agent-guide/interface.md:464,514,521`; `docs/agent-guide/api-and-data.md:232,242`; `tests/iconSelector.test.mjs:162`.

**Korekta wcześniejszego ustalenia:** brak search w brand Home/Device nie jest sam w sobie potwierdzonym naruszeniem polityki. Wiersz 464 wymaga czterokolumnowego sheetu „without search”, a wiersze 514–515 nadal wymagają quick strip i searchable browser. Pierwsza wersja A09 wybrała tylko drugą z tych reguł; ten zarzut i zalecenie bezwarunkowego dodania search zostały wycofane.

**Dowód K:** ten sam przewodnik nakazuje „Existing icon-selector callers keep the legacy appearance” oraz „Automation retains its existing global browser”. Ostatni nakaz powtarza kontrakt API. Test wprost nazywa zachowanie „legacy Automation selectors retain the global full browser”. To odtwarzalna przyczyna wracania AI do starego selektora, sprzeczna z aktualną instrukcją użytkownika. Wariant `default` w IconSelector i SenswaveModal sprawia, że pominięcie propsa uruchamia dawne UI.

**Wpływ/poprawka:** ujednolicić regułę dla wszystkich tras next-dev, usunąć wyjątki zachowujące stare UI i dopasować testy do nowej prezentacji. Oddzielić zestaw kluczy od sposobu prezentacji: migracja sheetu nie może przypadkowo zmniejszyć palety. Konkretne miejsca i proponowane brzmienie zasad są w sekcji 12. Nie zmieniono instrukcji w ramach tego audytu. Kategoria: spójność systemu/polityka. `$impeccable harden` / `$impeccable document`.

### A10 — Litery typów operacji nie mają kontrastu właściwego dla ich kolorowych teł

**Miejsce:** `device/operation/OperationTile.tsx:32`–`:38`, `:69`; używane przez `device/widgets/WidgetList.tsx:260`. Stałe tła B/N/I/T/HC/O łączą się z globalnym onPrimary zamiast foreground dla badge.

| Typ | Light | Dark |
| --- | ---: | ---: |
| Boolean | 8,184:1 | **1,352:1** |
| Number | **2,893:1** | **3,826:1** |
| Integer | **1,999:1** | 5,538:1 |
| Text | 5,209:1 | **2,125:1** |
| HexColor | **4,223:1** | **2,621:1** |
| Options | **4,072:1** | **2,718:1** |

Obliczenie dla 12 dp tekstu przy 100%, z dokładnych kolorów kodu. Widoczną alternatywą jest pełna nazwa typu w wierszu, co ogranicza wagę do P2. Obejrzano też rzeczywiste listy Number/HexColor w obu motywach. **Poprawka:** neutralny surface/foreground albo kontrastowa para dla każdego tła, minimum 4,5:1. `$impeccable colorize`.

### A11 — Informacje w Operation details są nadmiernie wygaszone

**Miejsce:** `device/operation/OperationForm.tsx:253,285,298`, `common/Input.tsx:80`, `ui/input.tsx:12`.

**Dowód R:** w `operation-details-320-dark-130.png` pełne piksele glifów Name/Topic mają dominująco #545149 na #211D16, około **2,1167:1**. Dla porównania Widget details renderuje read-only wartości jako zwykły, czytelny tekst.

**Wpływ/poprawka:** podstawowym zadaniem strony jest odczyt konfiguracji, a potrzebne wartości wyglądają jak nieaktywne, nieistotne kontrolki. Rozdzielić read-only prezentację od disabled pola, używając istniejącego wzorca summary/NativeText z Widget details. Nie usuwać sygnału disabled dla rzeczywiście niedostępnych działań. Nie deklaruje się tutaj automatycznie naruszenia WCAG dla kontrolki objętej wyjątkiem inactive. `$impeccable typeset`.

### A12 — Jawny wybór Light przegrywa ze zmianą systemu na Dark

**Miejsce:** `contexts/ThemeProvider.tsx:177`–`:190`, zwłaszcza `:181`; korekta konta w `contexts/domain/UserProvider.tsx:91,168,209`.

**Dowód K:** warunek savedTheme==="dark" || colorScheme==="dark" ignoruje zapisane "light". Account GET może skorygować start, ale nie wykonuje się przy każdej zmianie systemowego schematu.

**Wpływ/poprawka:** profil może nadal pokazywać Light, a UI przejdzie na Dark. Najpierw honorować jawne light/dark; korzystać z systemu tylko dla System. Zmiany preferencji konta nie wykonywano w runtime. `$impeccable harden`.

### A13 — ToastProvider widzi stale Light i ma słabe pary kontrastu

**Miejsce:** `src/app/_layout.tsx:87`–`:103`: ToastProvider jest rodzicem ThemeProvider; `contexts/ToastProvider.tsx:90,116,164`.

**Dowód K/obliczenie:** hook przodka dostaje default Light. Przykładowy error tekst #33363F na #B42318 daje **1,8356:1**, info #F5F5F5 na #1E88E5 **3,3744:1**. To odrębna wada od LogBox obserwowanego w dev.

**Wpływ/poprawka:** nadal osiągalne toasty nie podążają za Dark i mogą być nieczytelne. **Docelowa poprawka wynika z A32: wycofać stary globalny overlay na całym next-dev i przenieść potrzebne komunikaty oraz recovery do lokalnych stanów.** Wcześniejsze zalecenie samego przeniesienia providera i poprawienia kolorów nie spełnia doprecyzowanego wymagania. A13 opisuje kontrast/motyw; A32 osobno dokumentuje niedozwoloną obecność i rzeczywisty zasięg. `$impeccable harden`.

### A14 — Add subscription ma inną pozycję primary action niż pozostałe tworzenie

**Miejsce:** `dataSource/subscriptions/AddSubscriptionForm.tsx:141,142,200`; `common/FormSection.tsx:49`.

**Dowód R:** `subscription-add-448-light.png`: akcja leży od razu pod krótkim Topic, a pod nią zostaje większość wysokiej strony. Create home/room/device/dashboard/widget mają rosnący dolny blok.

**Wpływ/poprawka:** narusza jawny wzorzec creation actions z AGENTS.md i utrudnia przewidywanie położenia akcji. Lokalnie nadać formularzowi rosnący układ, pozostawiając action i feedback w tym samym keyboard-aware scrollu. Nie zmieniać domyślnego FormSection dla details. `$impeccable layout`.

### A15 — Wyczyszczenie wymaganego pola brokera blokuje Save bez wyjaśnienia

**Miejsce:** `dataSource/DataSourceForm.tsx:115,126,137,194`.

**Dowód K/handler:** dla pustego Name, Server lub Client name valid=false, lecz required message ustawiany jest tylko poza edit. Z poprawnymi pozostałymi danymi nie ma PATCH ani błędu pola/alertu.

**Wpływ/poprawka:** pozornie działający Save niczego nie zapisuje. Pokazywać required po próbie zapisu także w edit, bez błędów untouched przy pierwszym otwarciu. `$impeccable harden`.

### A16 — Save i Delete tego samego brokera pozostają niezależnie dostępne

**Miejsce:** `dataSource/DataSourceForm.tsx:185,402`; `dataSource/sections/DataSourceDetailsSection.tsx:72,147,163`.

**Dowód K:** osobne loading/pending, bez wspólnej blokady. W trakcie Save nadal można wejść w Delete; po potwierdzonym Delete forma nadal może uruchomić PATCH.

**Wpływ/poprawka:** sprzeczne spinner/disabled/success stany, zapis usuwanego obiektu i nieoczekiwany powrót. Wspólny lokalny guard i stan pending przekazać do obu działań; sprawdzić retained callbacks. Nie wykonywano równoległych prawdziwych mutacji. `$impeccable harden`.

### A17 — Accepted Delete brokera nie ma bezpiecznego zakończenia nawigacji

**Miejsce:** `app/(app)/dataSource/details.tsx:202`; `dataSource/sections/DataSourceDetailsSection.tsx:80,94`.

**Dowód K:** po DELETE tylko router.back(), bez canGoBack/fallback, accepted latch i return-only recovery; blokada następnie opada.

**Wpływ/poprawka:** direct entry może pozostawić ekran usuniętych danych; błąd powrotu może wyglądać jak nieudane usunięcie i pozwolić ponowić DELETE. Zatrzasnąć accepted, wyłączyć formę i pozwolić retryować tylko powrót do listy. Wzorzec jest już w Dashboard/Widget details. `$impeccable harden`.

### A18 — Nieznany status na liście źródeł wygląda jak potwierdzone Disconnected

**Miejsce:** `dataSource/state/DataSourceStateGet.tsx:28,77`; `DataSourceState.tsx:10`; porównanie `dataSource/brokers/BrokerClient.tsx:32`.

**Dowód K:** status reader listy akceptuje każdy string; nieznany trafia do domyślnego Disconnected. Details traktuje taki stan jako unavailable z Retry.

**Wpływ/poprawka:** dwa ekrany komunikują różną pewność połączenia. Sprawdzać znane stany i użyć istniejącego unavailable/Retry dla pozostałych; nie zmieniać etykiet poprawnych NotStarted/Stopped. `$impeccable harden`.

### A19 — Delete data source nie wiąże powrotu fokusu z triggerem

**Miejsce:** `dataSource/sections/DataSourceDetailsSection.tsx:99,163`; dla porównania `user/RemoveAccountDialog.tsx`.

**Dowód K:** otwieranie przez zwykły Button/setState, bez AlertDialogTrigger. W zainstalowanym native primitive przywrócenie accessibility focus jest związane z Trigger; brak lokalnego zastępstwa.

**Wpływ/poprawka:** kod nie zapewnia powrotu do właściwego miejsca po Cancel/Back, inaczej niż profil. Użyć istniejącego AlertDialogTrigger asChild i ref wspólnego Button. **Rzeczywistej wypowiedzi i pozycji TalkBack nie sprawdzono; nie twierdzi się, że system nigdy sam nie przywróci fokusu.** `$impeccable harden`.

### A20 — Lista automatyzacji nie przekazuje Enabled/Disabled w accessible name

**Miejsce:** `automations/AutomationTile.tsx:44`–`:69`; `common/ListRow.tsx:83`–`:94`.

**Dowód K:** grouped Pressable ma jawny label z samą nazwą, bez widocznego statusu w value/state/hint. Istniejący test potwierdza właśnie taki label.

**Wpływ/poprawka:** odczyt dostępnej nazwy nie zawiera informacji pokazanej wzrokowo. Dołączyć status do label lub accessibilityValue, zachować jeden target. TalkBack runtime pozostaje nieweryfikowany. `$impeccable harden`.

### A21 — Walidacja Device/Operation w child forms nie ogłasza błędu ani nie prowadzi do pola

**Miejsce:** `automations/conditions/AutomationConditionForm.tsx:191,310,378`; `automations/results/AutomationResultForm.tsx:165,223,291`.

**Dowód K:** brak wyboru tylko wstawia zwykły Text; brak live region/alert, hint selektora i focus/scroll pierwszego błędu. Common Input i HomeForm mają już odpowiednie wzorce.

**Wpływ/poprawka:** Add na dole długiej strony nie daje czytelnego powodu zatrzymania, zwłaszcza z dużym tekstem i TalkBack. Zachować inline feedback, dodać istniejącą semantykę oraz przejście do pierwszego błędnego wyboru. `$impeccable harden`.

### A22 — Operacje o tej samej nazwie są nierozróżnialne w selektorach automatyzacji

**Miejsce:** `AutomationConditionForm.tsx:277`–`:284`; `AutomationResultForm.tsx:198`–`:205`; dozwolony przypadek w `tests/automationChildren.test.mjs:671`.

**Dowód K:** różne IDs są poprawnie zachowane, ale opcje i selected value mają tylko name. Także dwie operacje tego samego typu mogą mieć identyczną nazwę.

**Wpływ/poprawka:** człowiek może wskazać niewłaściwy warunek lub wynik. Tylko przy kolizjach nazw dołączyć krótkie istniejące dane identyfikujące operację, także do accessible name i potwierdzenia wyboru. Nie zmieniać IDs/wartości. `$impeccable clarify`.

### A23 — Błąd początkowego odczytu domu wygląda jak prawidłowy pusty stan

**Miejsce:** `app/(app)/index.tsx:60`–`:71`; `home/NoHomeScreen.tsx:54`; `contexts/domain/HomeProvider.tsx:194`–`:220`.

**Dowód K:** brak trwałego rozróżnienia read failure od rzeczywistego braku domu po zakończeniu loading. NoHomeScreen proponuje Create/Join, ponowny odczyt jest dostępny przez pull refresh.

**Wpływ/poprawka:** istniejący użytkownik dostaje onboarding zamiast wyjaśnienia awarii. Oddzielić error od empty; zachować jawne lokalne Retry/Choose home obok Create/Join. Nie wywoływano awarii sieci istniejącego konta. `$impeccable harden`.

### A24 — Direct entry Create device pokazuje formularz także roli Display

**Miejsce:** `app/(app)/device/add.tsx:8,30,54`; prawidłowo ograniczone wejście Home `app/(app)/index.tsx:136`.

**Dowód K/handler:** trasa nie czyta current home/loading/role i zawsze montuje DeviceForm z aktywnym POST. Odtworzenie z kontekstem Display nadal wywołuje handler.

**Wpływ/poprawka:** użytkownik może wejść w niedozwoloną konfigurację i dopiero na końcu otrzymać błąd. Nie jest to dowód obejścia backendu; przy odpowiedzi 403 istnieje dodatkowo globalny logout. Użyć gate i ponownego sprawdzenia role/home/focus jak w pozostałych create routes. `$impeccable harden`.

### A25 — Po accepted Create device błąd powrotu zostawia niedziałające Create

**Miejsce:** `app/(app)/device/add.tsx:15,31,39,46`; `device/DeviceForm.tsx:319,788`.

**Dowód K/handler:** accepted ustawia created=true, wyjątek routera wraca jako error formy i odblokowuje Create. Kolejny submit nic nie robi: ani POST, ani ponowny powrót. Refocus nie zastępuje lokalnego recovery.

**Wpływ/poprawka:** UI sugeruje błąd tworzenia mimo istniejącego urządzenia. Pokazać Device created + Return; retryować tylko nawigację, zgodnie z AddDashboardForm/AddWidgetForm. `$impeccable harden`.

### A26 — Tile/Presence disclosure nie wystawia stanu expanded

**Miejsce:** `common/Expander.tsx:63`; `device/DeviceForm.tsx:508,711`.

**Dowód K:** 48 dp target jest poprawny, lecz brakuje button role i accessibilityState.expanded; stan przedstawia obrócony chevron.

**Wpływ/poprawka:** API dostępności nie komunikuje, czy sekcja jest rozwinięta. Uzupełnić semantykę istniejącego triggera, bez nowego przycisku i bez zmiany układu. `$impeccable harden`.

### A27 — What's New ucina treść mimo przewijanego kontenera

**Miejsce:** `common/WhatsNewModal.tsx:91`–`:95`, długi opis Save on User Action `:67`.

**Dowód K:** tytuły mają limit jednej linii, opisy trzech, bez rozwijania. Długi opis nie mieści się w trzech liniach na małym oknie; powiększenie tekstu pogłębia utratę informacji. Samo przewijanie listy nie ujawnia obciętej części.

**Wpływ/poprawka:** użytkownik nie odczyta całego opisu. Pozwolić tekstowi rosnąć w istniejącym scrollu. Dodatkowo zaktualizować wpis o FAB: komponent nie jest obecnie osiągalny z tras. **Nakładki nie wymuszano natywnie przez zmianę zapisanego numeru wersji.** `$impeccable typeset`.

### A28 — Modal opcji częściowo obcina skupione pole po otwarciu IME

**Miejsce:** `common/SenswaveModal.tsx:91`–`:93` oraz `device/operation/forms/Options/OptionsOperationFormModal.tsx:87`; analogiczna struktura w `device/widgets/forms/Radio/RadioOptionFormModal.tsx:101`.

**Dowód R/K:** `option-modal-ime-320-dark-130.png`: po skupieniu Option name przy 320 × 480 dp/130% widoczna część pola ma tylko około 36 dp, kończąc się na y=519 px; IME zaczyna się niżej, około y=591 px. Viewport został mocno ściśnięty. Wrapper KeyboardAvoidingView otacza kolejny KeyboardAwareScrollView.

**Wpływ/poprawka:** automatyczne odsłonięcie fokusu nie pokazuje całej kontrolki. Rozdzielić odpowiedzialność za unikanie IME i zostawić jeden mechanizm dla tej formy; sprawdzić pełne pole i dolne Add podczas przewijania. Nie deklaruje się, że Add jest zawsze nieosiągalne; jego reachability w tej konfiguracji pozostaje nieweryfikowane. Radio modal wymaga osobnej próby. `$impeccable adapt`.

## 6. P3 — drobne niespójności

### A29 — Dwie równorzędne primary actions w błędzie Automation details

**Miejsce:** `app/(app)/automation/details.tsx:572`–`:583`. Przy błędzie odczytu Retry oraz Return to automations mają ten sam amber fill. W innych recovery widokach powrót jest przeważnie outline.

**Wpływ/poprawka:** słabsza hierarchia, bez blokady zadania. Zachować Retry jako primary, Return jako brand-outline/ghost. Potwierdzone w kodzie; natywnie obejrzano gałąź brakującego ID, która ma tylko Return, więc nie jest dowodem tego konkretnego układu. `$impeccable polish`.

### A30 — Create data source dodaje gap także przed technicznym spacerem klawiatury

**Miejsce:** `dataSource/DataSourceForm.tsx:477`–`:485`; zainstalowany `node_modules/react-native-keyboard-controller/src/components/KeyboardAwareScrollView/index.tsx:428`.

**Dowód K:** gap=24 na contentContainerStyle obejmuje także dopisane przez bibliotekę końcowe View. **Wpływ/poprawka:** dodatkowy odstęp pod action, niejednolity z auth/settings; przenieść gap na widoczną zawartość, zachowując scroll spacer i dolny padding. Różnicy pikselowej nie mierzono. `$impeccable layout`.

## 7. Wzorce systemowe i elementy działające poprawnie

Problemy grupują się w czterech miejscach: nieukończona migracja wariantów i globalnego feedbacku, starsze wspólne nakładki, wyjątkowe wejścia danych do renderu oraz odzyskiwanie po accepted mutation. To uzasadnia dokończenie istniejącego nowego systemu i poprawki konkretnych granic, bez wprowadzania kolejnego systemu komponentów.

Warto zachować:

- Jeden motyw i wspólne tło z poprawnymi ikonami status bara w obejrzanych Light/Dark. Podstawowe formularze nie wchodzą pod pasek statusu ani obszar gestu.
- Brand FormSection/ContentSection, jednakowe pola, pełne label podczas spinnera, lokalne błędy i named 48 dp akcje. Mała ikona nie oznacza małego targetu.
- Szerokość 448 dp formularzy także na 800 dp; profil nie rozciąga tekstu przez całe szerokie okno.
- Home Code Input przechodzi na dwa rzędy po cztery pola w małym oknie; nie próbuje ścisnąć ośmiu targetów do jednego rzędu.
- Tabs źródła zachowują drafts i ukrywają nieaktywny panel przed accessibility. Etykiety, endpointy i tematy subskrypcji zawijają się.
- BottomSheetSelect ma nazwane Close, radio/selected state, dolny inset i jawne ReduceMotion.System. Na 320 dp/130% lista typów operacji daje się przewinąć do Options.
- Wybór widgetu i placement preview nie wymagają wykonania komendy urządzenia; pusta siatka pozostaje widoczna.
- Mapa natywna załadowała kafelki, pokazuje attribution, reaguje na pan; Back anulował wybór bez zapisu. Zmiana koloru gestem aktualizowała draft (#000000 → #802f2f), a Cancel zachował poprzednią konfigurację.
- Alias operation/list prawidłowo wrócił do widget/list z tym samym device ID; brak jego własnego nagłówka jest prawidłowy.

Nie zgłoszono samego braku Material You, własnych ikon, brand radius czy webowej rodziny fontu jako błędów Androida: produkt jawnie określa swoją paletę i native visual language.

## 8. Pełny rejestr ekranów, nakładek i komponentów

Poniższa inwentaryzacja jest częścią audytu; status R zawsze oznacza tylko opisany zakres. Brak dodatkowego lokalnego ustalenia nie oznacza, że niewymuszone stany tego ekranu zostały zaliczone.

### 8.1. Wszystkie trasy — 45 ekranów i alias

K dotyczy wszystkich wierszy. Nazwy parametrów i pełne warunki pozostają w podlinkowanych plikach.

| ID | Trasa i źródło | Stany przeczytane w kodzie | Faktyczny runtime i brakujące dowody |
| --- | --- | --- | --- |
| S01 | `/start` — [app/(auth)/start.tsx](../src/app/%28auth%29/start.tsx) | Welcome, przejście do login/register/server. | R: początkowy welcome 320/Dark/130%; dolne akcje nie były osobno ćwiczone. |
| S02 | `/login` — [app/(auth)/login.tsx](../src/app/%28auth%29/login.tsx) | Pola, password visibility, Remember, Google, walidacja, pending/error, email unconfirmed/resend. | R częściowo: formularz i IME 320/Dark/130%. Login/Google/resend i wszystkie odpowiedzi serwera NIEZWERYFIKOWANE. |
| S03 | `/register` — [app/(auth)/register.tsx](../src/app/%28auth%29/register.tsx) | Pola, zgody, legal links, pending/error, registered/sent-email. | R częściowo: pusty formularz 320/Dark/130%. Rejestracja, wysyłka i success NIEZWERYFIKOWANE. |
| S04 | `/forgotPassword` — [app/(auth)/forgotPassword.tsx](../src/app/%28auth%29/forgotPassword.tsx) | Email, walidacja, send/reset destination, inline failure. | R częściowo: formularz 320/Dark/130%. Wysyłka i odpowiedzi NIEZWERYFIKOWANE. |
| S05 | `/server` — [app/(auth)/server.tsx](../src/app/%28auth%29/server.tsx) | Development URL, walidacja i zapis, recovery. | R częściowo: formularz 320/Dark/130%. Nie zapisano URL; production visibility tylko K. |
| S06 | `/confirmEmail` — [app/confirmEmail.tsx](../src/app/confirmEmail.tsx) | Invalid/missing/repeated params, verifying, success, request failure/Retry, Sign in. | R częściowo: brak parametrów, 320/Dark/130%. Poprawny link, success i retained Retry NIEZWERYFIKOWANE. |
| S07 | `/resetPassword` — [app/resetPassword.tsx](../src/app/resetPassword.tsx) | Code/New/Confirm password, field validation, pending/error/success, Back. | R częściowo: formularz bez poprawnego linku, 320/Dark/130%. Reset konta i accepted success NIEZWERYFIKOWANE. |
| S08 | `/consents` — [app/consents.tsx](../src/app/consents.tsx) | Checking/read error, needs-consent, submitting, verifying, accepted/return recovery, logout Back. | NIEZWERYFIKOWANY właściwy widok bramki: konto ma aktywną zgodę. Sprawdzono tylko redirect do Home; bez POST. |
| S09 | `/maintenance` — [app/maintenance.tsx](../src/app/maintenance.tsx) | Service/update message, initialization/pending, Retry/pull refresh, current-session navigation. | R częściowo: widok 320/Dark/130%. Retry nie wywoływano; rzeczywista awaria backendu NIEZWERYFIKOWANA. |
| S10 | `/privacy` — [app/privacy.tsx](../src/app/privacy.tsx) | Public Privacy, loading/error/Retry, version/summary/content, Back/start fallback. | R: poprawny dokument 320/Dark/130%. Failure, długie tabele/code i empty-history fallback NIEZWERYFIKOWANE. |
| S11 | `/terms` — [app/terms.tsx](../src/app/terms.tsx) | Public Terms, loading/error/Retry, version/summary/content, Back/start fallback. | R: poprawny dokument 320/Dark/130%. Nietypowe Markdown i błędy sieci NIEZWERYFIKOWANE. |
| S12 | `/` — [app/(app)/index.tsx](../src/app/%28app%29/index.tsx) | Home/source states, urządzenia/list/grid, pokoje, refresh, NoHome, Exit, What is new. | R częściowo: Owner z disconnected source, grid Switch/Display/Slider, 448/Light oraz 800/Light i 320/Dark/200%. Empty/loading/role matrix/Exit/What is new NIEZWERYFIKOWANE natywnie. A04/A06/A23/A27/A31/A32. |
| S13 | `/home/list` — [app/(app)/home/list.tsx](../src/app/%28app%29/home/list.tsx) | Current/other homes, empty/loading/cache/error/Retry, row pending/failure, Create/Join. | R częściowo: poprawna lista 448/Light. Przełączenia current i recovery NIEZWERYFIKOWANE; nie zmieniano wybranego domu. |
| S14 | `/home/add` — [app/(app)/home/add.tsx](../src/app/%28app%29/home/add.tsx) | Create, name/catalog/location validation, pending/failure/accepted-first-home recovery. | R częściowo: formularz 448/Light. Bez create/GPS; mapa i sheet współdzielone obejrzane osobno. |
| S15 | `/home/details` — [app/(app)/home/details.tsx](../src/app/%28app%29/home/details.tsx) | Owner/Manage edit, Display read-only, rooms/source/sharing read recovery, save/delete/leave/unlink confirmations. | R częściowo: Owner details/rooms/map 448/Light. Save, Remove/Leave/Unlink i inne role NIEZWERYFIKOWANE; A01/A12/A23 pośrednio. |
| S16 | `/home/join` — [app/(app)/home/join.tsx](../src/app/%28app%29/home/join.tsx) | 8-cell OTP, paste/autofill/Backspace, validation, pending/error/accepted return. | R częściowo: idle 448/Light oraz dwa rzędy OTP 320/Dark/130%. Nie wysłano kodu; błędne i accepted Join NIEZWERYFIKOWANE. |
| S17 | `/home/share` — [app/(app)/home/share.tsx](../src/app/%28app%29/home/share.tsx) | Email i role, create/failure, accepted code, copy/success/failure, Done. | R częściowo: formularz 320/Dark/130%. Success/copy/mutation NIEZWERYFIKOWANE; A05 potwierdzone handlerem; pośrednie globalne błędy mogą pokazać toast A32. |
| S18 | `/home/room/add` — [app/(app)/home/room/add.tsx](../src/app/%28app%29/home/room/add.tsx) | Name validation, permission/loading guard, pending/failure/accepted return. | R częściowo: formularz 448/Light. Nie tworzono pokoju; dalsze stany K. |
| S19 | `/home/room/details` — [app/(app)/home/room/details.tsx](../src/app/%28app%29/home/room/details.tsx) | Read loading/error, dirty/save, Delete/cancel/accepted recovery, membership/permission. | R częściowo: poprawny formularz 448/Light. Delete i Save NIEZWERYFIKOWANE; A01 dotyczy wspólnej stopki. |
| S20 | `/home/dataSource/select` — [app/(app)/home/dataSource/select.tsx](../src/app/%28app%29/home/dataSource/select.tsx) | Routed/current home match/owner, assigned/missing, catalog/error/empty, pending/accepted/Retry-only return. | R częściowo: recovery brakującego homeId 448/Light. Sam picker dla niepołączonego domu i PUT NIEZWERYFIKOWANE. |
| S21 | `/dataSource/list` — [app/(app)/dataSource/list.tsx](../src/app/%28app%29/dataSource/list.tsx) | Full account catalog, header Add, loading/error/cache/empty, row status/retry. | R częściowo: lista disconnected 448/Light i 320/Dark/130%. Failed reads/empty/status retry NIEZWERYFIKOWANE; A18. |
| S22 | `/dataSource/add` — [app/(app)/dataSource/add.tsx](../src/app/%28app%29/dataSource/add.tsx) | Broker fields, TLS/MQTT sheets, credentials, validation, pending/error/accepted return. | R częściowo: długa forma 448/Light. Nie tworzono brokera; IME/accepted failure wszystkich pól NIEZWERYFIKOWANE; A30. |
| S23 | `/dataSource/details` — [app/(app)/dataSource/details.tsx](../src/app/%28app%29/dataSource/details.tsx) | Overview/Settings, status/client/read recovery, subscriptions, draft/save/delete/confirmation. | R częściowo: oba panele i lista 448/Light. Stop/Restart/Delete/Save NIEZWERYFIKOWANE; A06/A15–A19/A31/A32. |
| S24 | `/dataSource/brokers/startBrokerClient` — [app/(app)/dataSource/brokers/startBrokerClient.tsx](../src/app/%28app%29/dataSource/brokers/startBrokerClient.tsx) | Saved credential restore, Remember, validation, pending/error/accepted return; no broker recovery. | R częściowo: pusty formularz 448/Light. Nie uruchomiono klienta ani zapisu credentials; restoration/pending NIEZWERYFIKOWANE. |
| S25 | `/dataSource/brokers/addSubscription` — [app/(app)/dataSource/brokers/addSubscription.tsx](../src/app/%28app%29/dataSource/brokers/addSubscription.tsx) | Topic validation, pending/error/accepted return; no broker recovery. | R częściowo: formularz 448/Light oraz brak brokerId 320/Dark/200%. Nie dodawano topic; A14. |
| S26 | `/device/add` — [app/(app)/device/add.tsx](../src/app/%28app%29/device/add.tsx) | Name/backend icon/Room, validation, pending/error/accepted create. | R częściowo: formularz i sheets 448/Light. Role/accepted navigation sprawdzone handlerami, bez POST runtime; A24/A25. |
| S27 | `/device/details` — [app/(app)/device/details.tsx](../src/app/%28app%29/device/details.tsx) | Bound validated read, Tile/Presence/operation choices/preview, save/reset, widgets link, delete recovery. | R częściowo: dane i collapsed sekcje 448/Light i 320/Dark/200%, Delete/cancel z dużym tekstem. Warianty edycji/preview i zapisy NIEZWERYFIKOWANE; A02/A06/A26. |
| S28 | `/device/device` — [app/(app)/device/device.tsx](../src/app/%28app%29/device/device.tsx) | Routed device/dashboard selection, loading/error/empty/offline, grid, scoped command error, manager controls. | R częściowo: poprawny device + pusty grid 448/Light. Live widget controls, offline, failure/snackbar oraz Display rola NIEZWERYFIKOWANE. |
| S29 | `/device/dashboard/add` — [app/(app)/device/dashboard/add.tsx](../src/app/%28app%29/device/dashboard/add.tsx) | Name/16 icons/strict Rows-Columns, validation, pending/error/accepted return. | R częściowo: formularz 448/Light. Nie tworzono dashboardu, ikony read K; walidacja i recovery native NIEZWERYFIKOWANE. |
| S30 | `/device/dashboard/details` — [app/(app)/device/dashboard/details.tsx](../src/app/%28app%29/device/dashboard/details.tsx) | Name/icon edit, fixed grid summary, dirty/save, delete confirmation/accepted recovery. | R częściowo: forma poprawnego dashboardu 448/Light. Bez Save/Delete; A01 wspólnej stopki. |
| S31 | `/device/dashboard/placeWidget` — [app/(app)/device/dashboard/placeWidget.tsx](../src/app/%28app%29/device/dashboard/placeWidget.tsx) | Picker, unavailable/used widgets, position preview, move/resize/collision/pending/error/accepted return. | R częściowo: wybór i neutralny preview 448/Light. Nie zapisano placement; drag/resize/collision i snackbar NIEZWERYFIKOWANE natywnie. |
| S32 | `/device/operation/add` — [app/(app)/device/operation/add.tsx](../src/app/%28app%29/device/operation/add.tsx) | 6 operation types, mapping/JSON, save-on-action, Boolean/numeric/options subforms, validation/accepted return. | R częściowo: Boolean forma 448/Light, typy i Options/add-option modal z IME 320/Dark/130%. Pozostałe warianty pełnych pól i POST NIEZWERYFIKOWANE; A28. |
| S33 | `/device/operation/details` — [app/(app)/device/operation/details.tsx](../src/app/%28app%29/device/operation/details.tsx) | Validated matching read-only operation, membership/full catalog, delete/retry/accepted-read recovery. | R częściowo: poprawna Number operacja 320/Dark/130%. Delete i inne typy NIEZWERYFIKOWANE; A11. |
| S34 | `/device/operation/list` — [app/(app)/device/operation/list.tsx](../src/app/%28app%29/device/operation/list.tsx) | Alias kompatybilności; Loading i replace do widget/list z poprawnym ID. | R: przekierowanie z deviceId do listy widgetów 448/Light. To nie osobny ekran produktu. |
| S35 | `/device/widget/list` — [app/(app)/device/widget/list.tsx](../src/app/%28app%29/device/widget/list.tsx) | Operation groups, widget status/details, Add operation/widget, loading/error/empty/permissions. | R częściowo: Number/HexColor i Button/Color rows w Light/Dark. Toggle enabled nie używany; malformed/read recovery i inne role NIEZWERYFIKOWANE; A10. |
| S36 | `/device/widget/add` — [app/(app)/device/widget/add.tsx](../src/app/%28app%29/device/widget/add.tsx) | Bound operation, type selection/configuration, validation/error/pending/accepted navigation. | R częściowo: Number Button/Slider i HexColor Button + color sheet, 448/Light oraz 320/Dark/130%. Display/Radio/Switch forms i Create NIEZWERYFIKOWANE; A06. |
| S37 | `/device/widget/details` — [app/(app)/device/widget/details.tsx](../src/app/%28app%29/device/widget/details.tsx) | Read-only configuration, invalid reads/Retry, delete definition confirmation/accepted return. | R częściowo: istniejący Button widget, 320/Dark/130%. Inne typy i Delete NIEZWERYFIKOWANE; A01/A06. |
| S38 | `/automation/list` — [app/(app)/automation/list.tsx](../src/app/%28app%29/automation/list.tsx) | Home scope, loading/error/cache/empty/filled, Add role gate, enabled/disabled labels. | R częściowo: poprawny empty state 448/Light. Filled list i role matrix NIEZWERYFIKOWANE obecnie; A20 dotyczy źródeł. |
| S39 | `/automation/add` — [app/(app)/automation/add.tsx](../src/app/%28app%29/automation/add.tsx) | Bound parent session, Name/icon/And-Or, draft children, limits, error/pending/accepted return. | R częściowo: pusty draft i wejścia do child forms/browser ikon 448/Light. Stary wariant selektora potwierdzony; A31. Nie zapisano automatyzacji ani child; failure/accepted return NIEZWERYFIKOWANE. |
| S40 | `/automation/details` — [app/(app)/automation/details.tsx](../src/app/%28app%29/automation/details.tsx) | Validated read, state/metadata partial save, saved children/role gates, delete/accepted recovery. | R częściowo: brak ID recovery 320/Dark/130%. NIEZWERYFIKOWANY poprawny detail: konto ma pustą listę automatyzacji. Starsze screenshoty nie są świeżym dowodem; A01/A29/A31 (wspólny formularz). |
| S41 | `/automation/conditions/add` — [app/(app)/automation/conditions/add.tsx](../src/app/%28app%29/automation/conditions/add.tsx) | Token/home/role session, full device/operation catalogs, Boolean/Number/Text fields, inline validation/return. | R częściowo: formularz w poprawnym lokalnym draft parent, 448/Light. Wybrane operacje, typed variants i saved-child PUT NIEZWERYFIKOWANE; A21/A22. |
| S42 | `/automation/results/add` — [app/(app)/automation/results/add.tsx](../src/app/%28app%29/automation/results/add.tsx) | Token/home/role session, device/operation, exact value, draft/saved child, pending/error/return. | R częściowo: formularz w lokalnym draft parent, 448/Light. Nie dodawano wyniku; wybrane typy i accepted return NIEZWERYFIKOWANE; A21/A22. |
| S43 | `/user/profile` — [app/(app)/user/profile.tsx](../src/app/%28app%29/user/profile.tsx) | Identity/read recovery, Light-Dark-System, read-only language, navigation, signout/account delete. | R częściowo: identity, theme sheet i Delete/cancel 448/Light; 800/Light z clippingiem Cancel. Nie zapisywano preference ani nie usuwano konta; A01/A12. |
| S44 | `/user/info` — [app/(app)/user/info.tsx](../src/app/%28app%29/user/info.tsx) | Metadata/email, legal links w jednym scrollu. | R: cały podstawowy widok 448/Light. Długie wartości przy 200% i obsługa linków z pustą historią NIEZWERYFIKOWANE. |
| S45 | `/user/privacy` — [app/(app)/user/privacy.tsx](../src/app/%28app%29/user/privacy.tsx) | Private Privacy, shared legal renderer, loading/error/version/content; Stack owns Back. | R: bieżący dokument 320/Dark/130%. Błąd odczytu i nietypowe formaty NIEZWERYFIKOWANE. |
| S46 | `/user/terms` — [app/(app)/user/terms.tsx](../src/app/%28app%29/user/terms.tsx) | Private Terms, shared legal renderer i prywatny nagłówek. | R: bieżący dokument 320/Dark/130%. Błąd odczytu i nietypowe formaty NIEZWERYFIKOWANE. |


Dodatkowe elementy bez osobnego ekranu: src/App.tsx (entry/wrapper), src/app/_layout.tsx (insets/providers/tokens), oba grupowe _layout.tsx (Stack/guards), +native-intent.ts (normalizacja linków) oraz natywny splash. Obejrzano ich implementację; aktualnego zbudowanego splash screenu i błędów frameworka nie uznawano za zweryfikowane ekrany produktu.

### 8.2. Wszystkie rodziny nakładek i selektorów

Każdy wymieniony wariant sprawdzono w źródle wraz z callerem i wrapperem. Połączone wiersze opisują jawnie osobne konteksty tego samego wzorca. Ścieżki względem src/. Placement i legal documents są trasami, password visibility oraz JSON path są stanami inline. Nie pominięto ich jako rzekomych modali.

| Nakładka / warianty | Lokalizacja | Zawartość / stany | Status natywny i uwagi |
| --- | --- | --- | --- |
| Exit App | app/(app)/index.tsx:77 | NativeModal + PortalHost + AlertDialog; Cancel/Back/Exit. | K; NIEZWERYFIKOWANY runtime. A01/A04; duży tekst/krótkie okno do sprawdzenia. |
| What is new | components/common/WhatsNewModal.tsx:85 | SenswaveModal default + lista opisów, Close/Back. | K; NIEZWERYFIKOWANY runtime: wersja już oznaczona jako obejrzana. A07/A27/A31; aktywne historyczne UI, nie osierocony plik. |
| Home icon sheet | components/home/HomeForm.tsx:168; components/common/IconSelector.tsx:141 | Brand sheet, 4 kolumny, backend catalog, loading/error/Retry/historical key. | K; wspólny wariant obejrzany na Device, bez osobnej próby Home sheet. A09. |
| Device icon sheet | components/device/DeviceForm.tsx:484 | Brand sheet, opaque keys, selected/disabled i local retry. | R: 448/Light, przewijany katalog; nie wybierano nowej ikony. A09. |
| Dashboard icon sheet | components/device/dashboards/AddDashboardForm.tsx; DashboardForm.tsx | Brand sheet: dokładnie 16 historycznych ikon, bez global search. | K; NIEZWERYFIKOWANY osobny runtime sheet. |
| Radio icon sheet | components/device/widgets/forms/Radio/RadioOptionFormModal.tsx | Brand sheet: 15 historycznych ikon, zachowanie saved outside-palette key. | K; NIEZWERYFIKOWANY runtime, brak pasującej zapisanej konfiguracji do próby bez tworzenia. |
| Automation global icon browser | components/automations/AutomationForm.tsx:253; components/common/IconSelector.tsx:318 | Default SenswaveModal; search, Clear, FlatList grid, wybór/Back. | R: 448/Light; Close target zmierzony. Search z wpisanym tekstem, wybór i focus powrotny NIEZWERYFIKOWANE. A07/A08/A31: wymagany nowy bottom sheet z zachowaniem zbioru ikon. |
| Home location | components/home/LocationMapPicker.tsx:121 | Brand fullscreen modal, MapLibre, pin, attribution, Use this location, loading/retry. | R: kafelki i pan 448/Light, zmiana center, Back/cancel bez zapisu. Zoom, Confirm, GPS i błędy tile read NIEZWERYFIKOWANE. |
| Home Delete / member Leave | app/(app)/home/details.tsx:394 | Wspólny kontrolowany AlertDialog, treść zależna od roli i domu. | K; NIEZWERYFIKOWANY runtime. A01. |
| Home unlink source | app/(app)/home/details.tsx:394 | Ten sam dialog, nazwa źródła, skutek unlink i local recovery. | K; NIEZWERYFIKOWANY runtime. A01. |
| Delete room z Home details | app/(app)/home/details.tsx:394 | Dynamiczna tożsamość pokoju, informacja o unassignment, Cancel/Delete. | K; NIEZWERYFIKOWANY runtime. A01. |
| Delete room z Room details | app/(app)/home/room/details.tsx:190 | Osobny native dialog, scroll body, Cancel/Back. | K; NIEZWERYFIKOWANY runtime dialog, sam detail obejrzany. A01. |
| Remove sharing access | components/homeSharing/HomeSharingListItem.tsx:85 | Native AlertDialog z emailem i rolą; local pending/error. | K; NIEZWERYFIKOWANY runtime, nie usuwano dostępu. A01. |
| Room selector | components/room/RoomSelector.tsx:34 | Room/None/unavailable; Create room po zakończeniu dismiss. | R: lista 448/Light i Back. Create room oraz długie 64-znakowe nazwy przy 200% NIEZWERYFIKOWANE. A03. |
| Theme selector | components/common/BottomSheetSelect.tsx; app/(app)/user/profile.tsx | Light/Dark/System radio, Close/scrim/Back, draft wyboru staje się zapisem. | R: otwarcie, aktualny System, Android Back; nie zmieniano preference. A12. |
| Delete account | components/user/RemoveAccountDialog.tsx:49 | Native Modal + named PortalHost + AlertDialog, body scroll, Cancel/Delete. | R: 448/Light Cancel/Back oraz 800/Light z clippingiem Cancel; bez DELETE. A01. |
| Broker TLS i MQTT — Create | components/dataSource/DataSourceForm.tsx | Dwa osobne BottomSheetSelect: Enabled/Disabled; 5.0.0/3.1.1/3.1.0, draft-only. | K; triggers obejrzane, oba menu osobno NIEZWERYFIKOWANE natywnie. |
| Broker TLS i MQTT — Settings | components/dataSource/DataSourceForm.tsx | Te same menu w edycji, drafts zachowywane między panelami. | K; Settings obejrzane, oba menu i zmianę draftu NIEZWERYFIKOWANO. |
| Delete data source | components/dataSource/sections/DataSourceDetailsSection.tsx:99 | Native controlled AlertDialog, scroll body, Delete/Cancel w odwróconej kolumnie. | K; NIEZWERYFIKOWANY dialog w runtime. A16/A17/A19; odmienny footer wyłącza automatyczne przypisanie A01. |
| Remove subscription | components/dataSource/subscriptions/BrokerSubscriptions.tsx:266 | ConfirmDialog; generic warning, Cancel/Remove/scrim/Back. | K; NIEZWERYFIKOWANY runtime. Wspólne ryzyko A02; w ostrzeżeniu brak nazwy konkretnego topic. |
| Tile type i Presence type | components/device/DeviceForm.tsx:508,711 | Dwa selektory: Default/Switch/Display/Slider/Options oraz No presence/Boolean. | K; sekcje collapsed obejrzane, same sheets NIEZWERYFIKOWANE. A26. |
| Per-device operation selectors | components/device/operation/OperationSelector.tsx | Tile operation, Primary reading, Reading 2–9, Presence operation; filtrowany pełny katalog, None/historical/unavailable/Retry/Add. | K; NIEZWERYFIKOWANE osobne native sheets i role. |
| Home Options value | components/device/tile/ControlDeviceTile.tsx | BottomSheetSelect variant tile; selected value i Cancel/Back bez komendy, wybór wysyła akcję. | K; NIEZWERYFIKOWANY runtime tego typu kafelka. |
| Dashboard selector | app/(app)/device/device.tsx | BottomSheetSelect dla wszystkich ról, aktualny dashboard, loaded/refreshing. | K; trigger obejrzany na Dash 1, menu/zmiana selection NIEZWERYFIKOWANE. |
| Operation type | components/device/operation/OperationForm.tsx:303 | Boolean/Number/Integer/Text/HexColor/Options. | R: 320/Dark/130%, scroll listy i wybór Options. Bez POST. |
| Save on user action / Data mapping | components/device/operation/OperationForm.tsx:314,337 | Osobne sheets Enabled/Disabled oraz Plain text/JSON. JSON path edytowany inline. | K; triggers obejrzane; sheets i JSON path NIEZWERYFIKOWANE natywnie. |
| Boolean override i typy/wartości true/false | components/device/operation/forms/Boolean/BooleanOperationForm.tsx | Default/Inversed/Custom; osobno typy Boolean/Number/Text oraz wybór Boolean wartości. | K; domyślny trigger obejrzany, conditional/nested sheets NIEZWERYFIKOWANE. |
| Number/Integer range i separator | components/device/operation/forms/Numeric/NumericOperationForm.tsx | Limited/Unlimited oraz Dot/Comma dla Number+Plain text; Minimum/Maximum inline. | K; NIEZWERYFIKOWANY runtime tych sheets. |
| Add operation option | components/device/operation/forms/Options/OptionsOperationFormModal.tsx:87 | Brand SenswaveModal z FormSection; Name, Value type, Value i bottom Add. Wewnątrz Value type oraz Boolean value sheets. | R częściowo: Name/type form i Name z IME 320/Dark/130%. Dolne Add z IME i nested sheets NIEZWERYFIKOWANE. A28. |
| Widget type | components/device/widgets/WidgetForm.tsx:140 | Tylko kompatybilne typy danego operation. | R: Number Button/Display/Slider menu, wybór Slider; pozostałe katalogi K. |
| Button Boolean/Options value | components/device/widgets/forms/ButtonForm.tsx | Dokładna wartość Boolean albo option name w BottomSheetSelect. | K; NIEZWERYFIKOWANY runtime tych wariantów. |
| Color editor — configuration/live | components/common/ColorPickerField.tsx | HEX, preview, Panel1, HueSlider, Cancel/Confirm; draft/validation/busy/error. | R: konfiguracja Button/HexColor, pan zmienia draft, Cancel go odrzuca. Live send, hue drag, błąd komendy i IME/duży tekst NIEZWERYFIKOWANE. |
| Add Radio option | components/device/widgets/forms/Radio/RadioOptionFormModal.tsx:101 | Brand modal: operation option, display name i icon; nested operation-options i 15-icon sheets. | K; NIEZWERYFIKOWANY runtime. Sprawdzić także strukturę IME z A28. |
| Delete device | app/(app)/device/details.tsx:455 | ConfirmDialog, ostrzeżenie o dashboardach/widgetach/operacjach. | R: otwarcie 320/Dark/200% i Back/cancel. Bez DELETE. A02. |
| Delete dashboard | app/(app)/device/dashboard/details.tsx:377 | Native AlertDialog, stała tożsamość dashboardu, scroll body, Cancel/Delete. | K; detail obejrzany, dialog NIEZWERYFIKOWANY. A01. |
| Delete operation | app/(app)/device/operation/details.tsx:804 | Native AlertDialog, membership proof, scroll body, Cancel/Delete i accepted-read retry. | K; NIEZWERYFIKOWANY dialog. Ma jawne sm:flex-col, więc nie zaliczono A01 na podstawie innych callerów. |
| Delete widget definition | components/device/widgets/WidgetDetails.tsx:186 | Native AlertDialog z wpływem na placements; odrębny od unlink. | K; NIEZWERYFIKOWANY dialog. A01. |
| Unlink widget | components/device/dashboards/Grid/GridDashboardView.tsx:427 | Long press/custom action, wskazany widget, definition pozostaje; Cancel/Remove. | K; NIEZWERYFIKOWANY runtime, pusty dashboard nie ma placement do unlink. A01. |
| Dashboard command snackbar — niemodalny | components/device/widgets/WidgetCommandSnackbar.tsx | Jedna lokalna wiadomość z nazwą widgetu, guarded Retry i Close; poza geometrią grid. | K; NIEZWERYFIKOWANY runtime błędu/pending i stabilności bounds; nie wysyłano komend. |
| Automation Device/Operation selections | components/automations/conditions/AutomationConditionForm.tsx:304,372; components/automations/results/AutomationResultForm.tsx:217,285 | Cztery contextual sheets; loading/error/empty i pełny operation catalog w formie. | K; początki obu child forms obejrzane. Wybrane devices/operations i nested typed choices NIEZWERYFIKOWANE. A21/A22. |
| Delete automation | app/(app)/automation/details.tsx:589 | Native AlertDialog z captured home/id/token, Cancel/Back, scroll body i accepted recovery. | K; NIEZWERYFIKOWANY runtime: brak zapisanej automatyzacji. A01. |
| Zewnętrzne Google i Android permission | hooks/useGoogleSignIn.ts; components/common/LocalizationSelector.tsx:82 | Google account/Play Services UI; system GPS permission oraz platformowe IME/autofill. | Google/GPS permission NIEZWERYFIKOWANE. IME otwierano natywnie; wygląd i kontrakty usług systemowych nie są implementacją lokalnych komponentów. |

### 8.3. Wszystkie 135 plików komponentów

Każdy plik poniżej przeczytano wraz z użyciem. Osiągalność dotyczy pliku i używanych eksportów; np. eksport samodzielnego Toggle nie staje się automatycznie przetestowany tylko przez użycie jego wariantów stylu. R jest świadectwem podanego wariantu, nie wszystkich propsów.


#### auth

| Komponent / źródło | Status i pokrycie |
| --- | --- |
| [auth/AuthFlow.tsx](../src/components/auth/AuthFlow.tsx) | R: wszystkie pięć route wariantów, z IME w login. Pending/success/Google pozostają K. |
| [auth/AuthPanel.tsx](../src/components/auth/AuthPanel.tsx) | R: wszystkie pięć route wariantów, z IME w login. Pending/success/Google pozostają K. |
| [auth/ResetPasswordForm.tsx](../src/components/auth/ResetPasswordForm.tsx) | R: początek formularza reset; poprawny link i accepted mutation NIEZWERYFIKOWANE. |

#### automations

| Komponent / źródło | Status i pokrycie |
| --- | --- |
| [automations/AutomationForm.tsx](../src/components/automations/AutomationForm.tsx) | R: create draft/And-Or/empty children i legacy icons. Saved/readonly/accepted K. |
| [automations/AutomationList.tsx](../src/components/automations/AutomationList.tsx) | R: prawidłowy empty state i header Add. Filled/cache/read error K. |
| [automations/AutomationTile.tsx](../src/components/automations/AutomationTile.tsx) | K: aktywny variant list; preview nie ma produkcyjnego callera. Filled list NIEZWERYFIKOWANA runtime; A20. |
| [automations/conditions/AutomationConditionForm.tsx](../src/components/automations/conditions/AutomationConditionForm.tsx) | R: początkowy child form z local draft. Selected operation/typed values/error/return K. |
| [automations/conditions/AutomationConditionItem.tsx](../src/components/automations/conditions/AutomationConditionItem.tsx) | K: Boolean/Number/Text summary i draft-only Remove; NIEZWERYFIKOWANY native child row. |
| [automations/conditions/AutomationConditions.tsx](../src/components/automations/conditions/AutomationConditions.tsx) | R: empty/count/Add header. Saved/draft child rows i limits K. |
| [automations/results/AutomationResultForm.tsx](../src/components/automations/results/AutomationResultForm.tsx) | R: początkowy Device/Value child form. Selected catalog/mutation/error K. |
| [automations/results/AutomationResultItem.tsx](../src/components/automations/results/AutomationResultItem.tsx) | K: exact result summary i draft Remove; NIEZWERYFIKOWANY native child row. |
| [automations/results/AutomationResults.tsx](../src/components/automations/results/AutomationResults.tsx) | R: empty/count/Add header. Child rows/limits K. |

#### common

| Komponent / źródło | Status i pokrycie |
| --- | --- |
| [common/AddInput.tsx](../src/components/common/AddInput.tsx) | Odczyt K; brak osiągalnego callera od tras/layoutów. NIEZWERYFIKOWANY runtime; dawnych stylów nie liczono jako aktualnej usterki. |
| [common/BottomSheetSelect.tsx](../src/components/common/BottomSheetSelect.tsx) | R: theme, Room, Device icons, operation/widget types i Color. Inne contextual menu K; focus TalkBack niebadany. |
| [common/Button.tsx](../src/components/common/Button.tsx) | R: brand primary/outline/destructive, labels i targety. Pending i retained callbacks głównie K. |
| [common/ButtonWithTextAndImage.tsx](../src/components/common/ButtonWithTextAndImage.tsx) | Odczyt K; brak osiągalnego callera od tras/layoutów. NIEZWERYFIKOWANY runtime; dawnych stylów nie liczono jako aktualnej usterki. |
| [common/ColorPickerField.tsx](../src/components/common/ColorPickerField.tsx) | R: Button/HexColor sheet, pan draft i Cancel. Live Confirm/IME/błąd K. |
| [common/ConfirmDialog.tsx](../src/components/common/ConfirmDialog.tsx) | R: Delete Device przy 200% i Back. Remove subscription K. Plik identyczny z main, aktywna stara implementacja A31. |
| [common/ContentSection.tsx](../src/components/common/ContentSection.tsx) | R: nagłówki, akcje i helper w Home/source/widget listach; szeroki/small layout. |
| [common/Dialog.tsx](../src/components/common/Dialog.tsx) | R: destrukcyjny dialog Device z clippingiem; A02. Korekty koloru/targetu nie zastąpiły starego panelu; A31. |
| [common/Divider.tsx](../src/components/common/Divider.tsx) | R: documents i standardowy separator. |
| [common/Dropdown.tsx](../src/components/common/Dropdown.tsx) | Odczyt K; brak osiągalnego callera od tras/layoutów. NIEZWERYFIKOWANY runtime; dawnych stylów nie liczono jako aktualnej usterki. |
| [common/EnhancedHorizontalSelector.tsx](../src/components/common/EnhancedHorizontalSelector.tsx) | Odczyt K; brak osiągalnego callera od tras/layoutów. NIEZWERYFIKOWANY runtime; dawnych stylów nie liczono jako aktualnej usterki. |
| [common/Expander.tsx](../src/components/common/Expander.tsx) | R: collapsed Tile/Presence. Expanded body i jego warianty K; A26. |
| [common/FAB.tsx](../src/components/common/FAB.tsx) | Odczyt K; brak osiągalnego callera od tras/layoutów. NIEZWERYFIKOWANY runtime; dawnych stylów nie liczono jako aktualnej usterki. |
| [common/FormSection.tsx](../src/components/common/FormSection.tsx) | R: forms create/details i helper/spacing. |
| [common/HorizontalSelector.tsx](../src/components/common/HorizontalSelector.tsx) | Odczyt K; brak osiągalnego callera od tras/layoutów. NIEZWERYFIKOWANY runtime; dawnych stylów nie liczono jako aktualnej usterki. |
| [common/Icon.tsx](../src/components/common/Icon.tsx) | R: glify Ionicons i resource Lucide w obejrzanych widokach; nie każdy klucz katalogu. |
| [common/IconSelector.tsx](../src/components/common/IconSelector.tsx) | R: brand Device i legacy Automation browser. Home/Dashboard/Radio sheet osobno K. Wariant default nadal aktywny, A31; porównanie wszystkich palet w sekcji 12. |
| [common/ImageButton.tsx](../src/components/common/ImageButton.tsx) | Odczyt K; brak osiągalnego callera od tras/layoutów. NIEZWERYFIKOWANY runtime; dawnych stylów nie liczono jako aktualnej usterki. |
| [common/Input.tsx](../src/components/common/Input.tsx) | R: auth/create/read-only, focus z IME. Nie każdy input type i validation branch. |
| [common/InputNumber.tsx](../src/components/common/InputNumber.tsx) | R: widget Slider Step. Numeric operation i typed Options value K. |
| [common/JsonPathSelector.tsx](../src/components/common/JsonPathSelector.tsx) | K: ordered segments, add/remove/validation, brak osobnej nakładki; NIEZWERYFIKOWANY runtime. |
| [common/ListRow.tsx](../src/components/common/ListRow.tsx) | R: home/source/widgets/subscriptions/info; boundary, wrapping i trailing actions. |
| [common/Loading.tsx](../src/components/common/Loading.tsx) | R: initial loading na kliencie; a11y odczyt niebadany. |
| [common/LocalizationSelector.tsx](../src/components/common/LocalizationSelector.tsx) | R: saved/empty location, map open/pan/cancel. GPS/timeout K. |
| [common/Markdown.tsx](../src/components/common/Markdown.tsx) | R: aktualne legal summary/content. Nietypowe tables/code/links K. |
| [common/PasswordInput.tsx](../src/components/common/PasswordInput.tsx) | R: wygląd i named eye action w auth/broker forms. Show/hide/autofill K. |
| [common/PressableText.tsx](../src/components/common/PressableText.tsx) | Odczyt K; brak osiągalnego callera od tras/layoutów. NIEZWERYFIKOWANY runtime; dawnych stylów nie liczono jako aktualnej usterki. |
| [common/SectionHeaderAction.tsx](../src/components/common/SectionHeaderAction.tsx) | R: Add source/operation/room/device, 48 dp; nie wszystkie role/stany pending. |
| [common/SenswaveModal.tsx](../src/components/common/SenswaveModal.tsx) | R: legacy browser, brand Option i mapa. Default/brand close różne; IME A28. Stara powłoka default aktywna w Automation/What's New; A31. |
| [common/SimpleItemList.tsx](../src/components/common/SimpleItemList.tsx) | R: cały podstawowy App information. |
| [common/Slider.tsx](../src/components/common/Slider.tsx) | R: wygląd natywnego Home SeekBar i jego 48 dp bounds. Drag/command/pending K. |
| [common/Switch.tsx](../src/components/common/Switch.tsx) | R: wygląd On/Off w Home. Live toggle i failure K. |
| [common/SwitchDropdown.tsx](../src/components/common/SwitchDropdown.tsx) | Odczyt K; brak osiągalnego callera od tras/layoutów. NIEZWERYFIKOWANY runtime; dawnych stylów nie liczono jako aktualnej usterki. |
| [common/Text.tsx](../src/components/common/Text.tsx) | R: treść statusów, list i nakładek; ograniczenia linii sprawdzone K. |
| [common/Tile.tsx](../src/components/common/Tile.tsx) | Odczyt K; brak osiągalnego callera od tras/layoutów. NIEZWERYFIKOWANY runtime; dawnych stylów nie liczono jako aktualnej usterki. |
| [common/UserNote.tsx](../src/components/common/UserNote.tsx) | Odczyt K; brak osiągalnego callera od tras/layoutów. NIEZWERYFIKOWANY runtime; dawnych stylów nie liczono jako aktualnej usterki. |
| [common/WhatsNewModal.tsx](../src/components/common/WhatsNewModal.tsx) | K: lista zmian i limity tekstu; NIEZWERYFIKOWANY runtime bieżącej bramki wersji. |

#### dataSource

| Komponent / źródło | Status i pokrycie |
| --- | --- |
| [dataSource/DataSourceForm.tsx](../src/components/dataSource/DataSourceForm.tsx) | R: create/settings albo poprawny katalog w Light/Dark. Zapis/read failures K. |
| [dataSource/DataSourceList.tsx](../src/components/dataSource/DataSourceList.tsx) | R: create/settings albo poprawny katalog w Light/Dark. Zapis/read failures K. |
| [dataSource/brokers/BrokerClient.tsx](../src/components/dataSource/brokers/BrokerClient.tsx) | R: Disconnected i Start/Stop/Restart wygląd. Kontroli brokerowych nie wykonywano. |
| [dataSource/brokers/StartBrokerClientForm.tsx](../src/components/dataSource/brokers/StartBrokerClientForm.tsx) | R: idle form; saved credentials/pending/recovery K. |
| [dataSource/sections/DataSourceDetailsSection.tsx](../src/components/dataSource/sections/DataSourceDetailsSection.tsx) | R: Settings/save/delete section. Dialog i mutacje K. |
| [dataSource/state/DataSourceState.tsx](../src/components/dataSource/state/DataSourceState.tsx) | R: Disconnected na liście i details. Inne stany/Retry K; A18. |
| [dataSource/state/DataSourceStateGet.tsx](../src/components/dataSource/state/DataSourceStateGet.tsx) | R: Disconnected na liście i details. Inne stany/Retry K; A18. |
| [dataSource/subscriptions/AddSubscriptionForm.tsx](../src/components/dataSource/subscriptions/AddSubscriptionForm.tsx) | R: idle Topic/CTA. IME i accepted create NIEZWERYFIKOWANE. |
| [dataSource/subscriptions/BrokerSubscriptions.tsx](../src/components/dataSource/subscriptions/BrokerSubscriptions.tsx) | R: istniejące wrapping topics i remove targets. Confirm/remove/error K. |
| [dataSource/tile/DataSourceTile.tsx](../src/components/dataSource/tile/DataSourceTile.tsx) | R: wariant list. Preview nie ma aktywnego callera; jego wyglądu nie liczono jako aktualny błąd. |

#### device

| Komponent / źródło | Status i pokrycie |
| --- | --- |
| [device/DeviceForm.tsx](../src/components/device/DeviceForm.tsx) | R: create/details, room/icons, collapsed Tile/Presence, Delete section. Conditional edit bodies K. |
| [device/DeviceLayoutToggle.tsx](../src/components/device/DeviceLayoutToggle.tsx) | R: Grid selected i targety List/Grid; zmiana zapisanej preferencji niećwiczona. |
| [device/DeviceList.tsx](../src/components/device/DeviceList.tsx) | R: poprawny Home grid i loading. List layout, empty/error i role matrix K. |
| [device/dashboards/AddDashboardForm.tsx](../src/components/device/dashboards/AddDashboardForm.tsx) | R: poprawny formularz 448/Light, bez zapisu i usuwania; ikony i error branches K. |
| [device/dashboards/DashboardForm.tsx](../src/components/device/dashboards/DashboardForm.tsx) | R: poprawny formularz 448/Light, bez zapisu i usuwania; ikony i error branches K. |
| [device/dashboards/DashboardView.tsx](../src/components/device/dashboards/DashboardView.tsx) | R: istniejący dashboard z pustą siatką. Live widgets/error/empty dashboards K. |
| [device/dashboards/Grid/GridDashboardView.tsx](../src/components/device/dashboards/Grid/GridDashboardView.tsx) | R: pusty canvas/free cells w jednym scrollu i wejście do picker. Unlink/snackbar/live controls K. |
| [device/dashboards/Grid/WidgetPlacementCanvas.tsx](../src/components/device/dashboards/Grid/WidgetPlacementCanvas.tsx) | R: neutralny preview po wyborze. Drag/resize/collision/focus actions NIEZWERYFIKOWANE. |
| [device/operation/OperationForm.tsx](../src/components/device/operation/OperationForm.tsx) | R: create Boolean/Options oraz read-only Number. Pozostałe typy/JSON/submit K. |
| [device/operation/OperationSelector.tsx](../src/components/device/operation/OperationSelector.tsx) | K: filtrowany pełny catalog/None/historical/Add/Retry; NIEZWERYFIKOWANY native sheet. |
| [device/operation/OperationTile.tsx](../src/components/device/operation/OperationTile.tsx) | R: list Number/HexColor w obu motywach. Preview wariant nieużywany; A10. |
| [device/operation/forms/Boolean/BooleanOperationForm.tsx](../src/components/device/operation/forms/Boolean/BooleanOperationForm.tsx) | R: domyślny override trigger w create. Custom/inversed/types i wartości K. |
| [device/operation/forms/Numeric/NumericOperationForm.tsx](../src/components/device/operation/forms/Numeric/NumericOperationForm.tsx) | K: Number/Integer range i separator; NIEZWERYFIKOWANY pełny native subform. |
| [device/operation/forms/Options/OptionsOperationForm.tsx](../src/components/device/operation/forms/Options/OptionsOperationForm.tsx) | R: empty options i Add. Saved typed options K. |
| [device/operation/forms/Options/OptionsOperationFormModal.tsx](../src/components/device/operation/forms/Options/OptionsOperationFormModal.tsx) | R: brand Name/Value type i focused Name z IME; dolna akcja i nested choices K; A28. |
| [device/tile/ControlDeviceTile.tsx](../src/components/device/tile/ControlDeviceTile.tsx) | R: Home Slider. Home Options bottom sheet i action branches K. |
| [device/tile/DeviceTile.tsx](../src/components/device/tile/DeviceTile.tsx) | R: home grid shell i podstawowe identity/value states; List variant i permission/long-name combinations K. |
| [device/tile/DisplayDeviceTile.tsx](../src/components/device/tile/DisplayDeviceTile.tsx) | R: No data/value presentation. Dodatkowe readings i live malformed są K/handler. |
| [device/tile/SwitchDeviceTile.tsx](../src/components/device/tile/SwitchDeviceTile.tsx) | R: Home On/Off wygląd; nie wysyłano toggle. Delayed spinner/error K. |
| [device/widgets/AddWidgetForm.tsx](../src/components/device/widgets/AddWidgetForm.tsx) | R: Number/HexColor configuration lub read-only Button. Create/delete/retry branches K. |
| [device/widgets/WidgetCommandSnackbar.tsx](../src/components/device/widgets/WidgetCommandSnackbar.tsx) | K: identity/Retry/Close/scope i stable-grid policy; NIEZWERYFIKOWANY native error. |
| [device/widgets/WidgetDetails.tsx](../src/components/device/widgets/WidgetDetails.tsx) | R: Number/HexColor configuration lub read-only Button. Create/delete/retry branches K. |
| [device/widgets/WidgetForm.tsx](../src/components/device/widgets/WidgetForm.tsx) | R: Number/HexColor configuration lub read-only Button. Create/delete/retry branches K. |
| [device/widgets/WidgetList.tsx](../src/components/device/widgets/WidgetList.tsx) | R: management i picker, Number/HexColor groups, istniejące Button/Color rows. |
| [device/widgets/WidgetListTile.tsx](../src/components/device/widgets/WidgetListTile.tsx) | R: selected/pick albo detail row i Enabled presentation. Enabled mutation nieużyta. |
| [device/widgets/WidgetView.tsx](../src/components/device/widgets/WidgetView.tsx) | K: dispatch typów live i unknown fallback; NIEZWERYFIKOWANY pełny dashboard z controls. |
| [device/widgets/forms/ButtonForm.tsx](../src/components/device/widgets/forms/ButtonForm.tsx) | R: Number default i HexColor editor. Boolean/Options/Text variants K. |
| [device/widgets/forms/ColorForm.tsx](../src/components/device/widgets/forms/ColorForm.tsx) | K: conditional/read-only configuration i walidacja; NIEZWERYFIKOWANY osobny native wariant. |
| [device/widgets/forms/DisplayForms.tsx](../src/components/device/widgets/forms/DisplayForms.tsx) | K: conditional/read-only configuration i walidacja; NIEZWERYFIKOWANY osobny native wariant. |
| [device/widgets/forms/Radio/RadioForm.tsx](../src/components/device/widgets/forms/Radio/RadioForm.tsx) | K: historical choices/options/icon/value/read-only i modal; NIEZWERYFIKOWANY runtime. |
| [device/widgets/forms/Radio/RadioOptionFormModal.tsx](../src/components/device/widgets/forms/Radio/RadioOptionFormModal.tsx) | K: historical choices/options/icon/value/read-only i modal; NIEZWERYFIKOWANY runtime. |
| [device/widgets/forms/SliderForm.tsx](../src/components/device/widgets/forms/SliderForm.tsx) | R: Number range/Step i inline validation. Submit K. |
| [device/widgets/forms/SwitchForm.tsx](../src/components/device/widgets/forms/SwitchForm.tsx) | K: conditional/read-only configuration i walidacja; NIEZWERYFIKOWANY osobny native wariant. |
| [device/widgets/widgets/ButtonWidget.tsx](../src/components/device/widgets/widgets/ButtonWidget.tsx) | K: live rendering, sizing, accessibility i guarded commands; NIEZWERYFIKOWANY na dashboardzie (badany grid pusty). |
| [device/widgets/widgets/ColorWidget.tsx](../src/components/device/widgets/widgets/ColorWidget.tsx) | K: live rendering, sizing, accessibility i guarded commands; NIEZWERYFIKOWANY na dashboardzie (badany grid pusty). |
| [device/widgets/widgets/DisplayWidgets.tsx](../src/components/device/widgets/widgets/DisplayWidgets.tsx) | K: live rendering, sizing, accessibility i guarded commands; NIEZWERYFIKOWANY na dashboardzie (badany grid pusty). |
| [device/widgets/widgets/InvalidWidget.tsx](../src/components/device/widgets/widgets/InvalidWidget.tsx) | K: live rendering, sizing, accessibility i guarded commands; NIEZWERYFIKOWANY na dashboardzie (badany grid pusty). |
| [device/widgets/widgets/RadioWidget.tsx](../src/components/device/widgets/widgets/RadioWidget.tsx) | K: live rendering, sizing, accessibility i guarded commands; NIEZWERYFIKOWANY na dashboardzie (badany grid pusty). |
| [device/widgets/widgets/SliderWidget.tsx](../src/components/device/widgets/widgets/SliderWidget.tsx) | K: live rendering, sizing, accessibility i guarded commands; NIEZWERYFIKOWANY na dashboardzie (badany grid pusty). |
| [device/widgets/widgets/SwitchWidget.tsx](../src/components/device/widgets/widgets/SwitchWidget.tsx) | K: live rendering, sizing, accessibility i guarded commands; NIEZWERYFIKOWANY na dashboardzie (badany grid pusty). |

#### headers

| Komponent / źródło | Status i pokrycie |
| --- | --- |
| [headers/DefaultHeader.tsx](../src/components/headers/DefaultHeader.tsx) | R: named Back/Home/Profile targets, current identity i motywy; predictive animation/long-name matrix K. |
| [headers/ProfileHeader.tsx](../src/components/headers/ProfileHeader.tsx) | R: named Back/Home/Profile targets, current identity i motywy; predictive animation/long-name matrix K. |

#### home

| Komponent / źródło | Status i pokrycie |
| --- | --- |
| [home/HomeForm.tsx](../src/components/home/HomeForm.tsx) | R: Create i Owner edit, name/icon/location/sections. Display read-only i accepted save K. |
| [home/LocationMapPicker.tsx](../src/components/home/LocationMapPicker.tsx) | R: native tiles/attribution, pan, center i Back/cancel. Zoom/Confirm/read failure K. |
| [home/LocationMapPicker.web.tsx](../src/components/home/LocationMapPicker.web.tsx) | Poza Androidem: wariant platformowy web. Przeczytany dla rozróżnienia resolution; nie oceniano jego wyglądu. |
| [home/NoHomeScreen.tsx](../src/components/home/NoHomeScreen.tsx) | K: growing onboarding/Create/Join/pull refresh; NIEZWERYFIKOWANY native empty account. |
| [home/lists/HomeList.tsx](../src/components/home/lists/HomeList.tsx) | R: current i other home rows, Create/Join footer. Switch/read recovery K. |
| [home/lists/HomeListItem.tsx](../src/components/home/lists/HomeListItem.tsx) | R: selected/current i other-home identity, sibling Details. Pending/error K. |
| [home/widgets/HomeStateWidget.tsx](../src/components/home/widgets/HomeStateWidget.tsx) | R: assigned Disconnected notice. Connected/Connecting/Restarting/Error/missing/unknown K. |

#### homeSharing

| Komponent / źródło | Status i pokrycie |
| --- | --- |
| [homeSharing/HomeCodeInput.tsx](../src/components/homeSharing/HomeCodeInput.tsx) | R: pusty 8-cell układ i dwa rzędy po cztery przy 320 dp. Paste/autofill/Backspace K. |
| [homeSharing/HomeSharingList.tsx](../src/components/homeSharing/HomeSharingList.tsx) | K: owner list/empty/error/Invite i remove confirmation; NIEZWERYFIKOWANY samodzielny native stan tej sekcji. |
| [homeSharing/HomeSharingListItem.tsx](../src/components/homeSharing/HomeSharingListItem.tsx) | K: owner list/empty/error/Invite i remove confirmation; NIEZWERYFIKOWANY samodzielny native stan tej sekcji. |
| [homeSharing/JoinHomeForm.tsx](../src/components/homeSharing/JoinHomeForm.tsx) | R: formularz 448/Light i compact układ. Nie wysłano zaproszenia; recovery K. |

#### room

| Komponent / źródło | Status i pokrycie |
| --- | --- |
| [room/RoomForm.tsx](../src/components/room/RoomForm.tsx) | R: create i details, helper/actions. Delete/accepted changes K. |
| [room/RoomSelector.tsx](../src/components/room/RoomSelector.tsx) | R: lista Room/None, cancel/Back. New room i long labels K; A03. |
| [room/RoomsView.tsx](../src/components/room/RoomsView.tsx) | R: horizontal room filters z istniejącymi pokojami. Empty manager/display K. |
| [room/tiles/AddRoomTile.tsx](../src/components/room/tiles/AddRoomTile.tsx) | K: named header action pustej listy; NIEZWERYFIKOWANY native empty rooms. |
| [room/tiles/RoomTile.tsx](../src/components/room/tiles/RoomTile.tsx) | R: selected All i zwykłe filtry; long press/disabled K. |

#### ui

| Komponent / źródło | Status i pokrycie |
| --- | --- |
| [ui/alert-dialog.tsx](../src/components/ui/alert-dialog.tsx) | R: Account Delete 448/800; wrapper/fade/stopka. Inne callerzy i TalkBack K. |
| [ui/alert.tsx](../src/components/ui/alert.tsx) | R: source notice i recovery; compact Home command error K. |
| [ui/button.tsx](../src/components/ui/button.tsx) | R: shared buttons i eye; rozmiary/asChild, disabled/busy/focus semantyka K. |
| [ui/checkbox.tsx](../src/components/ui/checkbox.tsx) | R: widoczny Remember w auth; check/unchecked interaction i TalkBack K. |
| [ui/icon.tsx](../src/components/ui/icon.tsx) | R: Reusables glyphs w Alert/checkbox/toggle; nie każdy symbol. |
| [ui/input.tsx](../src/components/ui/input.tsx) | R: natywny TextInput w formularzach i read-only; A11. |
| [ui/label.tsx](../src/components/ui/label.tsx) | R: pola auth/native form; focus i screen-reader traversal K. |
| [ui/native-only-animated-view.tsx](../src/components/ui/native-only-animated-view.tsx) | R: native dialog wrapper. System Remove animations niećwiczone. |
| [ui/tabs.tsx](../src/components/ui/tabs.tsx) | R: Overview/Settings źródła; oba panele obejrzane. |
| [ui/text.tsx](../src/components/ui/text.tsx) | R: labels/body/headers w Reusables; duży tekst próbkowany. |
| [ui/toggle-group.tsx](../src/components/ui/toggle-group.tsx) | R: condition matching i Home List/Grid wygląd; przełączanie layoutu niećwiczone. |
| [ui/toggle.tsx](../src/components/ui/toggle.tsx) | K: eksporty i toggleVariants osiągalne przez ToggleGroup; samodzielny Toggle nie był osobno montowany. |

#### user

| Komponent / źródło | Status i pokrycie |
| --- | --- |
| [user/LegalDocumentView.tsx](../src/components/user/LegalDocumentView.tsx) | R: shared legal content/public-private wrappers, Dark/130%. Read failures/nietypowy Markdown K. |
| [user/PrivacyPolicy.tsx](../src/components/user/PrivacyPolicy.tsx) | R: shared legal content/public-private wrappers, Dark/130%. Read failures/nietypowy Markdown K. |
| [user/RemoveAccountDialog.tsx](../src/components/user/RemoveAccountDialog.tsx) | R: open/Back/cancel na 448 i clipping na 800. Nigdy Confirm/Delete; A01. |
| [user/TermsAndConditions.tsx](../src/components/user/TermsAndConditions.tsx) | R: shared legal content/public-private wrappers, Dark/130%. Read failures/nietypowy Markdown K. |
| [user/UserProfileImage.tsx](../src/components/user/UserProfileImage.tsx) | R: header i profil, decorative initial oraz accessible identity. Image/fallback variants K. |
| [user/UserWelcome.tsx](../src/components/user/UserWelcome.tsx) | Odczyt K; brak osiągalnego callera od tras/layoutów. NIEZWERYFIKOWANY runtime; dawnych stylów nie liczono jako aktualnej usterki. |


Dodatkowo sprawdzono pomocnicze pliki UI: device/widgets/forms/Radio/radioValidation.ts, device/widgets/widgetAccessibility.ts, device/widgets/widgets/widgetStyles.ts, styles/defaultStyles.tsx, styles/shadowStyles.tsx, styles/colorPickerStyle.tsx, utils/dashboardGrid.ts oraz odpowiednie hooki i providery. Nie są osobnymi ekranami. Konteksty ThemeProvider, ToastProvider i ModalProvider oraz layouty zostały uwzględnione w ocenie globalnego motywu i nakładek.

Nie znaleziono aktywnego callera dla common/AddInput, ButtonWithTextAndImage, Dropdown, EnhancedHorizontalSelector, FAB, HorizontalSelector, ImageButton, PressableText, SwitchDropdown, Tile, UserNote oraz user/UserWelcome. Dwie zależności wyłącznie wewnętrzne to AddInput → ImageButton i SwitchDropdown → Dropdown. Klucze mocków w testach i słowo FAB w changelogu nie dowodzą ich użycia w aplikacji.

## 9. Jawne luki i ryzyka — poza licznikiem usterek

Brak poniższego dowodu nie oznacza zaliczenia ani wykrytego błędu. To konkretna kolejka uzupełnienia audytu po dostępności danych, odpowiedniej roli lub urządzenia.

| Ryzyko / nieweryfikowany obszar | Miejsce i potrzebna próba |
| --- | --- |
| Poprawny consent gate i zgoda accepted-once | consents.tsx; konto bez aktywnej zgody, czytelne legal links, Back/logout, POST accepted → nieudany odczyt → Retry bez drugiego POST. Bieżące konto zweryfikowało tylko redirect aktywnej zgody. |
| Zapisane automatyzacje | automation/details i filled list, child summary, owner/Manage/Display, partial save i delete. Brak rekordów w badanym domu. Istniejące zrzuty docs/superpowers/validation/assets/automations pochodzą z innego SHA. Od ich snapshotu zmieniły się także ThemeProvider/ContentSection, więc nie zastępują świeżych obrazów. |
| Pełna macierz ról | Create/Details/placement/widget management, źródło domu i saved automation children. Nie przełączano uprawnień istniejącego konta; źródła i wybrane handlery stanowią jedyny dowód części ograniczeń. |
| Live widgety i stabilność błędu | WidgetView, wszystkie siedem rendererów oraz WidgetCommandSnackbar/GridDashboardView. Potrzebny dashboard z wszystkimi typami i kontrolowany błąd, pomiar bounds/scroll offset przed/w trakcie/po Retry. Nie wysyłano komend; nie ma dowodu braku przesuwania w realnym błędzie. |
| Placement drag/resize | WidgetPlacementCanvas; preview obejrzany, ale nie wykonano move/resize/collision/termination ani zapisu. Sprawdzić rzeczywisty narożny target, ostatni wiersz, scroll i przerwanie gestu. |
| Slider i Switch pending/error | Native SeekBar miał 48 dp wysokości w XML Home. To nie dowód dostarczenia komendy ani działania wszystkich gestów, release, rollback i opóźnionego spinnera. Nie ćwiczono MQTT ani fizycznego urządzenia. |
| TalkBack i powrót fokusu | Wszystkie dialogi/sheets, disabled/read-only pola, headers i conditional forms. Nazwy/role/state i XML nie dowodzą prawidłowej wypowiedzi ani traversal. Szczególnie A19–A21 i A26. |
| Reduce Motion i predictive Back | BottomSheetSelect/AlertDialog mają jawne ReduceMotion.System. RN Animated pulse ikon/Expander i native modal slide wymagają próby z ustawieniem systemowym. Użyte ADB KeyEvent Back nie weryfikuje animacji predictive gesture. Nie zaliczono samego braku propsa jako dowodu naruszenia. |
| Bardzo niskie recovery views | home/dataSource/select oraz automation parent/child recovery i oba broker-child fallbacki są częściowo niescrollowane. Broker-not-found zmieścił się przy 320 × 480 dp/200%; niższy multi-window i dłuższy komunikat nadal nieprzetestowane. Nie zgłoszono automatycznie błędu na podstawie samego View. |
| Długie custom room labels | RoomSelector.tsx:82–90,147–152: custom row Text nie korzysta z takiego samego flexShrink jak domyślne options. Sprawdzić 64-znakową nazwę i 200%; aktualne nazwy nie potwierdziły przepełnienia. |
| Wszystkie warianty typowanych formularzy | Boolean inversed/custom, Number/Integer limited/unlimited i separator, Text/HexColor, JSON path, Options typed values, wszystkie widget forms i Radio nested sheets. Przeczytano całość, runtime objął tylko warianty wymienione w rejestrze. |
| Nagłówki list w najkrótszym oknie | widget/list oraz placement mają stały header i osobny przewijany obszar. Przy bardzo dużym tekście header może zostawiać za mało miejsca na listę; sprawdzić 200% z długim helperem. Brak jednoznacznej zaobserwowanej blokady. |
| Source subskrypcje >300 | BrokerSubscriptions.tsx:49 pobiera size=300 bez kolejnej strony. Jeżeli backend dopuszcza więcej, część pozycji znika bez informacji o limicie. Nie ustalono dozwolonego maksimum; dlatego ryzyko kontraktu, nie zaliczona usterka wizualna. |
| Długi tekst dokumentów | MarkdownDisplay: aktualny legal document zawijał tekst. Tabele, szerokie code blocks, bardzo długie linki i błąd dokumentu nie zostały zweryfikowane. |
| Potwierdzenie subskrypcji bez nazwy topic | BrokerSubscriptions.tsx:266 ma generic warning. Warto pokazać wybrany topic, aby decyzja potwierdzała tożsamość; nie wykonano native próby porównawczej. |
| Autokorekta i wejście resetu | DataSourceForm verification Username nie ma kompletu tych samych IME propsów co StartBrokerClientForm. resetPassword sprawdza email z route dopiero przy submit po lokalnej walidacji. Zweryfikować rzeczywistą klawiaturę i wejście bez poprawnego email. |
| Native release, starsze Androidy i hardware | Nie budowano APK/ABI, nie testowano Androida 7–16, fizycznego tabletu/foldable, FPS, pamięci, startupu produkcyjnego, Bluetooth/urządzeń ani delivery MQTT. Nie są częścią zaliczenia source/runtime powyżej. |

Aplikacja deklaruje portrait. To nie zastępuje audytu dużych okien: [Android 16 dla target SDK 36 domyślnie ignoruje ograniczenia orientacji i rozmiaru na ekranach co najmniej 600 dp](https://developer.android.com/about/versions/16/behavior-changes-16). Pełny landscape, split-screen, desktop windowing, side cutout i hinge **NIEZWERYFIKOWANE**. Root dodaje insets top/bottom; obsługi bocznych wycięć nie dowiedziono. Nie proponuje się blokady większych ekranów jako poprawki A01.

## 10. Kolejność zalecanych poprawek i ponownej weryfikacji

1. **P1/P2 — $impeccable harden / $impeccable document:** A09/A13/A31/A32. Dokończyć migrację starych powierzchni i globalnego feedbacku; uzgodnić instrukcje i testy. Dla Automation zachować pełną paletę 318 kluczy podczas przejścia na nowy bottom sheet. A13 zamknąć przez wycofanie starego mechanizmu, z zachowaniem lokalnych komunikatów i recovery.
2. **P1 — $impeccable adapt:** A01/A02. Doprowadzić docelowe wspólne dialogi do zgodności na 320 × 480 dp/200% i 800 dp, z Cancel/Back oraz bez wyjścia akcji poza ekran. Migracja A31 powinna rozwiązać także A07/A08; sprawdzić A28.
3. **P1 — $impeccable harden:** A04–A06. Przywrócić kontrakt Back, związać zaproszenie z domem i zachować ekran/cache po nieprawidłowym odczycie. Wystarczą istniejące wzorce recovery i walidacji consumed pól.
4. **P1/P2 — $impeccable colorize:** A03/A10–A12. Zachować markę, poprawić konkretne pary kolorów i obsługę motywu; sprawdzić Light/Dark oraz read-only values z rzeczywistych pikseli. A13 naprawić razem z usunięciem overlay A32.
5. **P2 — $impeccable harden:** A15–A21/A23–A26. Lokalne stany walidacji, uprawnienia, wzajemne pending guards, accepted navigation i semantyka. Dla każdej mutacji failed read/refresh może powtarzać wyłącznie bezpieczny krok odtwarzania. Rozróżnienie nazw A22 ma jednego właściciela w zakresie 6.
6. **P2/P3 — $impeccable layout / $impeccable typeset / $impeccable clarify:** A14/A22/A27/A29/A30. Położenie create action, rozróżnienie operacji i pełne czytelne komunikaty; bez zmiany opaque keys.
7. **Weryfikacja — $impeccable audit:** ponowić po poprawkach; uzupełnić jawne luki z sekcji 9, zwłaszcza role i TalkBack. Test adaptera nie zastępuje obrazu i gestu Androida.
8. **Ostatni etap — $impeccable polish:** porównać nagłówki, odstępy, wrapping i hierarchię działań w obu motywach po zakończeniu poprawek funkcjonalnych.

Poprawki można zlecić pojedynczo albo w wybranych grupach. Ten raport nie wprowadza żadnej z nich.

### 10.1. Jednoznaczne przypisanie wszystkich ustaleń do zakresów

Każdy z ośmiu punktów sekcji 10 odpowiada jednemu issue. Zakresy 1–6 mają rozłączne przypisanie odpowiedzialności za **wszystkie 32 ustalenia**, także P3. Zakresy 7–8 sprawdzają całość i nie zastępują wykonania poprawek. Jeżeli migracja wspólnego komponentu usuwa też skutek opisany w innym zakresie, jego właściciel nadal musi zweryfikować konkretny przypadek i wskazać dowód.

| Zakres / punkt sekcji 10 | Ustalenia do rozwiązania przez właściciela | Zależności i współdzielone miejsca |
| --- | --- | --- |
| 1 — harden / document | A09, A13, A31, A32 | Ustala docelowe warianty i usuwa sprzeczne reguły/testy. Posiada migrację IconSelector/SenswaveModal i globalnego feedbacku; zachowuje pełną paletę Automation oraz lokalne błędy. |
| 2 — adapt | A01, A02, A07, A08, A28 | Docelowe dialogi i sheets po zakresie 1. Nie odtwarzać wycofywanego Dialog ani default browsera, aby osobno poprawić ich geometrię. Testy dawnych objawów muszą przejść na nowej implementacji. |
| 3 — harden | A04, A05, A06 | Może powstawać równolegle z migracją UI, przy uzgodnionych granicach wspólnych plików. Posiada Back, tożsamość zaproszenia oraz cztery granice walidacji odczytu opisane w A06. |
| 4 — colorize | A03, A10, A11, A12 | Posiada kolory, read-only prezentację i wybór motywu. Końcowe pomiary dotyczą komponentów po migracji; A13 należy do zakresu 1. |
| 5 — harden | A15, A16, A17, A18, A19, A20, A21, A23, A24, A25, A26 | Koordynować HomeProvider/feedback z zakresem 1 oraz DeviceForm/odczyty z zakresem 3. Retained callbacks i accepted recovery muszą zachować aktualne kontrakty. A22 należy do zakresu 6. |
| 6 — layout / typeset / clarify | A14, A22, A27, A29, A30 | Układ i teksty na docelowych kontrolkach po zakresach 1–2. Zmiany WhatsNew i formularzy uzgodnić z ich właścicielami, bez równoległego nadpisywania tych samych fragmentów. |
| 7 — audit | Ponowna weryfikacja A01–A32 oraz luk z sekcji 8–9 | Po wykonaniu zakresów 1–6. Każda pozostała usterka wraca do właściwego zakresu; nie uznawać samej obecności issue lub przechodzącego starego testu za rozwiązanie. |
| 8 — polish | Końcowa spójność i brak regresji A01–A32 | Po zakresie 7. Po zmianach wykończeniowych wykonać odpowiednie ponowne sprawdzenie Androida; nowe lub nadal otwarte problemy blokują uznanie całej kolejki za zamkniętą. |

### 10.2. Warunki zamknięcia issues i całej kolejki

- Issue wdrożeniowe jest zakończone po faktycznej poprawce wszystkich przypisanych IDs i zapisaniu dowodów weryfikacji; samo przeniesienie kodu, usunięcie komunikatu lub zmiana starego testu nie wystarcza.
- Dla każdego ID odnotować plik/commit poprawki, wynik adekwatnego testu i wymaganej próby natywnej. A09 wymaga zgodnych instrukcji i oczekiwań testów. A31/A32 wymagają braku ponownego wejścia w stare UI/toasty na całym next-dev, w tym przez stany błędu i spóźnione odpowiedzi.
- Sprawdzić wszystkich callerów zmienianych wspólnych komponentów. Zachować role, opaque keys i dotychczasowe zabezpieczenia mutacji; zaakceptowane POST/PUT/DELETE nie mogą być ponawiane przez Retry nawigacji lub odczytu.
- Wykonać wymagane repozytoryjne checki oraz próby Androida odpowiednie do zmiany. Dla geometrii i nakładek uwzględnić 320/448/800 dp, Light/Dark, 100–200% tekstu, IME, Safe Area, Cancel/Back i dostępność; konkretne braki dowodu pozostają oznaczone.
- Zakres 7 musi rozliczyć **32/32 IDs** i jawne luki z sekcji 8–9. Blokady danych, roli lub urządzenia są otwartym ograniczeniem, a nie podstawą oznaczenia niezweryfikowanego problemu jako naprawionego.
- Cała kolejka jest zakończona dopiero po poprawkach, ponownym audycie i końcowej weryfikacji po polish. Utworzenie issues porządkuje pracę; nie zmienia statusu usterek w tym raporcie na rozwiązane.

## 11. Kontrole audytu i artefakty dowodowe

| Kontrola | Wynik / granica |
| --- | --- |
| Pełny graf tras | Dokładne dopasowanie 46 unikalnych plików do src/app; żadna lokalna trasa ekranowa ani alias nie zostały pominięte. |
| Pełny rejestr komponentów | Dokładne dopasowanie 135 plików TSX; 122 osiągalne Android, 12 osieroconych, 1 web-only. |
| Rejestr nakładek | 42 rodziny/konteksty, z wymienionymi zagnieżdżonymi selektorami i osobnym statusem native. Nie jest to licznik niezależnych implementacji Modal. |
| Kontrole handlerów Home | Ponownie uruchomiono lokalny /tmp/ui-audit-home-checks.mjs: 2 grupy asercji potwierdziły Back trap i opis kodu niewłaściwym domem. Bez sieci. |
| Kontrole handlerów Device | Ponownie uruchomiono /tmp/ui-audit-device-proof.mjs: 4 grupy asercji potwierdziły role/accepted return oraz trzy render failures. Bez sieci. |
| Kontrole modułu sources | Osobny przebieg audytu potwierdził rzeczywistym adapterem trzy required-edit przypadki bez błędu oraz wyjątek subscriptions.map. Root przeczytał przyczyny; tych dwóch odtworzeń nie uruchamiał ponownie. |
| Obliczenia kontrastu | sRGB/WCAG z rzeczywistych tokenów, dla A11 dodatkowo pełne piksele z PNG. To nie jest pełny Accessibility Scanner ani certyfikacja. |
| Bieżący runtime | Native client + Metro; bez React Native Web. Obserwowane stany i niezweryfikowane kombinacje są zapisane w sekcji 8. |
| Zakres kontroli końcowej raportu | Sprawdzono unikalność i kompletność rejestrów, numerację 32 ustaleń, lokalne linki, istniejące pliki/lokalizacje, whitespace diff oraz brak zmian poza raportem. |
| Checki kodu a etap audytu | Podczas pierwszego audytu nie wykonywano pełnych checków ani buildów, ponieważ nie zmieniano kodu i nie tworzono commita. Przed publikacją raportu wykonano wymagane pnpm typecheck i pnpm lint (oba exit 0) oraz pnpm test:poc (103/103, zero failures/skips). Nie wykonywano lokalnego builda APK. Te wyniki potwierdzają stan bazowego kodu, a nie usunięcie opisanych usterek. |

Wybrane natywne materiały w /tmp/senswave-ui-audit/:

- account-dialog-800-final.png / .xml — A01, Cancel poza dialogiem.
- delete-device-dialog-320-dark-200.png / .xml — A02, insets i obcięta akcja.
- operation-details-320-dark-130.png — A11, wygaszone wartości.
- subscription-add-448-light.png — A14, pozycja CTA.
- device-icons-448-light.png oraz legacy-icons-448-light.png — A31, nowy sheet Device i dawny pełnoekranowy browser Automation na tym samym commicie.
- option-modal-ime-320-dark-130.png — A28, skupione pole i IME.
- color-dragged-448-light.png oraz color-after-cancel-final.png — lokalny draft i anulowanie.
- home-map-ready.png oraz map-panned-448-light.png — załadowana mapa i rzeczywisty pan, bez zapisu.
- legacy-operation-alias-448-light.png — wynik kompatybilnego przekierowania.

Wnioski o realnym clippingu opierają się na obejrzanych obrazach, a nie samym JSX. Wnioski z adapterów są oznaczone jako logika, a niewymuszone widoki pozostają jawnie niezweryfikowane.

## 12. Uzupełnienie: usunięcie legacy UI z next-dev

Pierwszy przebieg obejmował stare komponenty, ale zgłaszał przede wszystkim ich konkretne wady: A02, A07/A08/A27 oraz A13. Nie ustanawiał osobnego kryterium „żadne dawne UI ani globalne toasty”. Dodatkowo istniejące instrukcje nakazywały zachowanie browsera Automation. Po doprecyzowaniu użytkownika **sama aktywna obecność dawnego interfejsu jest niezgodnością migracji**, niezależnie od tego, czy dana kontrolka mieści się na ekranie.

Poniższe porównanie używa tych samych źródeł next-dev i obu lokalnych punktów odniesienia main podanych w sekcji 2. Nie uruchamiano ponownie emulatora: kod się nie zmienił, a wcześniejsze obrazy pokazują oba rzeczywiście używane warianty selektora. Uzupełnienie dodaje źródła, porównanie kluczy i wykonane adaptery; nie rozszerza pokrycia TalkBack ani natywnych stanów mutacji.

### A31 — P1 — W next-dev nadal są aktywne dawne warianty UI z main

**Kategoria:** spójność design systemu / kompletność migracji. **Standard:** doprecyzowana instrukcja użytkownika dotycząca całego next-dev. **Werdykt:** FAIL.

| Aktywna rodzina | Dokładne wejścia i lokalizacje | Dowód starej implementacji | Wymagana migracja |
| --- | --- | --- | --- |
| IconSelector default | `src/components/automations/AutomationForm.tsx:253` → `/automation/add` i `/automation/details`; brak variant. `src/components/common/IconSelector.tsx:57,84,222,318,322`. | Default wybiera stary preview, poziomy quick strip, Browse, search i pięciokolumnowy browser w pełnoekranowym SenswaveModal. Brand otoczenia formy nie zmienia środka selektora. R: `legacy-icons-448-light.png`; poprawny Automation details pozostaje K. | Kompaktowe pole i czterokolumnowy BottomSheetSelect jak Create Home, z pełnym właściwym zbiorem Automation. Zachować klucze, disabled/read-only, wybrany historyczny klucz, Cancel/Back i fokus. |
| SenswaveModal default / WhatsNewModal | `src/components/common/SenswaveModal.tsx:29,33,53,71`; `src/components/common/WhatsNewModal.tsx:85`; `src/app/(app)/index.tsx:117`. Także browser ikon powyżej. | WhatsNewModal jest bajtowo identyczny z oboma main. Powłoka nadal ma dawny 80 dp nagłówek, centrowany tytuł, 15 dp gutters i mały Close; nowa gałąź brand istnieje obok. WhatsNew pokazuje się po niezgodności zapisanego numeru wersji, więc nie jest osierocony. | Dla treści What's New zastosować aktualny system powłoki i typografii. Ikony przenieść do bottom sheetu; samo brand w SenswaveModal nadal pozostawia pełnoekranowy modal. Zachować cykl wersji i anulowanie. |
| ConfirmDialog → Dialog | `src/components/common/ConfirmDialog.tsx:30`; `src/components/common/Dialog.tsx:73,142,169,181`; `/device/details` `:455` i `src/components/dataSource/subscriptions/BrokerSubscriptions.tsx:266` → `/dataSource/details`. | ConfirmDialog jest bajtowo identyczny z main. Dialog dostał korektę koloru/tekstu/48 dp, lecz zachował panel 85%/min280/max560, radius28 i poziome zaokrąglone akcje. To nadal dawny dialog, a nie lokalny Reusables AlertDialog. R: Delete Device; usuwanie subskrypcji K. | Istniejący native Modal + named PortalHost + Reusables AlertDialog z przewijanym body i pionowymi brand actions, jak w RemoveAccountDialog. Zachować tożsamość usuwanego obiektu, Cancel/Back i dotychczasowe zabezpieczenia mutacji. |

Trzy rozbudowane rodziny występują na pięciu powierzchniach tras: `/`, `/automation/add`, `/automation/details`, `/device/details`, `/dataSource/details`. SenswaveModal i IconSelector współdzielą powłokę; nie są dwiema niezależnymi migracjami tego samego browsera. A02/A07/A08/A27 opisują dodatkowe konkretne skutki tych pozostałości.

**Pozostałe aktywne pliki identyczne z main też są jawnie odnotowane:** `src/components/common/Text.tsx`, `Divider.tsx`, `Loading.tsx`, `Markdown.tsx`. Razem z ConfirmDialog i WhatsNewModal daje to **6 aktywnych komponentów TSX bajtowo identycznych z main**, spośród 15 identycznych plików komponentów ogółem. Pozostałe 9 jest nieosiągalne. To osobna miara od liczby dawnych rozbudowanych powierzchni: niewielki wrapper może być stary nawet bez charakterystycznej karty lub modala.

| Niezmieniony helper | Rzeczywiste użycie | Konsekwencja wymagania |
| --- | --- | --- |
| common/Text | M.in. LegalDocumentView, consent/maintenance/confirmEmail, podsumowania warunków/wyników i starsze powłoki. `src/components/common/Text.tsx:50` nadal domyślnie ustawia trzy linie i stare role kolorów. | Ująć w migracji typografii do aktualnych prymitywów/native Text i ról. Zachować jawnie potrzebne ograniczenia tekstu oraz pełne komunikaty; nie zmieniać hurtowo wszystkich layoutów przez zmianę samego defaultu. |
| common/Divider | `src/components/user/LegalDocumentView.tsx:2`; wspólne publiczne/prywatne dokumenty. | Zastąpić aktualnym separatorem lub jawnie utrwalić jego docelową implementację w systemie. Wcześniejszy audyt nie zgłaszał samego pochodzenia jako defektu. |
| common/Loading | Wspólny private layout, Home, device/dashboard/widget/operation i wybrane recovery. | Ujednolicić wrapper oraz domyślne rozmiary/role z obecnym systemem, zachowując loading i inline recovery. Sam natywny ActivityIndicator pozostaje prawidłowym prymitywem. |
| common/Markdown | `src/components/user/LegalDocumentView.tsx:3`; wrapper zainstalowanego MarkdownDisplay. | Przenieść oprawę i role do docelowego systemu; biblioteka renderująca dokument nie staje się zbędna przez usunięcie starego wrappera. |

Prosty charakter helpera nie stanowi automatycznego wyjątku od doprecyzowanego zakazu. Raport oddziela jego pochodzenie od dowodu widocznej niespójności, aby migracja obejmowała także te miejsca bez nieuzasadnionego przepisywania logiki domenowej.

**Nazwy współdzielonych plików nie są wystarczającym dowodem legacy:** aktywne common/Button/Input/InputNumber/PasswordInput i DefaultHeader korzystają już z branchy auth/brand, SimpleItemList z ListRow, a Slider z obecnego natywnego komponentu. Switch ma w aktualnych callerach jawne nowe kolory i wymiary. Nie wolno zastąpić ich dawnymi wariantami tylko dlatego, że wrapper nadal je eksportuje. Zachowano **8 grup nieaktywnych starych branchy**: Header, Button, Input, InputNumber, PasswordInput i preview AutomationTile/OperationTile/DataSourceTile. Są ryzykiem ponownego użycia, a nie dowodem obecnego renderowania.

**Poprawka A31:** zakończyć migrację wszystkich aktywnych dawnych wariantów i helperów UI; zablokować ich ponowne użycie w next-dev oraz zaktualizować instrukcje/testy. Nie zastępować backendowych kluczy ikon nazwami nowych glifów. Sugerowany kierunek: `$impeccable harden`, następnie `$impeccable adapt` dla docelowych nakładek.

### A32 — P1 — Stary globalny RootToast nadal może wystąpić w aplikacji

**Kategoria:** spójność feedbacku / kompletność migracji. **Standard:** brak dawnych globalnych toastów w całym next-dev. **Werdykt:** FAIL.

**Lokalizacja:** `src/app/_layout.tsx:84,87`; `src/contexts/ToastProvider.tsx:9,96,103,104,107,123`; producenci `src/contexts/domain/HomeProvider.tsx:185,194,201,217,280` i `src/contexts/HttpClientProvider.tsx:109,117,136`.

Root nadal montuje RootSiblingParent i ToastProvider. Renderer zachowuje ten sam mechanizm co main: Keyboard.dismiss, RootToast.show u dołu na 4000 ms, shadow i stare role success/error/info. next-dev dodał selektywną blokadę ścieżek, a nie wycofanie starego mechanizmu. W package.json pozostają `react-native-root-toast` 3.6.0 i `react-native-root-siblings` 4.1.1.

**Pełna macierz 46 tras:** wykonanie rzeczywistego ToastProvider w istniejącym harnessie potwierdziło, że **43 trasy tłumią wywołania, a 3 przepuszczają**: `/`, `/home/share`, `/dataSource/details`. To dokładnie trzy niechronione trasy z rejestru 8.1; pozostałe 43, włącznie z aliasem, są chronione. Dowolna nowa/nieznana ścieżka spoza tablicy też domyślnie przepuszcza. Próba z `/profile` sprawdza taki fallback; nie jest to istniejący ekran aplikacji. Niezbadanej normalizacji trailing slash nie uznaje się za dodatkową trasę.

| Osiągalny scenariusz | Łańcuch i warunki | Dowód |
| --- | --- | --- |
| Home start, konto bez domu | Private layout montuje HomeProvider; initializeCurrentHome bez silent → 404 → info „Create your first home!”. | Rzeczywisty handler HomeProvider + ToastProvider; overlay i Keyboard.dismiss potwierdzone w adapterze. NoHomeScreen nie zastępuje tej emisji. |
| Home pull-to-refresh lub inicjalizacja z błędem | `src/app/(app)/index.tsx:51` wywołuje initializeCurrentHome bez silent. Nieudany odczyt current/matching home lub wyjątek uruchamia httpError/error. | 500/null response pokazuje connection toast. 404 ponawia info. Stan cached nie blokuje emisji. |
| Spóźniona inicjalizacja Home | Domyślny odczyt może skończyć się już na `/home/share` lub `/dataSource/details`. ToastProvider ocenia bieżący pathname, nie właściciela requestu. | Źródła + adapter spóźnionego httpError: komunikat może przejść między dwiema niechronionymi trasami. Na chronionym celu zostaje stłumiony. |
| Pierwotna odpowiedź HTTP 403 | Wspólny HttpClientProvider robi logout, a potem toast.httpError(original403). Może dotyczyć zaproszenia, odczytu/ustawień źródła, brokera lub subskrypcji. | **Zależne od kolejności nawigacji:** toast może wystąpić, zanim pathname przejdzie do `/start`; jeśli redirect zdąży pierwszy, emisja jest tłumiona. Adapter potwierdził oba warianty. Silent w providerze wyższego poziomu nie blokuje tego inner call. |
| Co dziesiąta nieudana odnowa tokenu od resetu licznika | Dowolny authenticated caller, początkowe 401 i null refresh. Na niechronionej trasie HttpClientProvider wysyła „Please check your internet connection.”. | Adapter na `/home/share`: dziewięć prób bez toastu, dziesiąta z toastem. Udany request lub refresh resetuje licznik; nie jest to bezwarunkowo dziesięć kolejnych requestów każdego rodzaju. |

Zwykłe 400/404/408/500 z HttpClientProvider **same nie emitują** overlay. Także 403 otrzymane dopiero z bezpośredniego retry po udanym token refresh omija pierwotną gałąź 403. Te rozróżnienia sprawdzono adapterem; raport nie przypisuje toastu każdemu błędowi sieci.

Pozostałe trzy konsumery useToast istnieją, lecz nie mają obecnie własnej niechronionej ścieżki: produkcyjne odczyty UserProvider używają silent, OperationFormProvider działa na dwóch chronionych trasach, a dawny non-inline DataSourceStateGet występuje tylko w nieużywanym preview DataSourceTile. Wszystkie produkcyjne refreshRooms oraz init po Create/Join/Delete/Leave Home są silent. Nie zgłasza się ich jako dodatkowych dzisiejszych wycieków. Nadal należy usunąć te stare połączenia podczas migracji, aby nie wracały przy nowych callerach.

**Wpływ:** losowy względem aktualnego zadania overlay, automatyczne schowanie klawiatury, powielanie lokalnego błędu i niespójne zachowanie zależne od trasy. Udział 3/46 nie zmienia globalnego kryterium akceptacji.

**Poprawka A32:** wycofać centralne emitowanie RootToast na całym next-dev, także na nieznanych trasach i po opóźnionych odpowiedziach. Przenieść potrzebne informacje do lokalnych Result/state/Alert/Retry: Home musi rozróżnić empty od read failure, a błędy sesji mają wracać do właściwego flow. Nie wyciszać błędów bez komunikatu i recovery. Po sprawdzeniu callerów usunąć zbędne importy, montowanie providera i zależności. Samo dopisanie trzech ścieżek do blokady lub naprawa kolorów A13 nie stanowi zakończenia migracji. `$impeccable harden`.

Dashboard-scoped WidgetCommandSnackbar, inline alert kafelka Home, lokalny Reusables Alert i LogBox nie są tym starym mechanizmem. Ich lokalność i istniejące zasady retry należy zachować.

### 12.1. Wszystkie selektory i porównanie list ikon z main

Odnaleziono **6 rzeczywistych miejsc JSX IconSelector**. Zestaw ikon i rodzaj kontenera to niezależne kontrakty: nowy bottom sheet nie powinien przypadkowo przejąć listy innego zasobu. W starym main quick-listy nie ograniczały browsera; każdy caller dodatkowo udostępniał AllIcons.

| Kontekst i źródło | Obecna prezentacja | Stary main: quick / browser / suma unikalnych | Obecny zbiór | Wynik porównania |
| --- | --- | ---: | ---: | --- |
| Home create/details — `src/components/home/HomeForm.tsx:168` | Brand BottomSheetSelect, backend homes catalog. | 11 / 318 / 318 | Źródło/fixture 22; runtime payload NIEZWERYFIKOWANY. | Stare quick11 zachowane w tej samej względnej kolejności; +11 względem quick. Względem całego starego wyboru +11/-307. |
| Device create/details — `src/components/device/DeviceForm.tsx:484` | Brand BottomSheetSelect, backend devices catalog. | 20 / 318 / 321 | Źródło/fixture 36; runtime payload NIEZWERYFIKOWANY. | Stare quick20 zachowane w tej samej względnej kolejności; +16 względem quick. Względem całego starego wyboru +14/-299. |
| Dashboard create — `src/components/device/dashboards/AddDashboardForm.tsx:231` | Brand BottomSheetSelect, lokalny kontekst. | 16 / 318 / 319 | 16 | Dokładnie te same quick keys i kolejność. Dawny pełny wybór zmniejszony o 303 klucze. |
| Dashboard details — `src/components/device/dashboards/DashboardForm.tsx:169` | Brand BottomSheetSelect, lokalny kontekst. | 16 / 318 / 319 | 16 | Dokładnie te same quick keys i kolejność. Unchanged icon nie trafia do PATCH; zapisany klucz spoza palety zachowany. |
| Radio option — `src/components/device/widgets/forms/Radio/RadioOptionFormModal.tsx:145` | Brand BottomSheetSelect, lokalny kontekst. | 15 / 318 / 319 | 15 | Dokładnie te same quick keys i kolejność. Dawny pełny wybór zmniejszony o 304 klucze. |
| Automation create/details — `src/components/automations/AutomationForm.tsx:253` | **Dawny quick strip + pełnoekranowy browser**, nie bottom sheet. | 14 / 318 / 318 | 14 quick + 318 browser | Obie listy i ich kolejność identyczne z main. Nieprawidłowa prezentacja A31; zestaw nie został zgubiony. |

Dashboard `apps-outline` i Radio `water-outline` nie występują w AllIcons318, stąd historyczna suma319. Device quick `wifi-outline`, `tv-outline`, `water-outline` też są poza globalną listą, stąd321. Home quick11 i Automation quick14 są podzbiorami AllIcons. Nie wolno uprościć tych liczb przez założenie, że quick-lista zawsze zawiera się w pełnym browserze.

**Porównane źródła Home/Device:** sibling backend `../next-backend` na `a1fbac015dc48706028b4abfd525843c107d0e99` (21 października), pliki HomeIconCatalog.cs / DeviceIconCatalog.cs, jego docs/resource-icon-contract.json oraz mobile `tests/fixtures/resource-icon-geometry.json`. Tablice i metadata fixture/kontraktu są zgodne, a klucze C# mają tę samą kolejność. To dowód zgodności sprawdzonych źródeł, **nie odpowiedzi aktualnie wdrożonego API**. Nie pobierano tokenów, nie wykonywano requestów i nie utrwalano payloadu bieżącej sesji. Zrzut samej siatki nie dowodzi tożsamości opaque keys.

Dokładne dodatki względem dawnych quick-list:

- Home +11: `home`, `building`, `building-2`, `factory`, `warehouse`, `castle`, `hotel`, `store`, `map-pin`, `trees`, `sun`.
- Device +16: `lock-outline`, `key-outline`, `shield`, `plug-outline`, `zap-outline`, `fan-outline`, `cpu-outline`, `radio-outline`, `laptop`, `server`, `cloud`, `battery`, `droplet-outline`, `gauge`, `box`, `wrench`. Key i radio były już w dawnym global browserze, więc nowych wobec całej dawnej oferty jest14.
- Dashboard16, Radio15, Automation quick14, shared DefaultIcons6 i AllIcons318: **zero zmian kluczy lub kolejności, zero duplikatów** między main, origin/main i next-dev. SHA-256 AllIcons, klucze oddzielone newline z końcowym newline: `b5538152ae69a758b62aaa1ac372b195690f1445ce0351503cd7ea939dd92c51`.

Wszystkie 22/36 kluczy sprawdzonych katalogów źródłowych mają mapping w `src/utils/resourceIcons.ts:139,201`; nie znaleziono brakującego glifu dla tych zbiorów. Home/Device renderuje Lucide przez resource-aware Icon, a Dashboard/Radio/Automation nadal Ionicons przez gałąź bez resource (`src/components/common/Icon.tsx:384,392`). Zainstalowany glyph map zawiera wszystkie318 globalnych nazw i klucze kontekstowe. Jest to jawna różnica warstwy symboli, niezależna od formy sheetu; nie uzasadnia zmiany danych zapisanych na backendzie.

Ograniczenie Dashboard/Radio do16/15 oraz Home/Device do katalogów zasobów jest zapisane w bieżących kontraktach. Sam diff szerszej dawnej oferty nie został policzony jako błąd: potwierdza jednak, że „ta sama lista” oznacza tutaj zachowanie dawnych quick keys, a nie całego starego browsera. Jeśli produkt ma przywrócić szerszy wybór, wymaga to osobnego uzgodnienia zestawów/API; nie należy po cichu przywracać starego kontenera.

**Istotna pułapka migracji Automation:** `IconSelector.tsx:84` wybiera dla brand bez katalogu tylko iconList. Dodanie samego variant=brand do aktualnego AutomationForm zawęziłoby **318 → 14**, usuwając304 dotychczasowe wybory z listy. Poprawka musi połączyć nową prezentację z pełnym zamierzonym zbiorem318 i zachować stare wybrane/historical keys. Dla318 elementów sprawdzić wydajność otwarcia i scrollu; obecny brand renderOptions/map nie jest dowodem płynności tak dużej palety. Nie zastępować Automation katalogiem Home/Device.

### 12.2. Gdzie instrukcje i testy kierują AI do starego UI

| Miejsce | Zapis / zachowanie | Problem wymagający usunięcia w przyszłej zmianie |
| --- | --- | --- |
| `docs/agent-guide/interface.md:464` | „Existing icon-selector callers keep the legacy appearance.” W tym samym punkcie Home wymaga czterech kolumn „without search”. | Bezpośredni nakaz zachowania starego UI poza Home. Git blame wskazuje d45709ca, 19 października. |
| `docs/agent-guide/interface.md:514,521` | Home/Device mają quick strip i searchable browser; „Automation retains its existing global browser.” | Pierwsza reguła nie odpowiada obecnym brand callerom, druga utrwala stary Automation. Końcowy wyjątek dodał4855e9a8, 28 października; to nie domysł na podstawie nazwy pliku. |
| `docs/agent-guide/api-and-data.md:232,242` | Powtarza quick/full search i „Automation retains its existing global icon browser.” | Miesza zestaw globalnych kluczy z obowiązkiem zachowania dawnego browsera. Zachowanie danych trzeba zapisać osobno od prezentacji. |
| `docs/agent-guide/repository.md:12` | „Existing common wrappers preserve their native APIs and appearance.” | Nie określa, że dopuszczalna jest wyłącznie docelowa gałąź. Sama zgodność API nie zatwierdza starej oprawy. |
| `docs/agent-guide/interface.md:111,531`; `AGENTS.md:60` | Zakaz toastów formułowany dla konkretnych flow i tras. | Brak globalnego warunku next-dev oraz zasady dla nowych tras; istniejący ToastProvider zachowuje model wyjątków. |
| `docs/agent-guide/interface.md:539,545` | Tabela Existing native components nadal reklamuje Modal i HorizontalSelector; pierwszy jest nazwą historycznego providera, drugi nie ma aktywnego callera. | Katalog miesza aktualne prymitywy ze starymi lub nieistniejącymi gotowymi kontrolkami. Nie może być listą rekomendacji do nowych ekranów. |
| `tests/iconSelector.test.mjs:162`; `tests/automationCreate.test.mjs:376,390` | Test „legacy Automation selectors retain the global full browser”; dwie asercje variant != brand. | Testy **wprost wymuszają stary selektor**, więc samo kierowanie się zielonymi testami utrwala problem. Zachować testy exact keys, zmienić oczekiwanie kontenera. |
| `tests/automationCreate.test.mjs:649,693` | Anulowanie szuka Browse all icons i SenswaveModal. | Przenieść próbę na nowy sheet, zachowując niezmieniony klucz po Cancel. |
| `tests/feedback.test.mjs:260,319,329,390`; `tests/dataSourceList.test.mjs:378` | Oczekiwanie default getter toastu i schowania klawiatury; fallback zachowuje globalne feedback; dawny status reader domyślnie ma toast. | To celowo zachowana stara polityka. Część testuje nieaktualną `/profile` lub nieosiągalny preview, więc nie dowodzi wycieku na aktywnej liście; nadal sprzeczna z nowym globalnym invariantem. |

Są więc konkretne sprzeczności w repozytorium i konkretne asercje, a nie wyłącznie ogólna skłonność AI do kopiowania starego komponentu. Poprzedni raport powinien był wyraźniej odróżnić zachowanie wymagane przez te stare zapisy od zakończenia migracji oczekiwanego przez użytkownika.

Proponowana treść nadrzędnej zasady do AGENTS.md i UI policy, do wprowadzenia dopiero w zadaniu zmiany instrukcji:

> Na next-dev każdy aktywny ekran, podformularz, modal oraz stan błędu i recovery używa aktualnego natywnego design systemu. Dawne warianty UI z main są wycofane; obecność pliku lub eksportu legacy nie uprawnia do użycia go w nowym ani migrowanym flow. Przed użyciem wrappera sprawdź faktyczny wariant renderowania. Zmodernizowany wrapper o zachowanym API korzysta wyłącznie z docelowej gałęzi; pozostałe stare helpery UI wymagają migracji.
>
> Wszystkie pola wyboru ikon, włącznie z Automation create/details, używają kompaktowego pola i czterokolumnowego BottomSheetSelect jak Create Home. Dane są odrębne: Home/Device z odpowiednich katalogów API, Dashboard16/Radio15 zgodnie z kontraktem, Automation z pełnego zamierzonego zbioru318. Zachowaj exact opaque keys, wartości historyczne i anulowanie. Nie zamieniaj pełnego zbioru na dawną quick-listę.
>
> Stary globalny RootToast i powiązane automatyczne Keyboard.dismiss nie występują na żadnej trasie next-dev, także nowej, nieznanej, podczas inicjalizacji i po spóźnionej odpowiedzi. Feedback ma lokalnego właściciela, czytelny stan błędu i Retry. Dashboard-scoped command snackbar pozostaje odrębnym zatwierdzonym wzorcem.
>
> Instrukcje, katalog komponentów i testy nie mogą wymagać starej prezentacji. Testy migracji obejmują rzeczywiste callery wariantów, kompletność zestawów ikon, brak globalnej emisji na całym drzewie tras i zachowanie lokalnych błędów.

Po tej regule należy usunąć przeciwne zdania, rozdzielić katalog aktualnych prymitywów od legacy, doprecyzować jeden wzorzec search oraz poprawić stare oczekiwania testów. Dopisanie nowego akapitu bez usunięcia wyjątków pozostawiłoby konflikt. **W tym audycie AGENTS.md, DESIGN.md, przewodniki i testy nie zostały zmienione.**

### 12.3. Weryfikacja uzupełnienia i dalsze granice

- Root ponownie wykonał `/tmp/ui-audit-legacy-toasts-proof.mjs` na Node z .nvmrc/pnpm: macierz46 tras, HomeProvider404/500, HTTP ordinary failures, oba momenty logout403, próg refresh oraz spóźniona odpowiedź. Asercje charakteryzujące obecne zachowanie przeszły; **potwierdzają obecność wady, nie spełnienie nowego kryterium**. Bez requestów i mutacji backendu.
- Root ponownie wykonał ekstrakcję tablic z main/origin/main/HEAD i porównanie backend C#/contract/mobile fixture. Dokładne liczby, unikalność i kolejność zgodne z tabelą12.1. Osobno porównał135 komponentów:15 identycznych z main,6 osiągalnych.
- Osobny przebieg sprawdził pięć wąskich istniejących testów feedback/status: wszystkie przechodzą, również te wymagające starego feedbacku. Root przeczytał asercje i odtworzył ich kluczowe ścieżki w adapterze, nie uruchamiał ponownie całych suite.
- Ponownie sprawdzono kompletność46 tras/135 komponentów, wszystkie lokalne linki i file/line references,32 unikalne IDs oraz stan repozytorium. Jedyna zmiana to raport.
- **NIEZWERYFIKOWANE w uzupełnieniu:** natywny wygląd i TalkBack starego toastu, payload wdrożonych katalogów API, poprawny zapisany Automation details i nowe próbki na emulatorze. Wcześniejsze ograniczenia z sekcji9 pozostają aktualne. Raport i zielony test zachowujący legacy nie usuwają żadnej z wykrytych pozostałości.
