# ISACzytac

ISACzytac to projekt semestralny przygotowany na przedmiot **Wprowadzenie do technologii internetowych**.
Aplikacja jest prostym serwisem książkowym inspirowanym ideą katalogu i komentarzy czytelników, ale bez kopiowania gotowych rozwiązań.

## Cel projektu

Celem projektu jest pokazanie działania kompletnej aplikacji webowej z frontendem, backendem i bazą danych:

- użytkownik może założyć konto i zalogować się,
- zalogowany użytkownik może dodawać książki,
- właściciel książki może ją edytować albo usunąć,
- zalogowani użytkownicy mogą komentować książki i wystawiać oceny,
- lista książek obsługuje wyszukiwanie po tytule lub autorze oraz filtrowanie po kategorii.

## Technologie

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Baza danych: SQLite
- Logowanie: express-session
- Hashowanie haseł: bcrypt

Projekt nie używa frameworka frontendowego. Strony HTML znajdują się w katalogu `public`, a JavaScript komunikuje się z backendem przez API JSON.

## Najważniejsze funkcje

- Strona główna z ostatnio dodanymi książkami.
- Lista książek z wyszukiwaniem i filtrem kategorii.
- Szczegóły książki z komentarzami.
- Dodawanie, edycja i usuwanie własnych książek.
- Rejestracja, logowanie, wylogowanie i panel zalogowanego użytkownika.
- Dodawanie komentarzy z oceną od 1 do 5.
- Usuwanie własnych komentarzy.
- Widok „Moje książki”.
- Responsywny układ z boczną nawigacją na desktopie i dolną nawigacją na małych ekranach.

## Struktura bazy danych

Tabela `uzytkownicy`:

- `id`
- `nazwa`
- `email`
- `haslo_hash`
- `data_rejestracji`

Tabela `kategorie`:

- `id`
- `nazwa`
- `opis`

Tabela `ksiazki`:

- `id`
- `tytul`
- `autor`
- `opis`
- `id_kategorii`
- `ocena`
- `data_dodania`
- `id_uzytkownika`

Tabela `komentarze`:

- `id`
- `tresc`
- `ocena`
- `id_uzytkownika`
- `id_ksiazki`
- `data_dodania`

Relacje są ustawione przez klucze obce. Usunięcie użytkownika usuwa jego książki, a usunięcie książki usuwa jej komentarze.

## Uruchomienie lokalne

Wymagany jest Node.js.

```bash
npm install
npm start
```

Po uruchomieniu aplikacja jest dostępna pod adresem:

```text
http://localhost:3000
```

Tryb deweloperski z automatycznym restartem:

```bash
npm run dev
```

Test podstawowych przepływów API:

```bash
npm test
```

Przy pierwszym uruchomieniu aplikacja tworzy bazę SQLite i dodaje przykładowe dane. Domyślne konto testowe:

- email: `demo@isaczytac.local`
- hasło: `demo1234`

## Reset lokalnej bazy do widoku demo

Jeśli lokalna baza zawiera stare dane testowe (np. konta lub książki dodane podczas pracy z kodem) i chcesz zobaczyć czysty stan z 18 książkami demo, zatrzymaj serwer i usuń plik bazy:

PowerShell:

```powershell
Remove-Item baza\isaczytac.sqlite, baza\isaczytac.sqlite-journal -Force -ErrorAction SilentlyContinue
```

Git Bash / Linux / macOS:

```bash
rm -f baza/isaczytac.sqlite baza/isaczytac.sqlite-journal
```

Pliki `*.sqlite` są w `.gitignore`, więc operacja dotyczy tylko Twojej kopii. Po następnym `npm start` aplikacja utworzy świeżą bazę z 18 książkami i lokalnymi okładkami SVG. Plik sesji `baza/sesje.sqlite` możesz zachować lub usunąć - usunięcie wyloguje wszystkich zalogowanych użytkowników.

## Okładki książek

Każda zaseedowana książka korzysta z lokalnego SVG w katalogu `public/img/okladki/`. Pole `okladka_url` w bazie akceptuje:

- pełne adresy `http://` lub `https://`,
- ścieżki lokalne zaczynające się od `/img/` (np. własne okładki w `public/img/okladki/`).

Niepoprawne wartości (`javascript:`, `data:`, ścieżki spoza `/img/`, traversal `..`) są odrzucane. Jeśli pole pozostanie puste, frontend pokaże domyślny `public/img/brak-okladki.svg`.

## Zmienne środowiskowe

Przykład znajduje się w pliku `.env.example`.

- `PORT` - port serwera, lokalnie domyślnie `3000`
- `SESSION_SECRET` - sekret sesji
- `DB_PATH` - ścieżka do pliku bazy SQLite
- `SESSION_DB_DIR` - opcjonalny katalog pliku sesji SQLite

## Deployment

Projekt jest przygotowany do hostingu Node.js, np. Render albo Railway.

Podstawowe ustawienia:

- build command: `npm install`
- start command: `npm start`
- wymagane zmienne: `SESSION_SECRET`
- opcjonalnie: `DB_PATH`, jeśli baza SQLite ma być zapisana na trwałym dysku

Dla Render dodano przykładowy plik `render.yaml`, który ustawia `DB_PATH=/data/isaczytac.sqlite` i używa dysku `/data` dla trwałych danych.

## Jak działa aplikacja

Serwer Express udostępnia statyczne pliki z katalogu `public` oraz API w ścieżkach `/api/...`.
Frontend pobiera dane przez `fetch`, a następnie renderuje listy, szczegóły i formularze po stronie przeglądarki.

Logowanie działa na sesjach serwerowych. Po poprawnym podaniu emaila i hasła backend zapisuje w sesji podstawowe dane użytkownika. Hasła nie są zapisywane jawnie, tylko jako hash bcrypt.

Książki są zapisywane w tabeli `ksiazki`. Każda książka ma przypisanego użytkownika oraz kategorię. Backend sprawdza, czy edycję i usuwanie wykonuje właściciel książki.

Komentarze są zapisywane w tabeli `komentarze`. Każdy komentarz należy do jednej książki i jednego użytkownika. Usunąć komentarz może tylko jego autor.

## Etapy wykonania

Projekt był budowany krok po kroku:

1. Utworzenie struktury projektu.
2. Dodanie serwera Express i podstawowych stron.
3. Podłączenie SQLite.
4. Utworzenie schematu bazy i danych startowych.
5. Dodanie listy książek.
6. Dodanie strony szczegółów książki.
7. Dodanie rejestracji użytkowników.
8. Dodanie logowania i sesji.
9. Dodanie formularza tworzenia książek.
10. Dodanie edycji i usuwania własnych książek.
11. Dodanie komentarzy i ocen.
12. Dodanie wyszukiwania i filtrowania.
13. Dodanie strony „Moje książki”.
14. Dopracowanie interfejsu, walidacji i komunikatów.
15. Dodanie testów API i przygotowanie hostingu.

