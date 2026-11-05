# UI audit 39 — podsumowanie końcowego polish

Data: 5 listopada 2026. Issue: [#39](https://github.com/SenswaveLabs/Mobile/issues/39).
Zastosowano `$impeccable polish` w trybie Android/Operate, zgodnie z sekcjami 7
i 10 [pierwotnego audytu](ui-audit.md) oraz [ponowną weryfikacją 38](ui-audit-38.md).
Lokalny branch `chore/ui-audit-39-polish` powstał z aktualnego `origin/next-dev`
`3f70c917406238c65b51e5419e559db50e0b7be1`. Nie używano worktree.

## Wykonane zmiany

- `ContentSection` zachowuje naturalną szerokość nagłówka. Gdy nagłówek i akcje
  nie mieszczą się obok siebie, akcje przechodzą do kolejnego wiersza. Helper
  pozostaje pod całym nagłówkiem. Przy 320 dp/Dark/200% „Devices” zajmuje teraz
  jeden wiersz, 112 px wysokości zamiast 224 px z przerwanym słowem.
- `SectionHeaderAction` ogranicza szerokość targetu i pozwala etykiecie się
  zawijać. Zachowano nazwy dostępności, minimalny target i dotychczasowe handlery.
- Własne wiersze `RoomSelector` otrzymały parametry standardowego selektora:
  etykiety 16 dp, minimum 56 dp wysokości, 16 dp pionowego paddingu i tekst
  mieszczący się w wierszu. Sprawdzono nazwę 64-znakową, Create room po zamknięciu
  sheetu, anulowanie oraz Back bez zmiany wybranego pokoju.
- Od 130% tekstu `DataSourceTile` korzysta z pionowego `ListRow`: nazwa i adres
  otrzymują pełną szerokość, a status lub Retry są poniżej, poza targetem
  nawigacji. Zwykły tekst zachowuje status obok adresu. Rozwiązanie usuwa łamanie
  słów Connected/Disconnected bez ściskania adresu do około 84 dp.
- Uaktualniono index AGENTS oraz przewodniki UI i walidacji.

Niezależny przegląd wykazał koszt samego poszerzenia statusu: przy 200% adres
zajmował osiem wierszy. Zastąpiono to układem pionowym; końcowa próbka ma trzy
wiersze adresu i pełny status. Nowa regresja odtworzyła brak tego układu przed
poprawką, a następnie przeszła dla skal 1/1,29/1,3/2, zachowanej nawigacji i
osobnego statusu. Pozostały przegląd nie zgłosił usterek Critical/Important.

## Sprawdzenia

| Sprawdzenie | Wynik |
| --- | --- |
| `pnpm install --frozen-lockfile` | OK; lockfile i zależności bez zmian. |
| `pnpm typecheck` | OK. |
| `pnpm lint` | OK. |
| `pnpm test:poc` | 112/112. |
| `pnpm exec node --test tests/*.test.mjs` | 693/693, bez failures/skips/cancellations. |
| Nowa regresja `dataSourceList` | RED → GREEN; plik 12/12. |
| `pnpm test:data-sources` | 92/92. |
| Expo prebuild + Gradle `:app:assembleDebug`, x86_64 | OK; nowy APK zainstalowany i uruchomiony. |
| Produkcyjny Android JS export | OK; wynik poza repozytorium. |

Emulator `emulator-5554`, Android 17/API 37. Nowy klient
`com.develite.senswave.nextdev`, versionName 1.1.0, versionCode **20261108**,
target SDK 36. Próby wykonano na aktualnym JS przez Metro po przebudowie klienta.

| Próba natywna | Sprawdzony zakres |
| --- | --- |
| 320 × 480 dp, Light, 100% | Home, lista źródeł, sekcje automatyzacji i Room sheet. |
| 320 × 480 dp, Dark, 200% | Nagłówki i akcje, długa nazwa Room, Create room/Back, IME i osiągalny przycisk, lista widgetów, lokalny status/Retry, dialog konta i Exit/Back. |
| 448 dp, Light/Dark, 100% | Home, lista źródeł i Room; Dark także sekcje automatyzacji. |
| 800 × 1000 dp, Light/Dark, 100% | Home i lista źródeł; Light także automatyzacje, Room i pionowe Cancel/Delete account. Dialog anulowano. |
| Lokalna rola Display, 448 dp/Light | Brak Add device i odmowa bez montowania formularza po wejściu w create route. |

Kontrolowane odpowiedzi lokalnego proxy służyły wyłącznie długiej nazwie pokoju,
stanom brokera, 503 oraz roli Display. Nie zmieniano tych danych ani uprawnień
w backendzie. Natywny Retry statusu wykonał dokładnie jeden matching GET;
nie otworzył szczegółów wiersza ani nie wykonał zapisu. Log proxy nie zawiera
mutacji domenowych. Nie wysyłano komend urządzeń ani prawdziwych potwierdzeń
usuwania.

## Ciągłość ustaleń A01–A32

Szczegółowe przypisanie poprawek i wcześniejsze dowody pozostają w raporcie 38.
Końcowy zestaw regresji uruchomiono ponownie; poniższa tabela rozlicza wszystkie
32 IDs bez przypisywania każdemu nowej, pełnej próby natywnej.

| IDs | Ponowna kontrola w tym etapie |
| --- | --- |
| A01/A02/A07/A08/A28 | Regresje dialogów, sheetów i ikon; natywnie Room, Cancel/Back i dialogi na 320/200% oraz 800/100%. |
| A03/A10–A12 | Testy motywu, selektora Room i formularzy operacji; porównanie wspólnych powierzchni Light/Dark. |
| A04–A06 | Testy Home, sharing, tile/preview/widget/broker read boundaries; natywny Exit/Back na wypełnionym Home. |
| A09/A13/A31/A32 | Regresje pełnych palet, historycznych kluczy i nieobecności wycofanego UI/globalnego feedbacku. |
| A14–A21/A23–A26/A29/A30 | Testy formularzy, uprawnień i accepted-once recovery; natywnie wybrane formularze/IME, sekcje automatyzacji, Display i GET-only Retry brokera. |
| A22/A27 | Istniejące regresje rozróżnienia operacji i treści What's New; bez nowej próby natywnej tych dwóch powierzchni. |

Testy adaptera pozostają dowodem logiki i przekazywanych propsów, nie dowodem
renderowania, gestów ani wypowiedzi TalkBack. Nie powtarzano całej macierzy
45 ekranów × stany × role × rozmiary. Nie wykonano pełnego TalkBack, predictive
Back, testu fizycznego sprzętu/MQTT, iOS, foldable, benchmarku ani wydania release.
Opcjonalny GPS emulatora był niedostępny; jego dev LogBox nie jest globalnym
feedbackiem produkcyjnym. Ograniczenia raportu 38 nie stają się zaliczone przez
sam końcowy polish.

Przywrócono oryginalny `.env`, rozmiar 1344 × 2992 px, 480 dpi, tekst 100%
i system Light. Proxy zatrzymano, a klienta ponownie uruchomiono na świeżym Metro
ze zwykłym lokalnym API. Oryginalny katalog pokoi potwierdzono w natywnym sheet.

Materiały robocze, obrazy, proxy, plan i logi pozostały w `/tmp`. Niniejsze
podsumowanie jest jedynym nowym artefaktem raportowym PR.
