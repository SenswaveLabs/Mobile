# UI audit 37 — układ, typografia i teksty

Zakres: issue [#37](https://github.com/SenswaveLabs/Mobile/issues/37), komendy
`impeccable layout`, `impeccable typeset` i `impeccable clarify`, ustalenia
A14/A22/A27/A29/A30 z [audytu](ui-audit.md). Lokalny branch
`fix/ui-audit-37-layout-copy` powstał z pobranego `origin/next-dev` (`32e8051`).
Nie zmieniono kontraktów API, uprawnień, kluczy ikon ani zabezpieczeń mutacji.

## Zmiany i dowody

| ID | Poprawka | Weryfikacja |
| --- | --- | --- |
| A14 | `AddSubscriptionForm` ma rosnący blok treści i dolny blok feedbacku/akcji wewnątrz tego samego keyboard-aware scrolla. Domyślny `FormSection` i formularze edycji pozostają bez zmian. | Android: dolna akcja przy 448 i 800 dp; przy 320 × 480 dp, Dark, 200% tekstu cały przycisk osiągalny nad IME po przewinięciu. Lokalne HTTP 503 zachowuje topic i błąd przy akcji. |
| A22 | Wspólny `utils/operationLabels.ts` rozróżnia powtarzające się nazwy typem i ośmioznakowym prefiksem ID, a przy kolizji prefiksu używa pełnego ID. Unikalne nazwy pozostają niezmienione. Oba formularze używają tej samej etykiety opcji i wyboru; `BottomSheetSelect.multiline` pozwala ją zawijać. | Regresja obu formularzy RED→GREEN: identyczne nazwy i typy, wspólne prefiksy, inne typy, unikalna nazwa, wybrana etykieta oraz dokładne surowe ID/name/value. Android: wybór Boolean z kolidującym prefiksem i Text z krótkim ID; oba wybrane pola zawijają się przy 320 dp/200%, nazwy dostępności zawierają rozróżnienie. |
| A27 | Zachowano usunięte już wcześniej limity linii w `WhatsNewModal`. Nieaktualny wpis o FAB zastąpiono prawdziwą informacją o akcjach obok nagłówków Devices/Operations. Numer widzianej wersji i obsługa zamknięcia nie zmieniają się. | Android: pełny długi opis Save on User Action w istniejącym scrollu przy 448 dp Light i 320 dp Dark/200%; wielowierszowe tytuły i końcówka opisu pozostają dostępne. |
| A29 | `automation/details` zostawia Retry jako primary, a Return jako outline; samodzielny Return pozostaje primary. Recovery używa rosnącego scrolla, aby przy dużym tekście nie tracić góry błędu ani dołu przycisku. | Istniejące testy odczytu, Retry i nawigacji przechodzą. Android: lokalne 503 i brak ID przy 320 × 480 dp/Dark/200%. Asercja pełnego dolnego odstępu Return odtworzyła przycięcie przed poprawką i przeszła po przewinięciu nowego recovery. |
| A30 | `DataSourceForm` przenosi gap do wewnętrznego rosnącego układu tworzenia. Techniczny spacer klawiatury nie dostaje odstępu grupy; zachowano dolny padding i istniejący układ edycji. | Android: Create data source przy 800 dp ma na dole 25 dp: 24 dp paddingu oraz 1 dp technicznego spacera zainstalowanej biblioteki. Przy 448 dp/100% skupione Password mieści się nad IME. Przy 320 dp/200% sprawdzono ręczne przewijanie i powrót do pełnej akcji po zamknięciu IME. |

## Kontrole

- Node 26.12.1, pnpm 12.8.1; frozen install i lokalne hooks zainstalowane.
- `pnpm typecheck`, `pnpm lint`, `pnpm test:poc`: bez błędów; PoC 112/112.
- `pnpm exec node --test tests/*.test.mjs`: 689/689 po poprawce recovery.
- Niezależny przegląd nie zgłosił uwag; 106/106 testów dotkniętych obszarów.
  Dodatkowe przycięcie recovery znalezione natywnie poprawiono i potwierdzono
  asercją Androida oraz pełnym zestawem testów.
- Końcowy produkcyjny eksport JavaScript Androida przeszedł. Skany Impeccable
  layout/type nie zgłosiły ustaleń.
- Android: czysty prebuild, x86_64 `:app:assembleDebug`, instalacja i uruchomienie
  nowego development clienta `com.develite.senswave.nextdev`, versionCode 20261106.
  Czysty prebuild usunął wcześniejszy błąd autolinkowania do starego pakietu.
- Emulator `emulator-5554`, konto testowe: próbki 448 dp Light/Dark przy 100%,
  320 × 480 dp Dark przy 200% oraz 800 × 1280 dp Light przy 100%.
  Zduplikowane operacje i 503 symulowano lokalnymi odpowiedziami; nie zapisano
  automatyzacji ani nie zmieniono istniejących brokerów, subskrypcji lub urządzeń.
  Przywrócono `.env`, rozmiar okna i skalę tekstu; aplikacja korzysta z normalnego API.

## Granice weryfikacji

Nie wykonano pełnej macierzy wszystkich ekranów i rozmiarów, wypowiedzi/fokusu
TalkBack, iOS, prób fizycznego sprzętu ani lokalnego ARM64/release. Ręczna próba
Password przy 320 dp/200% nie potwierdza automatycznego odsłonięcia całego pola
i całej akcji nad IME w tej konfiguracji. Testy adaptera nie zastępują tych prób.
Powtórny audyt i końcowy polish pozostają zakresami 7–8 kolejki.

Zrzuty, logi, proxy i plany pozostały poza PR. Jedyny nowy artefakt raportowy
w zmianie to niniejsze podsumowanie.
