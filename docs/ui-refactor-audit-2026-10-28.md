# Stan refaktoru i redesignu UI na next-dev

Data analizy: 28 października 2026. Audytowany branch: `next-dev`, commit
`4855e9a` (`feat: complete native dashboard and widget flows (#29)`).

## Zakres i sposób oceny

Analiza obejmuje 45 tras ekranów w `src/app`, ich formularze, selektory, listy,
nagłówki oraz obsługę odczytów i mutacji. Pliki `_layout.tsx` sprawdzono jako
konfigurację nawigacji; nie są liczone jako osobne ekrany.

Pierwotna ocena z 28 października wynikała wyłącznie z kodu, bez ADB,
emulatora, urządzenia ani przeglądarki. Aktualizacja z 31 października obejmuje
natywne kontrole pięciu ekranów automatyzacji, opisane w
[raporcie walidacji](superpowers/validation/2026-10-31-automations.md).
Pozostałe ustalenia nadal są oceną kodu; testy handlerów nie potwierdzają wyglądu UI.

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
- **Implementacja i kontrola Android**: ekran ma nową implementację, testy
  handlerów oraz udokumentowane kontrole emulatora; zakres i ograniczenia
  dostępności pozostają w raporcie walidacji.
- **Implementacja; wybrane kontrole Android**: kod i wskazane stany natywne są
  sprawdzone, ale pełna macierz Task 6 pozostaje otwarta.
- **Implementacja; kontrola Android pending**: handlerowo zweryfikowana
  implementacja nie ma jeszcze wystarczającego aktualnego dowodu natywnego.

P1 oznacza problem z dostępem do funkcji, zapisem lub odzyskaniem po błędzie.
P2 oznacza dalszą migrację i ujednolicenie, a P3 drobne dopracowanie.

## Najważniejsze ustalenia

W audytowanym snapshotie największym zaległym obszarem były automatyzacje:
cztery ekrany formularzy oraz ich dostępność z nawigacji. Od tamtej analizy
powstała osobna lista domu i implementacja wszystkich pięciu ekranów automatyzacji.
Aktualna ocena tych ekranów to **implementacja i kontrola Android**.
Emulator potwierdził role, odzyskiwanie po błędach, częściowy zapis, usuwanie,
klawiaturę, oba motywy i targety. TalkBack oraz fizyczne MQTT pozostają
niezweryfikowane; raport dokumentuje także ostrzeżenie dostępności po usunięciu.

Po audycie Tasks 1–5 uzupełniły zgodę, wybór i listę źródeł, konfigurację
urządzenia, szczegóły operacji, potwierdzanie e-maila, dokumenty prawne,
konserwację i informacje o aplikacji. Wybrane stany Android są opisane w
[raporcie Task 6](superpowers/validation/2026-11-03-ui-audit-remainder.md).
Korekta F1/F2/M1/F3 na `8f4f7f4` została zatwierdzona w scoped review; `a705c23`
dodaje krótszą etykietę Email w App Info i jej oczekiwanie testowe. Macierz
ograniczonych przypadków natywnych, kontrole kodu, eksport i cleanup są
zakończone i przypięte do źródła w raporcie. Końcowy przegląd Sol dokumentacji
i dowodów pozostaje pending; TalkBack, prawdziwy backend i sprzęt nie były
testowane.

Dashboardy, widgety i tworzenie operacji zostały już objęte ostatnim refaktorem.
Nie należy ponownie traktować ich jako całych nieprzeniesionych obszarów.

## Stan zidentyfikowanych zaległości

| Priorytet | Trasa / ekran | Status | Zakres, aktualny stan i miejsce implementacji |
| --- | --- | --- | --- |
| P1 | `/automation/list` | Implementacja i kontrola Android | Lista domu i akcje zależne od roli; sprawdzono wejście offline, oba motywy, długą nazwę i targety. [lista](../src/app/(app)/automation/list.tsx). |
| P1 | `/automation/add` | Implementacja i kontrola Android | POST 503 zachowuje draft; ponowienie tworzy jedną aktywną automatyzację. Dolna akcja działa nad otwartym IME. [AutomationForm](../src/components/automations/AutomationForm.tsx), [route](../src/app/(app)/automation/add.tsx). |
| P1 | `/automation/details` | Implementacja i kontrola Android | Sprawdzono role, PUT stanu + błąd PATCH i ponowienie, a także natywny dialog Cancel/Back/confirm z odczytem 200/404. [route](../src/app/(app)/automation/details.tsx), [formularz](../src/components/automations/AutomationForm.tsx). |
| P1 | `/automation/conditions/add` | Implementacja i kontrola Android | Jedna FormSection, pełny katalog i dokładne wartości; natywnie sprawdzono draft, błąd PUT/Retry i lokalny Retry devices. Historia typów oraz brakujące kontrole są rozdzielone w raporcie. [formularz](../src/components/automations/conditions/AutomationConditionForm.tsx), [route](../src/app/(app)/automation/conditions/add.tsx). |
| P1 | `/automation/results/add` | Implementacja i kontrola Android | Dokładny string i lokalny dopisek do draftu z powrotem; Add result dostępne nad IME przy 130% tekstu. Saved-child PUT i pozostałe przypadki pokrywają testy handlerów. [formularz](../src/components/automations/results/AutomationResultForm.tsx), [route](../src/app/(app)/automation/results/add.tsx). |
| P1 | `/consents` | Implementacja; wybrane kontrole Android | Lokalna kontrola zgody, Retry bez ponownego POST, Back/Cancel i czytelne linki/copy. Capture 010 pokazuje wariant 448 dp Light; 148–153 na `a705c23` obejmują pełny tekst przy 320 × 480 dp, błąd odczytu po zaakceptowanym POST, odzyskanie bez drugiego POST i Cancel podczas opóźnionego żądania. [consents.tsx](../src/app/consents.tsx), [raport](superpowers/validation/2026-11-03-ui-audit-remainder.md). |
| P2 | `/home/dataSource/select` | Implementacja; wybrane kontrole Android | Wybór jest związany z bieżącym routowanym domem i rolą Owner. Po zaakceptowanym PUT błąd odczytu pozostaje lokalny; Retry wykonuje sam GET i wraca do Home. Captures 027/028 na `6c44bf4`: jeden PUT, Home GET 3→4. [select.tsx](../src/app/(app)/home/dataSource/select.tsx), [raport](superpowers/validation/2026-11-03-ui-audit-remainder.md). |
| P2 | `/device/details` | Implementacja; wybrane kontrole Android | Natywne Tile/Presence, pełny katalog, lokalna walidacja i częściowe zapisy zachowują istniejące ID. Capture 034 pokazuje końcowe akcje nad Gboard; 107 pokazuje Delete przy 320 dp Dark/font 1.3. Capture 124 pokazuje szeroki układ z limitem 448 dp; 129/130 potwierdzają lokalne Retry po kolekcji 503 i powrót bez powtórzenia zaakceptowanego DELETE. [DeviceForm](../src/components/device/DeviceForm.tsx), [details](../src/app/(app)/device/details.tsx), [raport](superpowers/validation/2026-11-03-ui-audit-remainder.md). |
| P2 | `/device/operation/details` | Implementacja; wybrane kontrole Android | Read-only OperationForm montuje się po zweryfikowanym odczycie; DELETE wymaga członkostwa bieżącego domu i Owner/Manager. Captures 119/121/123 pokazują Cancel Owner, dostępny Delete Manager (bez otwarcia dialogu) i brak Delete dla Display. Captures 127/128 na `8f4f7f4` potwierdzają Retry po zaakceptowanym DELETE i odczycie 503, jeden DELETE i powrót po drugim GET. Wcześniejszy emulator ANR pozostaje niewyjaśniony; późniejsze odczyty nie dowodzą jego usunięcia. [details](../src/app/(app)/device/operation/details.tsx), [raport](superpowers/validation/2026-11-03-ui-audit-remainder.md). |
| P2 | `/dataSource/list` | Implementacja; wybrane kontrole Android | Pełny katalog i row-local status Retry zachowują osobne odczyty. Captures 108/109 na `93d7652` pokazują błąd i Retry przy 320 dp Dark/font 1.3; 110/111 pokazują pełnoszeroki helper oraz alias. Późniejsze korekty nie zmieniły tych stanów. Krótki viewport listy nie był osobno sprawdzany. [route](../src/app/(app)/dataSource/list.tsx), [DataSourceList](../src/components/dataSource/DataSourceList.tsx), [raport](superpowers/validation/2026-11-03-ui-audit-remainder.md). |
| P2 | `/device/operation/list` | Alias kompatybilności; wybrane kontrole Android | Headerless alias przekazuje jawny `deviceId` do `/device/widget/list`; osobny OperationList usunięto, ale zachowano historyczny [plik z audytowanego commita](https://github.com/SenswaveLabs/Mobile/blob/4855e9a89f068d2a439a77e8575bbb6a64bc525d/src/components/device/operation/OperationList.tsx#L43). Capture 065 pokazuje stary operationId-only link bez Delete; capture 111 na `93d7652` — aktualny alias/helper przy wąskim ciemnym układzie. |
| P2 | `/confirmEmail` | Implementacja; wybrane kontrole Android | Lokalna walidacja i Retry/Sign in zachowują scalarową tożsamość i jedno POST. Captures 137/138 pokazują Unicode fixture, błąd i Retry; 156/157 lokalne odrzucenie pustego kodu i Sign in; 159/160 cold development-client flow po wyborze zapamiętanego projektu. Cold release APK i browser domain association są niezweryfikowane. [confirmEmail.tsx](../src/app/confirmEmail.tsx), [raport](superpowers/validation/2026-11-03-ui-audit-remainder.md). |
| P2 | `/privacy`, `/terms`, `/user/privacy`, `/user/terms` | Implementacja; wybrane kontrole Android | Cztery wrappery używają wspólnego LegalDocumentView; lokalne błędy/Retry nie zastępują serwerowej treści i Version. Capture 013 pokazuje public Privacy w Light, a 134/136 i 145/147 końcowe prywatne/publiczne strony przy 320 × 480 dp Dark/font 1.3. Fixture copy jest fikcyjne. [LegalDocumentView](../src/components/user/LegalDocumentView.tsx), [raport](superpowers/validation/2026-11-03-ui-audit-remainder.md). |
| P2 | `/maintenance` | Implementacja; wybrane kontrole Android | Retry i pull-to-refresh współdzielą blokadę, a routowanie czeka na zakończenie initialize i aktualną sesję. Captures 154/155 pokazują version GET 503 i jawne Retry do Start bez auth-refresh POST; capture 139 dokumentuje krótki błąd z opisanym ograniczeniem przejścia. [maintenance.tsx](../src/app/maintenance.tsx), [raport](superpowers/validation/2026-11-03-ui-audit-remainder.md). |
| P3 | `/user/info` | Implementacja; wybrane kontrole Android | Metadane i oba linki prawne pozostają w jednym scrollu. Capture 151 na `a705c23` pokazuje jednowyrazową etykietę Email, pełną wartość i dostępny 48 dp wiersz Privacy przy 320 × 480 dp Dark/font 1.3. [info.tsx](../src/app/(app)/user/info.tsx), [raport](superpowers/validation/2026-11-03-ui-audit-remainder.md). |

## Błędy przepływu znalezione w snapshotie 28 października

Poniższe ustalenia opisują pierwotny audytowany commit, nie aktualną listę
niezaimplementowanych ekranów. Implementacja z 31 października dodaje formularze
i route ownership, a testy handlerów są opisane w
[walidacji](agent-guide/validation.md). Weryfikacja na emulatorze/urządzeniu
pozostaje pending.

Te uwagi nie dotyczą wyłącznie wyglądu. Wynikały z kolejności wywołań i stanu
w audytowanym snapshotie; nie były odtwarzane na urządzeniu.

1. **Warunek i wynik wracają przed odpowiedzią API.** Formularze wywołują
   asynchroniczny callback bez `await`, od razu dopisują element do lokalnego stanu
   i zwracają `true`. Akcja następnie wykonuje `router.back()`. Dla istniejącej
   automatyzacji odrzucenie zapisu może nastąpić po wyjściu, a element pozostaje
   lokalnie widoczny. Oddzielić dodawanie draftu nowej automatyzacji od zapisu
   istniejącej; w drugim przypadku czekać na zaakceptowanie żądania.
   [Warunek](https://github.com/SenswaveLabs/Mobile/blob/4855e9a89f068d2a439a77e8575bbb6a64bc525d/src/components/automations/conditions/AutomationConditionForm.tsx#L188),
   [powrót](https://github.com/SenswaveLabs/Mobile/blob/4855e9a89f068d2a439a77e8575bbb6a64bc525d/src/components/automations/conditions/AutomationConditionForm.tsx#L275),
   [wynik](https://github.com/SenswaveLabs/Mobile/blob/4855e9a89f068d2a439a77e8575bbb6a64bc525d/src/components/automations/results/AutomationResultForm.tsx#L144).
2. **Tworzenie odmontowuje formularz na czas POST.** `loading` w route zastępuje
   `AutomationForm` przez `Loading`. Po błędzie formularz montuje się ponownie
   z pustymi wartościami. Po sukcesie brakuje rozdzielenia zaakceptowanego
   tworzenia od odzyskiwania odświeżenia/nawigacji.
   [add.tsx](https://github.com/SenswaveLabs/Mobile/blob/4855e9a89f068d2a439a77e8575bbb6a64bc525d/src/app/(app)/automation/add.tsx#L18).
3. **Save w szczegółach może wysłać poprzednie wartości.**
   `useImperativeHandle` zależy wyłącznie od `loading`, choć udostępniona funkcja
   zamyka wartości pól. Zmiana draftu nie aktualizuje callbacku wywoływanego
   przez FAB. [AutomationForm](https://github.com/SenswaveLabs/Mobile/blob/4855e9a89f068d2a439a77e8575bbb6a64bc525d/src/components/automations/AutomationForm.tsx#L165).
4. **Jedna operacja urządzenia jest traktowana jako brak operacji.**
   `operationsForSelectedDevice` nie zawiera placeholdera, ale pusty stan sprawdza
   `length <= 1`. Dla jednej operacji pole wyboru wyniku jest ukryte.
   [Budowanie listy](https://github.com/SenswaveLabs/Mobile/blob/4855e9a89f068d2a439a77e8575bbb6a64bc525d/src/components/automations/results/AutomationResultForm.tsx#L73),
   [warunek renderowania](https://github.com/SenswaveLabs/Mobile/blob/4855e9a89f068d2a439a77e8575bbb6a64bc525d/src/components/automations/results/AutomationResultForm.tsx#L155).

Przy przenoszeniu sekcji Conditions/Results należy także usunąć konkurujące
kolorowe powierzchnie i ikonowe akcje na rzecz hierarchii sekcji oraz
`ContentSection.headerAction` / `SectionHeaderAction`. Wiersze listy automatyzacji
już korzystają z `ListRow`; nie wymagają powrotu do wcześniejszych kafelków.

## Wspólne komponenty — status po migracji wskazanych tras

- **OperationSelector** ma obecnie natywne pole wyboru, pełny katalog per-device,
  dokładne filtrowanie typów, zachowanie niedostępnych ID i lokalne Retry.
  Współdzielony kod obsługuje Tile/Presence bez nadpisywania historycznych kluczy.
  [OperationSelector](../src/components/device/operation/OperationSelector.tsx),
  [polityka UI](agent-guide/interface.md).
- **BottomSheetSelect** zastąpił Dropdown w polach Tile i Presence. Ta aktualizacja
  nie zleca globalnego usunięcia Dropdown ani przebudowy callerów poza zakresem
  audytu.
- **Nagłówki** na przeniesionych ekranach zgód, list, szczegółów operacji i ekranów
  prawnych używają właściwego wariantu brand lub nagłówka stosu. Domyślne zachowanie
  wspólnego DefaultHeader pozostaje bez globalnego redesignu.
- **Akcje FAB** zostały zastąpione w wskazanych listach i szczegółach przez akcje
  nagłówka, przyciski sekcji lub akcje lokalne. Pozostałe użycia wspólnego FAB poza
  migracją nie są z tego powodu osobnym zadaniem.
- **Inline feedback i wyciszanie toastów** są skonfigurowane na trasach naprawionych
  w Tasks 1–5. To nie jest globalna zmiana domyślnego zachowania providerów dla
  niezmienionych callerów.

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
| Tworzenie i edycja urządzenia | `/device/add`, `/device/details` | Tworzenie zachowuje istniejący formularz. Edycja używa natywnych Tile/Presence selektorów, lokalnej walidacji, pełnego katalogu operacji i częściowych zapisów. Capture 034 potwierdza dostęp do ostatnich akcji nad Gboard; capture 107 pokazuje Delete nad Gboard przy 320 dp Dark/font 1.3. Captures 129/130 na `8f4f7f4` potwierdzają lokalne Retry po błędzie kolekcji i powrót bez powtórzenia zaakceptowanego DELETE. Bounded stany natywne są opisane w raporcie; TalkBack, backend i sprzęt pozostają niezweryfikowane. |
| Źródło danych i broker | `/dataSource/add`, `/dataSource/details`, `/dataSource/list`, `/home/dataSource/select`, `/dataSource/brokers/startBrokerClient`, `/dataSource/brokers/addSubscription` | Formularze, szczegóły, pełna lista i wybór źródła używają lokalnego odzyskiwania i istniejących transportów. Wybór domu zachowuje owner/current-home guards i Retry bez powtarzania PUT. Wybrane native stany opisuje raport Task 6. |
| Dashboard urządzenia | `/device/device`, `/device/dashboard/add`, `/device/dashboard/details`, `/device/dashboard/placeWidget` | Wspólny scroll kontekstu i siatki, wybór dashboardu, nowe formularze, dodawanie z wolnej komórki, gesty placementu i rozdzielenie ról. |
| Widgety | `/device/widget/add`, `/device/widget/details`, `/device/widget/list` | Nowe formularze typów i opcje, odczyt konfiguracji, potwierdzane usuwanie definicji, lista/picker oraz lokalna obsługa błędów. Kontrolki live i edytor koloru także mają nową implementację. |
| Operacje | `/device/operation/add`, `/device/operation/details`, `/device/operation/list`, `/device/widget/list` | Tworzenie, read-only szczegóły, role/membership gates i lokalne odzyskiwanie są zaimplementowane. Dawny `/device/operation/list` pozostaje aliasem do WidgetList; samodzielny OperationList usunięto, a operationId-only link nie ujawnia Delete. |
| Profil i informacje | `/user/profile`, `/user/info`, `/user/privacy`, `/user/terms` | Ustawienia profilu zachowują lokalne błędy i natywne potwierdzenie. Informacje i prywatne dokumenty prawne są w jednym scrollu z istniejącymi wartościami i linkami. Wybrane legal captures i pozostałe braki są w raporcie Task 6. |

## Postęp względem pierwotnej kolejności

1. **Automatyzacje — zrealizowano:** osobna lista domu, cztery natywne formularze
   i naprawy zapisu; globalne klucze ikon i kontrakty zachowane. Zakres kontroli
   oraz pozostałe ograniczenia opisuje raport walidacji.
2. **Zgody — implementacja ukończona:** lokalne sprawdzenie consent, Retry bez
   ponownego POST, Back/Cancel i czytelne linki/copy. Raport dokumentuje też
   pełny tekst, błąd i Retry oraz Cancel podczas opóźnionego POST przy 320 × 480 dp
   Dark/font 1.3.
3. **Źródła, urządzenia i operacje — implementacja i wybrane odzyskiwanie
   natywne sprawdzone:** listy i wybór źródła, OperationSelector, Tile/Presence
   oraz szczegóły operacji są dostarczone. Captures 127/128 i 129/130 na
   `8f4f7f4` potwierdzają odpowiednio accepted-read recovery dla operacji i
   urządzenia bez powtórzenia DELETE; wcześniejsze awarie i poprawione przebiegi
   pozostają przypięte do 59cb891/ec47b34.
4. **Ekrany pomocnicze — implementacja ukończona:** confirmation, legal,
   maintenance i App information mają lokalne stany i odzyskiwanie. Końcowe
   public/private legal, App Info, confirmation i maintenance są przypięte w
   raporcie do source revision i hashy aktualnych capture’ów.
5. **Task 6 — raportowany, przegląd dokumentacji pending:** bounded native matrix,
   kontrole kodu, eksport i cleanup są zakończone. Scoped review zatwierdził
   source correction F1/F2/M1/F3; finalny Sol review dokumentacji i dowodów jest
   jeszcze wymagany. Nie ma PR ani całościowego werdyktu review.

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

## Aktualizacja 4 listopada 2026

Statusy powyżej odnoszą się do źródła `a705c23` po Tasks 1–6 i bounded,
source-pinned stanów natywnych; nie zmieniają historycznego zakresu audytu z
28 października. Oryginalne profile Android 0 i 11 zachowano. QA user 10 był
faktycznie zapisany jako `Codex`, serial 12, utworzony około 09:06 UTC, i został
usunięty po zatrzymaniu; poprzednie pliki z `/tmp` zniknęły przy nocnym resecie
i nie są publikowane. Finalny eksport Android ma 55 assetów i nie zawiera
fixture origin; pierwotny `.env` pozostał bez zmian, a task-owned `.env.local`,
API i QA Metro usunięto/zatrzymano po kontroli. Fizyczny viewport/density
przywrócono, zapisane ustawienia user 0 pozostały niezmienione. Po restarcie
system raportował `Night mode: no`; dokładna etykieta wcześniejszego
`custom_bedtime` nie jest deklarowana jako przywrócona. Raport walidacji
rozdziela bounded obserwacje, historyczne błędy ANR i niezweryfikowane obszary.
Końcowy Sol review dokumentacji/dowodów oraz PR pozostają pending.
