# Stan refaktoru i redesignu UI na next-dev

Data analizy: 28 października 2026. Audytowany branch: `next-dev`, commit
`4855e9a` (`feat: complete native dashboard and widget flows (#29)`).

## Zakres i sposób oceny

Analiza obejmuje 45 tras ekranów w `src/app`, ich formularze, selektory, listy,
nagłówki oraz obsługę odczytów i mutacji. Pliki `_layout.tsx` sprawdzono jako
konfigurację nawigacji; nie są liczone jako osobne ekrany.

Ocena wynika wyłącznie z kodu. Nie wykonywano weryfikacji widoków przez ADB,
emulator, urządzenie ani przeglądarkę. Uwagi o przewijaniu, klawiaturze i dużym
tekście wskazują ograniczenia implementacji, a nie zaobserwowane zrzuty ekranu.
Kontrole TypeScript, lint i testy przed commitem nie potwierdzają wyglądu UI.

Punktem odniesienia są [polityka UI](agent-guide/interface.md),
[DESIGN.md](../DESIGN.md) i [kontekst produktu](../PRODUCT.md): natywne komponenty,
obecny motyw Senswave, `FormSection`, jeden scroll obsługujący klawiaturę,
lokalne błędy i Retry, czytelne akcje oraz ochrona przed powtórzeniem zapisu.

Statusy w tym dokumencie:

- **Migracja UI**: ekran zachowuje zasadniczo stary układ i sposób interakcji.
- **Dokończenie**: nowy formularz lub wiersze już istnieją, ale otaczający ekran,
  zagnieżdżone kontrolki albo obsługa błędów nadal wymagają pracy.
- **Dopracowanie**: niewielka pozostałość w spójności lub adaptacji układu.
- **Nowe wzorce obecne**: implementacja korzysta już z docelowych wzorców;
  nie oznacza to pełnej walidacji działania i dostępności.

P1 oznacza problem z dostępem do funkcji, zapisem lub odzyskaniem po błędzie.
P2 oznacza dalszą migrację i ujednolicenie, a P3 drobne dopracowanie.

## Najważniejsze ustalenia

Największym zaległym obszarem są automatyzacje: cztery ekrany formularzy oraz
ich dostępność z nawigacji. Istniejące trasy nie oznaczają, że użytkownik może do
nich dojść z obecnego UI. `AutomationList` nie jest renderowany przez żaden ekran,
a do `/automation/add` nie znaleziono przejścia z UI. Obecny
[ekran główny](../src/app/(app)/index.tsx#L117) renderuje listę urządzeń;
[lista automatyzacji](../src/components/automations/AutomationList.tsx#L7)
pozostaje osobnym, niepodłączonym komponentem. Dostęp do tej funkcji trzeba
uwzględnić razem z jej redesignem.

Poza automatyzacjami wymagają pracy wybór źródła danych dla domu, listy źródeł
i operacji, szczegóły operacji, część ustawień urządzenia oraz pomocnicze ekrany
zgód, potwierdzania e-maila, dokumentów prawnych i przerwy technicznej.

Dashboardy, widgety i tworzenie operacji zostały już objęte ostatnim refaktorem.
Nie należy ponownie traktować ich jako całych nieprzeniesionych obszarów.

## Ekrany wymagające pracy

| Priorytet | Trasa / ekran | Status | Brakujący zakres i miejsce implementacji |
| --- | --- | --- | --- |
| P1 | `/automation/add` | Migracja UI | Stary podgląd kafelka, zwykły `ScrollView`, starsze pola i ikonowy przycisk poza treścią. Potrzebny spójny formularz, walidacja inline, zachowanie draftu i zakończenie zaakceptowanego tworzenia. [AutomationForm](../src/components/automations/AutomationForm.tsx#L193), [route](../src/app/(app)/automation/add.tsx#L18). |
| P1 | `/automation/details` | Migracja UI | Ten sam stary formularz, Save/Delete w FAB, błędy przez toasty. Potrzebne sekcje edycji i usuwania, lokalne stany odczytu/Retry oraz poprawne zapisywanie aktualnego draftu. [route](../src/app/(app)/automation/details.tsx#L90), [formularz](../src/components/automations/AutomationForm.tsx#L191). |
| P1 | `/automation/conditions/add` | Migracja UI | Zwykły `View`, stare `Dropdown`/`SwitchDropdown`, walidacja toastami i absolutnie pozycjonowana akcja. Potrzebny keyboard-aware `FormSection`, błędy przy polach i powrót po zaakceptowaniu operacji. [AutomationConditionForm](../src/components/automations/conditions/AutomationConditionForm.tsx#L188). |
| P1 | `/automation/results/add` | Migracja UI | Analogiczny stary układ i przedwczesny powrót. Dodatkowo błędne rozpoznawanie pustej listy operacji. [AutomationResultForm](../src/components/automations/results/AutomationResultForm.tsx#L144). |
| P1 | `/consents` | Migracja UI | Układ z wysokościami 15%/85%, bez scrolla, stare przyciski Cancel/Accept obok siebie. Niepowodzenie `makeConsents()` sygnalizuje tylko toast z providera; brak trwałego błędu na ekranie. Potrzebny skalowalny układ, widoczny pending, lokalne błędy i blokada ponownego wysłania. [consents.tsx](../src/app/consents.tsx#L27), [układ](../src/app/consents.tsx#L73). |
| P2 | `/home/dataSource/select` | Migracja UI | Lista używa już nowych wierszy, ale ekran nadal ma pływającą ikonę Add, spinner zastępujący cały wybór i toasty. Wyjątek jest tylko logowany. Potrzebny wybór w kontekście bieżącego domu, lokalny pending/error i nazwana akcja dodawania. [select.tsx](../src/app/(app)/home/dataSource/select.tsx#L22). |
| P2 | `/device/details` | Dokończenie | Formularz i układ sekcji są nowe; w sekcjach Tile i Presence pozostały stare dropdowny i `OperationSelector`, a brak wymaganej operacji zgłaszany jest toastem. Usuwanie urządzenia również ma tylko toast błędu. Dokończyć kontrolki i feedback bez przebudowy całego ekranu. [DeviceForm](../src/components/device/DeviceForm.tsx#L195), [Tile](../src/components/device/DeviceForm.tsx#L473), [Presence](../src/components/device/DeviceForm.tsx#L683), [delete](../src/app/(app)/device/details.tsx#L77). |
| P2 | `/device/operation/details` | Dokończenie | Wspólny `OperationForm` jest już nowy i read-only. Stara pozostała otoczka: nagłówek, Delete FAB, brak lokalnego Retry i pending przy usuwaniu. Po nieudanym GET renderuje się formularz bez odczytanej operacji. [details.tsx](../src/app/(app)/device/operation/details.tsx#L21), [nowy formularz](../src/components/device/operation/OperationForm.tsx#L262). |
| P2 | `/dataSource/list` | Dokończenie | Wiersze `ListRow` i badge stanu są już ujednolicone. Pozostały FAB, stary nagłówek i brak rozróżnienia błędu pierwszego odczytu od pustej listy z inline Retry. [route](../src/app/(app)/dataSource/list.tsx#L14), [DataSourceList](../src/components/dataSource/DataSourceList.tsx#L44). |
| P2 | `/device/operation/list` | Dokończenie; sprawdzić użycie | Nowe wiersze, stary FAB i toast-only recovery. W źródłach brak przejścia do tej trasy poza rejestracją w Stack. Najpierw ustalić jej rolę względem aktualnego zarządzania operacjami przez `/device/widget/list`. [route](../src/app/(app)/device/operation/list.tsx#L14), [OperationList](../src/components/device/operation/OperationList.tsx#L43). |
| P2 | `/confirmEmail` | Migracja UI | Osobny stary ekran statusu: centrowany `View`, brak przewijania i ograniczenia szerokości, stare CTA. Błąd sugeruje ponowienie, ale jedyna akcja prowadzi do Start. Ujednolicić układ ze stanami auth i pokazać właściwą ścieżkę odzyskania. [confirmEmail.tsx](../src/app/confirmEmail.tsx#L53). |
| P2 | `/privacy`, `/terms`, `/user/privacy`, `/user/terms` | Dokończenie wspólnych widoków | To cztery trasy korzystające z dwóch wspólnych dokumentów. Po błędzie pobrania pozostaje toast oraz pusta treść/wersja, bez Retry. Publiczne nagłówki także zachowują stary układ. Poprawić wspólne komponenty i obie otoczki nawigacyjne. [PrivacyPolicy](../src/components/user/PrivacyPolicy.tsx#L17), [TermsAndConditions](../src/components/user/TermsAndConditions.tsx#L17), [publiczny nagłówek](../src/app/privacy.tsx#L18). |
| P2 | `/maintenance` | Migracja UI | Stary układ z logo w `Tile` i odświeżaniem dostępnym tylko przez pull-to-refresh. Potrzebny spójny ekran statusu, jawna akcja ponowienia oraz treść mogąca rosnąć i przewijać się. [maintenance.tsx](../src/app/maintenance.tsx#L32). |
| P3 | `/user/info` | Dopracowanie | Wiersze `SimpleItemList → ListRow` są już nowe. Pozostał niescrollowalny wrapper z paddingiem 15 i stary nagłówek. Ujednolicić szerokość, odstępy i przewijanie. [info.tsx](../src/app/(app)/user/info.tsx#L37). |

## Błędy przepływu do objęcia refaktorem automatyzacji

Te uwagi nie dotyczą wyłącznie wyglądu. Wynikają z kolejności wywołań i stanu
w obecnej implementacji; nie były odtwarzane na urządzeniu.

1. **Warunek i wynik wracają przed odpowiedzią API.** Formularze wywołują
   asynchroniczny callback bez `await`, od razu dopisują element do lokalnego stanu
   i zwracają `true`. Akcja następnie wykonuje `router.back()`. Dla istniejącej
   automatyzacji odrzucenie zapisu może nastąpić po wyjściu, a element pozostaje
   lokalnie widoczny. Oddzielić dodawanie draftu nowej automatyzacji od zapisu
   istniejącej; w drugim przypadku czekać na zaakceptowanie żądania.
   [Warunek](../src/components/automations/conditions/AutomationConditionForm.tsx#L188),
   [powrót](../src/components/automations/conditions/AutomationConditionForm.tsx#L275),
   [wynik](../src/components/automations/results/AutomationResultForm.tsx#L144).
2. **Tworzenie odmontowuje formularz na czas POST.** `loading` w route zastępuje
   `AutomationForm` przez `Loading`. Po błędzie formularz montuje się ponownie
   z pustymi wartościami. Po sukcesie brakuje rozdzielenia zaakceptowanego
   tworzenia od odzyskiwania odświeżenia/nawigacji.
   [add.tsx](../src/app/(app)/automation/add.tsx#L18).
3. **Save w szczegółach może wysłać poprzednie wartości.**
   `useImperativeHandle` zależy wyłącznie od `loading`, choć udostępniona funkcja
   zamyka wartości pól. Zmiana draftu nie aktualizuje callbacku wywoływanego
   przez FAB. [AutomationForm](../src/components/automations/AutomationForm.tsx#L165).
4. **Jedna operacja urządzenia jest traktowana jako brak operacji.**
   `operationsForSelectedDevice` nie zawiera placeholdera, ale pusty stan sprawdza
   `length <= 1`. Dla jednej operacji pole wyboru wyniku jest ukryte.
   [Budowanie listy](../src/components/automations/results/AutomationResultForm.tsx#L73),
   [warunek renderowania](../src/components/automations/results/AutomationResultForm.tsx#L155).

Przy przenoszeniu sekcji Conditions/Results należy także usunąć konkurujące
kolorowe powierzchnie i ikonowe akcje na rzecz hierarchii sekcji oraz
`ContentSection.headerAction` / `SectionHeaderAction`. Wiersze listy automatyzacji
już korzystają z `ListRow`; nie wymagają powrotu do wcześniejszych kafelków.

## Wspólne pozostałości implementacyjne

- **OperationSelector** dotyczy odnowionych ustawień urządzenia: Switch, Slider,
  Options, Display i Presence. Nadal używa `Dropdown`, małego `ImageButton size24`
  bez nazwy dostępności i toastów przy błędzie pobierania. Naprawić komponent
  wspólnie dla istniejących callerów, zachowując filtrowanie typów i dokładne ID.
  [OperationSelector](../src/components/device/operation/OperationSelector.tsx#L53),
  [kontrolki](../src/components/device/operation/OperationSelector.tsx#L110).
- **Dropdown** ma opcje o stałej wysokości 40 dp i rozwija całą listę bez jej
  przewijania. Pozostałe zastosowania to automatyzacje oraz Tile/Presence.
  W tych miejscach użyć istniejącego pola `BottomSheetSelect` z nazwanymi
  opcjami i targetami 48 dp.
  [Dropdown](../src/components/common/Dropdown.tsx#L44).
- **Stary DefaultHeader** pozostaje na trasach wskazanych powyżej. Domyślny
  wariant ma stałe 80 dp, tytuł ograniczony do jednej linii i mniejszy target Back.
  Wariant `brand` już ma rosnącą wysokość i target 48 dp; zastosować go podczas
  migracji odpowiednich ekranów.
  [DefaultHeader](../src/components/headers/DefaultHeader.tsx#L84),
  [konfiguracja tras](../src/app/(app)/_layout.tsx#L45).
- **Legacy FAB** ma akcje o rozmiarze 44 dp i bez dostępnej nazwy. Pozostał na
  listach źródeł/operacji oraz szczegółach operacji/automatyzacji. Akcje formularzy
  i usuwania przenieść do właściwych sekcji, a akcje list dopasować do ich hierarchii.
  [FAB](../src/components/common/FAB.tsx#L29).
- **Toasty i inline feedback są jeszcze mieszane.** Samo zastosowanie nowych
  pól nie zamyka migracji błędów. Po dodaniu lokalnej obsługi na pozostałych
  trasach trzeba też uzupełnić wyciszanie overlayów w
  [ToastProvider](../src/contexts/ToastProvider.tsx#L9), aby późne odpowiedzi nie
  przykrywały nowego UI.

Pozostawienie pliku w `components/common` samo w sobie nie oznacza starego UI.
Na przykład `InputNumber` w nowych formularzach ma już wariant `auth`.
Podobnie globalny browser ikon automatyzacji jest dopuszczonym wyjątkiem polityki;
nie należy zastępować jego kontraktu paletą Dashboard ani Radio.

## Obszary z nową implementacją

Poniższe trasy mają już podstawową implementację zgodną z obecnymi wzorcami.
Nie ma podstaw do zlecania ich pełnego redesignu wyłącznie z powodu starej nazwy
pliku lub komponentu. Tabela nie jest potwierdzeniem braku błędów.

| Obszar | Trasy | Obecna implementacja |
| --- | --- | --- |
| Auth i reset hasła | `/start`, `/login`, `/register`, `/forgotPassword`, `/server`, `/resetPassword` | Natywny `AuthPanel` / formularz resetu, keyboard-aware scroll, nowe pola, lokalna walidacja i błędy. `/server` pozostaje narzędziem Development. |
| Domy | `/`, `/home/list`, `/home/add`, `/home/join`, `/home/details`, `/home/share` | Nowy dashboard domu i kafelki urządzeń, wybór domu, zaproszenia, tworzenie i edycja, mapa, sekcje źródła/udostępniania i destrukcyjne potwierdzenia. Wyjątek: osobny `/home/dataSource/select` opisany wyżej. |
| Pokoje | `/home/room/add`, `/home/room/details` | Keyboard-aware `RoomForm`, `FormSection` w edycji, walidacja i lokalne odzyskiwanie po błędzie. |
| Tworzenie urządzenia | `/device/add` | Nowy formularz z ikonami z katalogu, wyborem pokoju, błędami inline i akcją w tym samym scrollu. Edycja ma pozostałości opisane osobno. |
| Źródło danych i broker | `/dataSource/add`, `/dataSource/details`, `/dataSource/brokers/startBrokerClient`, `/dataSource/brokers/addSubscription` | Nowe formularze, szczegóły i ustawienia, lokalne błędy/Retry, stany brokera i akcje subskrypcji. Lista i wybór źródła wymagają dokończenia osobno. |
| Dashboard urządzenia | `/device/device`, `/device/dashboard/add`, `/device/dashboard/details`, `/device/dashboard/placeWidget` | Wspólny scroll kontekstu i siatki, wybór dashboardu, nowe formularze, dodawanie z wolnej komórki, gesty placementu i rozdzielenie ról. |
| Widgety | `/device/widget/add`, `/device/widget/details`, `/device/widget/list` | Nowe formularze typów i opcje, odczyt konfiguracji, potwierdzane usuwanie definicji, lista/picker oraz lokalna obsługa błędów. Kontrolki live i edytor koloru także mają nową implementację. |
| Tworzenie operacji | `/device/operation/add` | Nowy formularz wraz z Boolean, Numeric, Options, modalem opcji i edytorem JSON path. Osobne szczegóły/lista nadal wymagają dokończenia. |
| Profil | `/user/profile` | Nowe preferencje, wybór motywu, nawigacja ustawień, lokalne błędy i natywne potwierdzenie usuwania konta. App information i legal views opisano osobno. |

## Proponowana kolejność

1. **Automatyzacje:** przywrócić osiągalne wejście do funkcji, następnie przenieść
   cztery formularze i naprawić wskazane błędy zapisu. Zachować globalne klucze
   ikon oraz kontrakty warunków i wyników.
2. **Zgody:** domknąć ekran bramkujący dostęp do aplikacji, szczególnie błędy
   przyjęcia zgód i skalowalny układ.
3. **Konfiguracja domu/urządzeń:** dokończyć wybór/listę źródeł,
   `OperationSelector`, Tile/Presence oraz szczegóły operacji. Współdzielone
   komponenty poprawiać raz, z uwzględnieniem wszystkich callerów.
4. **Ekrany pomocnicze:** ujednolicić potwierdzenie e-maila, dokumenty prawne,
   przerwę techniczną i App information. Rozstrzygnąć, czy osobna lista operacji
   ma nadal pełnić rolę nawigacyjną.
5. **Końcowe dopracowanie:** sprawdzić spójność nagłówków, targety, błędy
   i ścieżki powrotu po migracji. Ocena wizualna i zachowania natywnego pozostaje
   poza zakresem tego audytu kodu.

Dokument jest listą zaległości z badanego commita, a nie nową specyfikacją API
ani zmianą polityki UI. Przy realizacji aktualizować statusy względem rzeczywistego
kodu; nie oznaczać zadania jako zakończonego wyłącznie na podstawie nowego nagłówka
lub zielonych testów handlerów.

## Weryfikacja przed commitem dokumentu

Na Node `26.12.1` z `.nvmrc` wykonano bez błędów:

- `pnpm typecheck`;
- `pnpm lint`;
- `pnpm test:poc` — 5 plików testowych zakończonych powodzeniem, 0 niepowodzeń.

Sprawdzono także istnienie lokalnych odnośników i wskazanych linii oraz obecność
wszystkich 45 tras w raporcie. Te kontrole nie odtwarzają znalezionych błędów
automatyzacji i nie zastępują osobnych testów przy ich późniejszej naprawie.
