# UI audit 36 — formularze, uprawnienia i recovery

Zakres: issue [#36](https://github.com/SenswaveLabs/Mobile/issues/36),
`impeccable harden`, ustalenia A15–A21 i A23–A26 z `reports/ui-audit.md`.
Branch lokalny: `fix/ui-audit-36-harden`, baza `next-dev` (`f916be8`).
Poprzednie poprawki audytu pozostają zachowane. Nie zmieniono API backendu,
uprawnień serwera, kluczy ikon ani wartości konfiguracji automatyzacji.

## Zmiany i dowody

| ID | Wykonana poprawka | Weryfikacja |
| --- | --- | --- |
| A15 | `DataSourceForm` pokazuje wymagane Name, Server i Client name po próbie zapisu również w edycji; wejście do formularza nie oznacza pustych, nietkniętych pól błędem. | Regresja trzech pól; natywnie pusty Name i zachowanie szkicu. |
| A16 | `DataSourceDetailsSection` współdzieli synchroniczną blokadę Save/Delete. Formularz, selektory, otwarcie i potwierdzenie usunięcia respektują blokadę, także przez zatrzymane callbacki. | Testy konkurencyjnych wywołań; natywny opóźniony PATCH lokalnej odpowiedzi testowej: Save i Delete mają `enabled=false`; pending DELETE przy 800 dp także blokuje Save. |
| A17 | Zaakceptowane DELETE/404 zatrzaskuje usunięcie. Trasa usuwa oba panele, więc Overview nie zostawia aktywnych operacji na usuniętym brokerze. Błąd powrotu daje wyłącznie Return; brak historii prowadzi do `/dataSource/list`. Callbacki Overview po odmontowaniu odrzucają akcje. | Regresje DELETE/404, błędów nawigacji, zatrzymanych zapisów/odczytów/powrotów i callbacków Overview; natywnie jeden zaakceptowany DELETE wyłącznie lokalnej odpowiedzi testowej i powrót do Home. Błędy routera wstrzykiwano w adapterze, nie w natywnym routerze. |
| A18 | `DataSourceStateGet` przyjmuje tylko osiem znanych statusów. Nieznany string daje Status unavailable i Retry tego samego GET; Stopped/NotStarted zachowują Disconnected. | Test nieznanego statusu i natywny unavailable → Retry → Disconnected. |
| A19 | Delete data source używa `AlertDialogTrigger asChild` i ref przekazywanego przez wspólny Button, zgodnie z mechanizmem przywracania fokusu zainstalowanego primitive. | Test połączenia triggera, Cancel/Back bez DELETE; natywny dialog i Android Back przy 320 dp, Dark, 200% tekstu oraz Cancel przy 800 dp Light. Faktycznego fokusu i wypowiedzi TalkBack nie potwierdzono. |
| A20 | Jedyny target wiersza automatyzacji zawiera nazwę oraz Enabled/Disabled. | Test obu statusów i pojedynczego targetu. Rzeczywista lista konta testowego była pusta; odczytu niepustej listy przez TalkBack nie sprawdzono. |
| A21 | Wspólny selector ma opcjonalne error i triggerRef: obrys błędu, nazwę invalid selection, hint oraz tekst alert/live region. Formularze child przewijają pierwszy błędny wybór i proszą o accessibility focus, bez TextInput focus i bez zamykania klawiatury. | Regresje Device-before-Operation, zachowania szkicu i braku przejęcia fokusu tekstowego. Natywnie brak Device w Condition/Result i brak Operation po wyborze urządzenia; otwarcie sheet z błędnego pola. Wypowiedzi TalkBack nie sprawdzono. |
| A23 | Zachowano wcześniejsze rozróżnienie read error/empty i cache. Przy błędzie pierwszego odczytu dodano lokalne Choose home obok Retry; prawidłowy empty nadal ma Create/Join. | Regresja ekranu oraz wcześniejsze testy HomeProvider. Natywnie błąd pierwszego odczytu i przejście do wyboru domu przy 320 dp, Dark, 200% tekstu. |
| A24 | Create device wymaga gotowego domu Owner/Manage i wiąże formularz z jego ID. Zatrzymany submit ponownie sprawdza dom, rolę, loading, fokus i `homeId` payloadu. | Regresje gotowości, ról, zmiany domu, payloadu i blur. Natywna odmowa Display oraz dostępny formularz Manage przy 448 dp z lokalnie symulowanym kontekstem roli; konto backendu pozostało właścicielem. |
| A25 | Accepted POST usuwa formularz i zostawia Device created/Return po nieudanym powrocie. Return nie powtarza POST ani odświeżenia listy; recovery ma własny scroll na małych oknach. | Regresje wyjątku routera, ponownego submitu i spóźnionego zakończenia po zmianie domu/blur. Natywnie sprawdzono jednorazowe zaakceptowanie Create device przez lokalną odpowiedź testową i powrót Manage. Natywnego wyjątku nawigacji nie wymuszano. |
| A26 | Istniejący trigger Expander ma rolę button, nazwę sekcji i `accessibilityState.expanded`, bez dodatkowego targetu. | Regresja jednego triggera oraz stanu po rozwinięciu i zwinięciu. TalkBack nie sprawdzono. |

## Dodatkowy zgłoszony błąd Data Source

Prawidłowy GET szczegółów EMQX zwracał HTTP 200 z polami `protocolVersion`
i `useTls`. Typ mobilny i walidator błędnie oczekiwały `mqttVersion`/`tls`,
co blokowało oba panele mimo działającego połączenia. Skorygowano typ,
walidację, inicjalizację formularza i zapis jego nowej bazy. Fixture regresyjny
odzwierciedla teraz kontrakt V1 i sprawdza MQTT 3.1.1 oraz `useTls=false`,
żeby błędna nazwa pola nie została ukryta przez wartości domyślne.

Na przebudowanym i zainstalowanym kliencie Android otwarto rzeczywisty EMQX:
Overview pokazał Connected i subskrypcje, Settings zachował włączony TLS
oraz MQTT 5.0.0. Nie wykonano mutacji istniejącego brokera ani jego subskrypcji.

## Kontrole i ograniczenia

- Node 26.12.1, pnpm 12.8.1; frozen install i hooks zainstalowane.
- `pnpm typecheck`, `pnpm lint`, `pnpm test:poc`: bez błędów; PoC 112/112.
- `pnpm exec node --test tests/*.test.mjs`: 689/689; obejmuje wszystkie dotknięte suite'y.
- Android development client: prebuild, x86_64 `:app:assembleDebug`, instalacja
  przez ADB i uruchomienie aktualnego JavaScript na `emulator-5554`.
- `dotnet build Senswave.sln --no-restore`: 0 błędów, 259 istniejących ostrzeżeń
  backendu, w tym NU1903. Źródeł backendu nie zmieniono.
- Niezależny review wykrył pozostawiony Overview po DELETE i brak scrolla
  recovery Create device; oba problemy poprawiono, testy ponowiono.
- Wywołania opóźnione, błędy odczytów i role symulowano lokalnym proxy;
  nie są dowodem autoryzacji backendu ani dostarczenia polecenia do sprzętu.
  Test adaptera nie zastępuje native fit ani wypowiedzi czytnika.
- Nie wykonano pełnej macierzy wszystkich ekranów przy 320/448/800 dp,
  wszystkich rozmiarów tekstu, TalkBack, iOS, fizycznego sprzętu ani release/ARM64.
  Walidacja release i publiczne CI pozostają osobnymi kontrolami.
- Zrzuty, proxy, diagnostyka, plany i logi implementacji pozostały poza PR.
  Raport podsumowuje wyniki; nie przenosi do repo materiałów roboczych.
