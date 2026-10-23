# Handoff: Android CI/CD przez Next-Infra i VPS

## Aktualizacja bezpieczeństwa Node (2026-10-23)

Wymagany Node: **26.12.1** lub nowszy z poprawką CVE-2026-111497; patrz
[Tooling](agent-guide/tooling.md). Wersja 26.10.0 i komenda Docker poniżej to stan
historyczny. Przy wznowieniu buildu pobierz `NODE_VERSION` z aktualnego `.nvmrc`.

## Aktualizacja: wydzielenie zmian CI/CD (2026-10-14)

Zmiany zostały wydzielone z niezacommitowanej pracy UI. Mobile używa brancha
`feat/mobile-ci-cd` opartego wyłącznie na `next-dev` (`5f680c9ec71fa9b9a7f3243c8f5c4c49a8305a50`).
Worktree Mobile: `/home/kamil/.codex-personal-2/worktrees/2505/mobile`.
Next-Infra używa osobnego brancha `feat/mobile-ci-cd` opartego na aktualnym
`origin/main`; to repo nie ma brancha `next-dev`.

Lokalny `/home/kamil/repos/senswave/mobile` pozostaje na `next-dev` z wcześniejszymi
zmianami UI i zależności. Fragmenty CI/CD w package.json i dokumentacji zostały
rozdzielone; app.json, pnpm-lock.yaml i kod UI nie należą do zmiany CI/CD.
Nie wykonano push, merge ani wdrożenia. Nie naprawiano instalatora pnpm w Dockerze
i nie ponawiano budowy APK; blocker opisany poniżej nadal wymaga rozwiązania.

Pozostałe sekcje opisują stan pierwotnego handoffu przed wydzieleniem zmian.
Przy dalszej pracy używaj branchy i worktree podanych powyżej zamiast informacji
o niezacommitowanych plikach w pierwotnym workspace.

Stan: 2026-10-14. Użytkownik przerwał dalszą pracę i poprosił o zapisanie tego
handoffu dla kolejnego agenta. Kontynuuj z istniejących plików; nie zaczynaj od nowa.

## Cel i zaakceptowane decyzje

- Android na początek, instalowalny APK pod własnym linkiem.
- Build oraz hosting na istniejącym VPS, bez EAS i dodatkowej usługi dystrybucji.
- Publiczne repo `SenswaveLabs/Mobile`, branch `next-dev`.
- Prywatne repo `SenswaveLabs/Next-Infra`, branch wdrożeniowy `main`.
- **Bez cronowania/pollingu i bez automatycznego merge.** Po CI Mobile ma powstać
  PR ze zmianą wersji w Next-Infra. Człowiek sprawdza źródło i autora, następnie
  merguje. Dopiero ten merge uruchamia build i deploy na VPS.
- Zachować wzorzec istniejącej infrastruktury: lokalny registry, obraz Docker,
  Ansible, Compose i Traefik. Backend/frontend mają własne istniejące flow.
- Produkcyjne wydania pozostają ręczne; to osobna aplikacja testowa next-dev.

Użytkownik zalogował się ponownie do `gh` i autoryzował dostęp do odczytu ustawień
GitHub. Nie traktować tego jako zgody na autonomiczne mergowanie PR.

## Workspace i ważne instrukcje

Repozytoria:

```text
/home/kamil/repos/senswave/mobile
/home/kamil/repos/senswave/next-infra
/home/kamil/repos/senswave/next-frontend
/home/kamil/repos/senswave/next-backend
```

Mobile jest na `next-dev`. **Przed zadaniem miał dużo niezacommitowanych zmian UI,
zależności i dokumentacji.** Nie usuwać ich, nie resetować repo i nie robić
`git add .`. Współdzielone pliki, szczególnie `package.json`, README, AGENTS i
przewodniki, zawierają także wcześniejsze zmiany użytkownika.

Next-Infra jest na `main`; przed pracą był czysty, lokalny main był 5 commitów za
origin/main. Zmiany zadania są tam obecnie nowymi, nieśledzonymi plikami. Nie
nadpisywać istniejących wersji backendu/frontendu przy późniejszej integracji.

Nic nie zostało zacommitowane, wypchnięte, zmergowane ani wdrożone na VPS. Nie
zmieniono ustawień zdalnych, nie utworzono GitHub App ani prawdziwego klucza
podpisującego. Dotychczasowe zdalne operacje były odczytami.

Przeczytać Mobile AGENTS oraz potrzebne fragmenty `docs/agent-guide/tooling.md`
i `validation.md`. Komunikacja z użytkownikiem: krótki polski zgodnie z
`.claude/skills/caveman/SKILL.md`; kod i dokumentacja normalną prozą. Ponytail
full: najmniejsza kompletna zmiana, bez nowych zależności na kilka linijek.
Nie mergować autonomicznie. Przed commitem wymagane `pnpm typecheck`, `pnpm lint`
i `pnpm test:poc`. AGENTS wymaga zgłoszenia nieoczekiwanej porażki testów i
czekania na człowieka. Używać pnpm, Node z `.nvmrc`, frozen lockfile i zachować
build approvals z `pnpm-workspace.yaml`.

## Implementacja obecna w plikach

```text
Mobile next-dev push / manual CI
  -> quality na GitHub-hosted
  -> osobny job z tokenem App Actions:write
  -> workflow_dispatch prywatnego workflow propozycji, tylko source_run_id
  -> prywatny GitHub-hosted job sprawdza Mobile CI przez GitHub API
  -> PR: environments/next-dev/mobile/.env.version
  -> ręczny merge w Next-Infra/main
  -> prywatny self-hosted runner na VPS
  -> Docker build konkretnego SHA, osobne podpisanie APK
  -> localhost:5000 registry -> Ansible/Compose -> Traefik
  -> https://next-dev-mobile.senswave.net/senswave-next-dev.apk
```

Publiczny job propozycji nie checkoutuje ani nie wykonuje kodu aplikacji.
Nie działa dla PR. Publiczne PR sprawdzają produkcyjny bundle Android JS oraz
kompilację Android debug ARM64 z cache Gradle i artefaktem `gradle-profile` na
GitHub-hosted; po push build dystrybucyjny wykonuje dopiero VPS po zatwierdzeniu
PR w infra.

Push lub ręczne uruchomienie CI na `next-dev` wykonuje też ten sam publiczny job
Android, aby zapisać bazowy cache Gradle dla pierwszych buildów nowych PR-ów.
Ten job działa niezależnie od propozycji wydania w infra po przejściu quality.

Prywatny workflow propozycji przyjmuje wyłącznie ID prawdziwego Mobile CI.
Sprawdza repo i head_repository, branch next-dev, dokładną ścieżkę workflow,
event push/manual, SHA, run number i ukończony z sukcesem job quality. Actor i
link CI pochodzą z GitHub API, nie z metadanych przesłanych przez wywołującego.
Tworzy branch `mobile-next-dev/<SHA>-<run_number>` i PR. Nigdy go nie merguje.

Ponowienie tej samej propozycji wyszukuje PR we **wszystkich stanach przed
zmianą brancha**. Otwarty, zmergowany i zamknięty PR zostają bez zmian. Odrzucona
propozycja nie jest samoczynnie otwierana ponownie. Nowy manualny run Mobile
daje nowy run number i może zaproponować ponownie ten sam kod.

Workflow VPS ma tylko `push/main`, żadnego PR ani workflow_dispatch. Brak
`.env.version` oznacza czekanie na pierwszą zatwierdzoną propozycję. Wersja jest
parsowana, nigdy source/eval. Dozwolony format:

```dotenv
MOBILE_VERSION=1234567890abcdef1234567890abcdef12345678-42
```

Pełny lowercase SHA oraz versionCode 1..2100000000. Checkout dokładnego SHA;
kontrola przynależności do origin/next-dev. Dockerfile i konfiguracja hostingu
pochodzą z prywatnego infra, nie z publicznego Mobile. BuildKit key/password są
montowane dopiero w świeżym etapie podpisującym. Publiczny build nie dostaje
klucza ani mountów VPS. Końcowy obraz zawiera nginx, APK, checksum i stronę.
Kompilacja ma normalną izolację Docker, nie VM; review kodu pozostaje konieczny.

## Pliki zadania

Mobile:

- `.github/workflows/build.yaml`: quality, Android verification dla PR,
  oddzielny dispatch prywatnego workflow propozycji.
- `app.config.js`: profil next-dev, nazwa `Senswave next-dev`, package i scheme
  `com.develite.senswave.nextdev`, versionCode z run_number. Bez zmiany
  produkcyjnego `app.json` i wersjonowania EAS.
- `.dockerignore`: wyłączenie .env, kluczy, lokalnych buildów i node_modules.
- `tests/buildConfig.test.mjs`: konfiguracja, zachowanie produkcji, walidacja
  Android versionCode. Nowy skrypt `test:build` w `package.json`.
- Wąskie zmiany opisów CI/release: `AGENTS.md`, `README.md`,
  `docs/agent-guide/tooling.md`, `validation.md`, `repository.md`. Pozostałe
  zmiany tych plików oraz interface/api-and-data to wcześniejsza praca UI.

Next-Infra, wszystkie nowe:

- `.github/workflows/propose-next-dev-mobile.yaml`
- `.github/workflows/deploy-next-dev-mobile.yaml`
- `environments/next-dev/mobile/Dockerfile`
- `environments/next-dev/mobile/read-version.sh`
- `environments/next-dev/mobile/validate-request.mjs`
- `environments/next-dev/mobile/compose.yaml`, `nginx.conf`, `index.html`
- `ansible/playbooks/deploy-mobile.yaml`
- `tests/mobileRelease.test.mjs`, `mobileRequest.test.mjs`,
  `mobileProposal.test.mjs`
- `docs/next-dev-mobile.md`: pełna instrukcja uruchomienia i ograniczenia.

`.env.version` celowo jeszcze nie istnieje. Ma go dodać pierwsza wersjonująca PR.

## Bezpieczeństwo: wyniki rzeczywistych odczytów GitHub

- Organizacja ma GitHub Free. Próba odczytu private rulesets Next-Infra zwróciła
  403 z informacją o wymaganym upgrade/public repo. Nie opierać rozwiązania na
  niedostępnych wymaganych review/rulesets prywatnego repo.
- Next-Infra/main i Mobile/next-dev nie miały branch protection podczas audytu.
- Mobile nie ma dostępnego self-hosted runnera: API total_count=0.
- Domyślna grupa runnerów organizacji: visibility all,
  **allows_public_repositories=false**. Zachować to ustawienie.
- Z istniejących runów potwierdzono dokładną ścieżkę Mobile CI
  `.github/workflows/build.yaml`, bez sufiksu w polu API `path`.

Odrzucono wcześniejszy wariant: publiczny App token z Contents:write i
Pull requests:write oraz prywatne rulesets. Na tym planie nie dałoby się
egzekwować review, a publiczny klucz mógłby zmieniać infra/main.

Finalny App ma **tylko Actions read/write**, instalację tylko na Next-Infra;
bez Contents, Pull requests, Workflows, Administration i praw org. Wersję i PR
tworzy prywatny GITHUB_TOKEN na GitHub-hosted.

**Materialne ograniczenie:** GitHub nie zawęża Actions:write do pojedynczego
workflow. Wykradziony klucz może ponawiać/dispatchować inne istniejące prywatne
workflow i zużywać limity Actions. Nie zmieni kodu/wersji infra ani nie zmerguje
PR, ale może ponowić istniejący manualny deploy. Mobilny deploy celowo nie ma
dispatch. Ograniczenie jest opisane w instrukcji; nie deklarować pełnej
niemożliwości uruchomienia czegokolwiek na VPS przez ten klucz.

Publiczność repo sama nie daje obcym prawa push do next-dev; jednak zmergowany
niezaufany kod/zmiana workflow wymaga kontroli. Review PR infra musi obejmować
diff źródła, zmiany zależności i wykonywalnej konfiguracji Gradle/Expo.

## Weryfikacja zakończona

Mobile:

- `pnpm typecheck` PASS.
- `pnpm lint` PASS. Nowy test miał wcześniej `URL no-undef`; poprawiono import
  `URL` z node:url i ostatni lint był zielony.
- `pnpm test:poc` PASS.
- `pnpm test:build` PASS.

Next-Infra, po ostatniej poprawce ponowień:

```sh
node --test tests/mobileRelease.test.mjs tests/mobileRequest.test.mjs tests/mobileProposal.test.mjs
```

PASS: 5 testów. Test ponowień wykonuje rzeczywisty shell z kroku workflow z
lokalnymi atrapami gh/git; kontroluje brak mutacji przy istniejącym PR.
Był wykonany red przed poprawką, potem green. Testy parsowania i provenance
sprawdzają rzeczywiste skrypty, w tym odrzucanie shell injection.

- `actionlint` PASS dla wszystkich trzech workflow po ostatnich zmianach.
- PyYAML: parse trzech workflow, Compose i playbooka PASS.
- `git diff --check` PASS w obu repo. Uwaga: nie obejmuje nowych untracked files.
- Review przez agenta `review_mobile_pipeline`: bez Critical; dwa Important:
  1. Instalacja pnpm: początkowy URL do pojedynczego binarnego artefaktu 404.
     Zmieniony na oficjalny installer, lecz wystąpił kolejny błąd konfiguracji
     shella opisany niżej. Jeszcze nie rozwiązane.
  2. Replay zamkniętego/zmergowanego PR. Naprawione i potwierdzone testem.

Nie wykonano pełnego Ansible syntax-check; wykonano tylko parse YAML.
Nie ukończono APK, podpisu, testu HTTP ani instalacji na telefonie.

## Obecny blocker: instalator pnpm w Dockerze

**Ostatni lokalny build zakończył się exit 1 przed instalacją zależności i
kompilacją aplikacji.** Pobranie Node, Java i całego Android SDK już działa.
Pobranie i instalacja pnpm 12.8.1 również ruszyły poprawnie, ale `pnpm setup`
zwrócił:

```text
Error: ERR_PNPM_NO_SHELL_CONFIG
Cannot find a config file for sh. The ENV environment variable is not set.
Install Error!
```

Obecny fragment prywatnego Dockerfile:

```dockerfile
ENV PNPM_HOME=/opt/pnpm
ENV PATH=${PNPM_HOME}:${PATH}
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN curl --fail --location --retry 3 https://get.pnpm.io/install.sh -o /tmp/install-pnpm.sh \
    && PNPM_VERSION=$(node -p "require('./package.json').packageManager.replace(/^pnpm@/, '')") \
    SHELL=/bin/sh sh /tmp/install-pnpm.sh \
    && rm /tmp/install-pnpm.sh
```

Najbliższy krok: sprawdzić konfigurację shella oficjalnego installera w obrazie
Node bookworm. Prawdopodobnie wystarczy `SHELL=/bin/bash` zamiast `/bin/sh`;
to **propozycja do sprawdzenia, nie wykonana poprawka**. Nie zmieniać przypiętej
wersji pnpm, nie używać npm i nie usuwać frozen-lockfile/build approvals.

Przeczytano oficjalny installer; pnpm 12 używa natywnego executable oraz
sąsiadującego dist. Installer pobiera oba z registry i sprawdza integrity;
gdy dostępny openssl, również podpis registry. Sam pojedynczy plik binarny
z dawnego adresu GitHub nie wystarcza. Dokumentacja: https://pnpm.io/installation.
Pobrany do inspekcji skrypt: `/tmp/senswave-mobile-ci-check/install-pnpm.sh`.

Nieblokujące ostrzeżenie buildx: `InvalidDefaultArgInFrom`, bo ARG NODE_VERSION
nie ma domyślnej wartości. Workflow podaje zwalidowaną wersję z `.nvmrc`.

Parametry narzędzi: Node 26.10.0, pnpm 12.8.1, Java 17, platform/build-tools 36,
NDK 27.1.12297006, CMake 3.22.1. Builder x64, APK ARM arm64-v8a + armeabi-v7a,
Gradle max-workers=2. Nie dodano emulacji innych architektur.

## Wznowienie lokalnego builda

Testowe dane w `/tmp/senswave-mobile-ci-check/`:

- `test.p12`, `key.base64`, `password`: wyłącznie wygenerowany lokalny klucz
  testowy, alias senswave-next-dev, CN Local CI Verification. Nie używać do
  rzeczywistej dystrybucji. Nie ma tu produkcyjnego sekretu.
- `actionlint`: v1.7.12, pobrany z oficjalnego release i checksum zweryfikowany.
- Są cache Docker z pobraną Javą/SDK. Nie czyścić globalnych cache ani obrazów.

Ostatnia komenda, z cwd Mobile:

```sh
docker buildx build --load --progress plain \
  --build-context deployment=/home/kamil/repos/senswave/next-infra/environments/next-dev/mobile \
  --build-arg NODE_VERSION=26.10.0 \
  --build-arg VERSION_CODE=42 \
  --build-arg SOURCE_SHA=1234567890abcdef1234567890abcdef12345678 \
  --build-arg GOOGLE_CLIENT_ID=verification-only.apps.googleusercontent.com \
  --secret id=keystore_base64,src=/tmp/senswave-mobile-ci-check/key.base64 \
  --secret id=keystore_password,src=/tmp/senswave-mobile-ci-check/password \
  -f /home/kamil/repos/senswave/next-infra/environments/next-dev/mobile/Dockerfile \
  -t senswave-next-mobile:verify .
```

Nie używać `--push` dla tego testu. Obraz końcowy/APK jeszcze nie powstały.
Ostatni process session 66878 zakończony exit 1; wcześniejszy 16061 też exit 1.
Nie znamy aktywnego procesu kompilacji ani uruchomionego kontenera testowego.
Przy wznowieniu sprawdzić stan, gdyż przerwanie tur może pozostawić procesy.

Docker socket i sieć są zablokowane w sandbox. Gdy istotna komenda zawiedzie
z tego powodu, ponowić z require_escalated; nie obchodzić ograniczeń. Niektóre
testy spawnSync również wymagały wykonania poza sandbox. Użytkownik już
autoryzował kategorie docker buildx build / node --test / pnpm checks / gh GET,
ale respektować aktualne wymagania narzędzia. Nie wyświetlać tokenów ani .env.

## Pozostała praca, w kolejności

1. Naprawić konfigurację shella instalatora pnpm i ponowić build z cache.
2. Doprowadzić Docker build do rzeczywistego APK i podpisania testowym kluczem.
   Zgłaszać konkretny etap awarii; nie nazywać nieukończonego builda sukcesem.
3. Po sukcesie lokalnie uruchomić obraz pod 127.0.0.1 na wolnym porcie,
   sprawdzić stronę, MIME APK, attachment/no-store/nosniff, pobrane bajty,
   SHA-256, certyfikat, package/versionCode i brak sekretów w obrazie końcowym.
   Zatrzymać tylko własny kontener. Prawdziwy Google OAuth wymaga realnego ID
   i konfiguracji certyfikatu, więc lokalny testowy ID tego nie weryfikuje.
4. Ponowić odpowiednie testy infra/actionlint po zmianach. Pełny Ansible
   syntax-check, jeżeli istniejące środowisko na to pozwala; nie instalować
   zbędnych zależności w repo.
5. Ewentualny follow-up do istniejącego reviewera po naprawie builda.
   Review został zlecony zgodnie ze skillem requesting-code-review; nie
   uruchamiać agentów bez podstawy w bieżących instrukcjach.
6. Oddać użytkownikowi gotowe zmiany i jednoznaczny status. Nie commitować całej
   brudnej gałęzi i nie mergować PR autonomicznie.

## Jednorazowa konfiguracja przed realnym uruchomieniem

Pełne kroki są w `../next-infra/docs/next-dev-mobile.md`. Pozostały:

- GitHub App Actions read/write only, webhook disabled, installation tylko
  Next-Infra; Mobile variable `MOBILE_INFRA_APP_ID` i secret
  `MOBILE_INFRA_APP_PRIVATE_KEY`.
- Next-Infra Actions settings: zezwolić GITHUB_TOKEN na tworzenie PR.
- Next-Infra secrets `NEXT_DEV_ANDROID_KEYSTORE_BASE64` oraz
  `NEXT_DEV_ANDROID_KEYSTORE_PASSWORD`: osobny prawdziwy testowy keystore
  PKCS12, alias senswave-next-dev, jeden password dla store/key, backup offline.
- Next-Infra variable `NEXT_DEV_GOOGLE_CLIENT_ID`: publiczny web OAuth client
  ID zgodny z backendem. Android OAuth client dla
  `com.develite.senswave.nextdev` i SHA-1 prawdziwego klucza.
- DNS next-dev-mobile.senswave.net i HTTPS na istniejącym edge. Compose używa
  istniejącej sieci proxy i entrypoint web; brak nowego host portu.
- Runner x64, Docker/Buildx, Ansible i lokalny registry. Registry/Docker API
  mają pozostać prywatne. Wystarczające RAM/swap/dysk na SDK/cache.
- Najpierw zintegrować prywatne workflow i recipe, potem włączyć Mobile dispatch.
  Pierwszy realny deploy dopiero po ręcznym merge PR z wersją.
- Sprawdzić logowanie, email/reset/App Links i instalację/aktualizację na
  rzeczywistym Androidzie przy pierwszym zatwierdzonym wydaniu.

Publiczne standardowe CI nie wymaga nowej usługi płatnej; prywatny krótki job
propozycji zużywa limit GitHub-hosted organizacji i podlega billingowi po jego
wyczerpaniu. VPS przejmuje build, storage i transfer. Nie obiecywać absolutnie
zerowego kosztu poza istniejącym VPS.
