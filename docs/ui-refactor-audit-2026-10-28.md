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
  sprawdzone. Zakres prób i ograniczenia opisano przy danej trasie.

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

Consent, wybór źródła, konfiguracja urządzeń, szczegóły operacji, potwierdzanie
e-maila, dokumenty prawne, konserwacja i informacje o aplikacji korzystają teraz
z natywnych formularzy i lokalnego odzyskiwania po błędach. Wybrane przebiegi
sprawdzono na Androidzie w normalnym i kompaktowym układzie, obu motywach,
zwiększonym tekście, przy otwartej klawiaturze oraz dla różnych ról. Szczegóły
kodowe i zakres poszczególnych prób są wskazane w tabeli poniżej.

TalkBack, prawdziwe konto/backend, produkcyjny broker/MQTT, sprzęt oraz cold
start release APK i powiązanie domeny przeglądarki nie były sprawdzane. Podczas
wcześniejszych prób emulator zawiesił się przed wejściem do ekranu; przyczyna
graficznego ANR nie jest potwierdzona. Osobno zdarzał się fatalny błąd React z
`ScreenContentWrapper` i pustym dzieckiem; późniejsze wybrane przebiegi nie
dowodzą, że nie może wrócić.

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
| P1 | `/consents` | Implementacja; wybrane kontrole Android | Lokalna kontrola zgody, Retry bez ponownego POST, Back/Cancel oraz czytelne linki i pełny tekst. Sprawdzono na 448 dp Light oraz 320 × 480 dp Dark/font 1.3; kompaktowy przebieg obejmował błąd po zaakceptowanym POST, Retry bez drugiego POST i Cancel podczas opóźnionego żądania. [consents.tsx](../src/app/consents.tsx). |
| P2 | `/home/dataSource/select` | Implementacja; wybrane kontrole Android | Wybór jest związany z bieżącym routowanym domem i rolą Owner. Po zaakceptowanym PUT błąd odczytu pozostaje lokalny; Retry wykonuje sam GET i wraca do Home. Przy 448 dp Light natywnie sprawdzono pojedynczy PUT i powrót po udanym ponownym odczycie domu. [select.tsx](../src/app/(app)/home/dataSource/select.tsx). |
| P2 | `/device/details` | Implementacja; wybrane kontrole Android | Natywne Tile/Presence, pełny katalog, lokalna walidacja i częściowe zapisy zachowują istniejące ID. Ostatnie akcje były dostępne nad Gboard przy 448 dp Light; Delete był dostępny przy 320 dp Dark/font 1.3. Sprawdzono limit treści 448 dp na szerokim ekranie oraz local Retry po collection 503 bez ponowienia zaakceptowanego DELETE. [DeviceForm](../src/components/device/DeviceForm.tsx), [details](../src/app/(app)/device/details.tsx). |
| P2 | `/device/operation/details` | Implementacja; wybrane kontrole Android | Read-only OperationForm montuje się po zweryfikowanym odczycie; DELETE wymaga członkostwa bieżącego domu i Owner/Manager. Przy 320 dp Dark/font 1.3 sprawdzono Owner Cancel/Back, dostępny Manager Delete oraz brak Delete dla Display; przy 448 dp Light zaakceptowany DELETE z błędem odczytu odzyskuje się lokalnym Retry bez powtórzenia zapisu. Wcześniejszy emulator ANR i fatalny błąd pustego dziecka pozostają niewyjaśnione; późniejsze przebiegi nie dowodzą, że nie wrócą. [details](../src/app/(app)/device/operation/details.tsx). |
| P2 | `/dataSource/list` | Implementacja; wybrane kontrole Android | Pełny katalog i row-local status Retry zachowują osobne odczyty; Retry ponawia tylko status GET i nie aktywuje wiersza. Przy 320 dp Dark/font 1.3 sprawdzono stan błędu, odzyskanie i helper pod pełnoszerokim nagłówkiem. Krótki viewport listy nie był osobno sprawdzany. [route](../src/app/(app)/dataSource/list.tsx), [DataSourceList](../src/components/dataSource/DataSourceList.tsx). |
| P2 | `/device/operation/list` | Alias kompatybilności; wybrane kontrole Android | Headerless alias przekazuje jawny `deviceId` do `/device/widget/list`; osobny OperationList usunięto, ale zachowano historyczny [plik z audytowanego commita](https://github.com/SenswaveLabs/Mobile/blob/4855e9a89f068d2a439a77e8575bbb6a64bc525d/src/components/device/operation/OperationList.tsx#L43). Przy wąskim ciemnym układzie helper aliasu pozostaje czytelny; stary operationId-only link pokazuje read-only szczegóły bez Delete. |
| P2 | `/confirmEmail` | Implementacja; wybrane kontrole Android | Lokalna walidacja i Retry/Sign in zachowują scalarową tożsamość i nie powtarzają zaakceptowanego POST. Sprawdzono Unicode wartości z błędem i Retry, odrzucenie pustego kodu oraz development-client cold start po wyborze zapamiętanego projektu. Cold release APK i browser domain association są niezweryfikowane. [confirmEmail.tsx](../src/app/confirmEmail.tsx). |
| P2 | `/privacy`, `/terms`, `/user/privacy`, `/user/terms` | Implementacja; wybrane kontrole Android | Cztery wrappery używają wspólnego LegalDocumentView; lokalne błędy/Retry nie zastępują serwerowej treści ani Version. Public Privacy Version sprawdzono przy 448 dp Light, a publiczne i prywatne końce dokumentów przy 320 × 480 dp Dark/font 1.3; treść pochodziła z fikcyjnego fixture. [LegalDocumentView](../src/components/user/LegalDocumentView.tsx). |
| P2 | `/maintenance` | Implementacja; wybrane kontrole Android | Retry i pull-to-refresh współdzielą blokadę, a routowanie czeka na zakończenie initialize i aktualną sesję. Sprawdzono version GET 503 i jawne Retry do Start bez auth-refresh POST, także przy 320 × 480 dp. [maintenance.tsx](../src/app/maintenance.tsx). |
| P3 | `/user/info` | Implementacja; wybrane kontrole Android | Metadane i oba linki prawne pozostają w jednym scrollu. Przy 320 × 480 dp Dark/font 1.3 sprawdzono jednowyrazową etykietę Email, pełny adres oraz dostępny 48 dp Privacy wiersz. [info.tsx](../src/app/(app)/user/info.tsx). |

## Błędy przepływu znalezione w snapshotie 28 października

Poniższe ustalenia opisują pierwotny audytowany commit, nie aktualną listę
niezaimplementowanych ekranów. Późniejsza implementacja dodała formularze
i route ownership; obecny stan tras podsumowują tabele powyżej i poniżej.
Testy handlerów opisuje [przewodnik walidacji](agent-guide/validation.md).

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
  w ramach migracji. To nie jest globalna zmiana domyślnego zachowania providerów dla
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
| Tworzenie i edycja urządzenia | `/device/add`, `/device/details` | Tworzenie zachowuje istniejący formularz. Edycja używa natywnych Tile/Presence selektorów, lokalnej walidacji, pełnego katalogu operacji i częściowych zapisów. Na Androidzie sprawdzono dostępność ostatnich akcji nad otwartą klawiaturą przy normalnej szerokości oraz Delete przy kompaktowej szerokości, ciemnym motywie i zwiększonym tekście. Potwierdzono limit treści 448 dp na szerokim ekranie i odzyskiwanie odczytu po zaakceptowanym usunięciu bez powtórzenia DELETE. |
| Źródło danych i broker | `/dataSource/add`, `/dataSource/details`, `/dataSource/list`, `/home/dataSource/select`, `/dataSource/brokers/startBrokerClient`, `/dataSource/brokers/addSubscription` | Formularze, szczegóły i pełny katalog używają istniejących transportów oraz lokalnego odzyskiwania. Wybór domu sprawdza bieżący dom i rolę Owner; po zaakceptowanym PUT lokalny Retry wykonuje tylko GET i nie ponawia przypisania. [lista](../src/app/(app)/dataSource/list.tsx), [wybór](../src/app/(app)/home/dataSource/select.tsx). |
| Dashboard urządzenia | `/device/device`, `/device/dashboard/add`, `/device/dashboard/details`, `/device/dashboard/placeWidget` | Wspólny scroll kontekstu i siatki, wybór dashboardu, nowe formularze, dodawanie z wolnej komórki, gesty placementu i rozdzielenie ról. |
| Widgety | `/device/widget/add`, `/device/widget/details`, `/device/widget/list` | Nowe formularze typów i opcje, odczyt konfiguracji, potwierdzane usuwanie definicji, lista/picker oraz lokalna obsługa błędów. Kontrolki live i edytor koloru także mają nową implementację. |
| Operacje | `/device/operation/add`, `/device/operation/details`, `/device/operation/list`, `/device/widget/list` | Tworzenie, read-only szczegóły, role/membership gates i lokalne odzyskiwanie są zaimplementowane. Dawny `/device/operation/list` pozostaje aliasem do WidgetList; samodzielny OperationList usunięto, a operationId-only link nie ujawnia Delete. |
| Profil i informacje | `/user/profile`, `/user/info`, `/user/privacy`, `/user/terms` | Ustawienia profilu zachowują lokalne błędy i natywne potwierdzenie. Informacje i prywatne dokumenty prawne są w jednym scrollu z istniejącymi wartościami i linkami. Na kompaktowym ekranie z ciemnym motywem i zwiększonym tekstem sprawdzono pełny adres e-mail oraz dostępność ostatniego linku prawnego. |

## Zakres i ograniczenia kontroli

Natywne kontrole obejmowały wybrane stany Androida: różne role, tryby jasny i
ciemny, kompaktową szerokość, zwiększony tekst, otwartą klawiaturę oraz odzyskiwanie
po błędach odczytu i zapisu. Nie są to testy TalkBack ani walidacja prawdziwego
konta/backendu, produkcyjnego MQTT lub sprzętu. Cold start potwierdzania e-maila
sprawdzono tylko w development client po wyborze zapamiętanego projektu; cold
start release APK i browser domain association pozostają niezweryfikowane.

Wcześniejszy emulator graphics ANR i okresowy fatal z pustym dzieckiem React
mają nieustaloną przyczynę. Późniejsze wybrane przebiegi nie dowodzą, że któryś
z tych problemów został usunięty lub nie może wystąpić ponownie.
