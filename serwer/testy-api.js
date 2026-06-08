const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const port = 3100;
const adres = `http://127.0.0.1:${port}`;
const sciezkaTestowejBazy = path.join(__dirname, "..", "baza", "isaczytac-test.sqlite");

function czekaj(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function czekajNaSerwer() {
  for (let proba = 0; proba < 40; proba += 1) {
    try {
      const odpowiedz = await fetch(`${adres}/api/status`);
      if (odpowiedz.ok) {
        return;
      }
    } catch (blad) {
      await czekaj(250);
    }
  }

  throw new Error("Serwer testowy nie uruchomił się na czas.");
}

async function pobierzJson(sciezka, opcje = {}) {
  const odpowiedz = await fetch(`${adres}${sciezka}`, opcje);
  const dane = await odpowiedz.json();
  return { odpowiedz, dane };
}

async function sprawdzStrone(sciezka, podpis) {
  const odpowiedz = await fetch(`${adres}${sciezka}`);
  const html = await odpowiedz.text();

  sprawdz(odpowiedz.ok, `${podpis} nie odpowiada.`);
  sprawdz(html.includes("ISACzytac"), `${podpis} nie zawiera nazwy aplikacji.`);
}

function sprawdz(warunek, komunikat) {
  if (!warunek) {
    throw new Error(komunikat);
  }
}

function pobierzCookie(naglowki) {
  const cookies = typeof naglowki.getSetCookie === "function"
    ? naglowki.getSetCookie()
    : [naglowki.get("set-cookie")].filter(Boolean);

  return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

async function wykonajTesty() {
  fs.rmSync(sciezkaTestowejBazy, { force: true });
  fs.rmSync(`${sciezkaTestowejBazy}-journal`, { force: true });

  const serwer = spawn(process.execPath, ["serwer/server.js"], {
    cwd: path.join(__dirname, ".."),
    env: {
      ...process.env,
      PORT: String(port),
      DB_PATH: sciezkaTestowejBazy,
      SESSION_SECRET: "sekret-testowy"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let wyjscieSerwera = "";
  serwer.stdout.on("data", (dane) => {
    wyjscieSerwera += dane.toString();
  });
  serwer.stderr.on("data", (dane) => {
    wyjscieSerwera += dane.toString();
  });

  try {
    await czekajNaSerwer();

    const strony = [
      ["/", "Strona główna"],
      ["/ksiazki", "Lista książek"],
      ["/ksiazka?id=1", "Szczegóły książki"],
      ["/dodaj-ksiazke", "Dodawanie książki"],
      ["/edytuj-ksiazke?id=1", "Edycja książki"],
      ["/logowanie", "Logowanie"],
      ["/rejestracja", "Rejestracja"],
      ["/moje-ksiazki", "Moje książki"],
      ["/o-projekcie", "O projekcie"]
    ];

    for (const [sciezka, podpis] of strony) {
      await sprawdzStrone(sciezka, podpis);
    }

    const lista = await pobierzJson("/api/ksiazki");
    sprawdz(lista.odpowiedz.ok, "Lista książek nie odpowiada.");
    sprawdz(lista.dane.ksiazki.length >= 4, "Brakuje danych startowych książek.");

    const znacznik = Date.now();
    const email = `test-${znacznik}@isaczytac.local`;
    const haslo = "testowe123";

    const rejestracja = await pobierzJson("/api/auth/rejestracja", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nazwa: `tester_${znacznik}`,
        email,
        haslo
      })
    });
    sprawdz(rejestracja.odpowiedz.status === 201, "Rejestracja zwróciła niepoprawny status.");

    const logowanie = await pobierzJson("/api/auth/logowanie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, haslo })
    });
    sprawdz(logowanie.odpowiedz.ok, "Logowanie nie powiodło się.");

    const cookie = pobierzCookie(logowanie.odpowiedz.headers);
    sprawdz(cookie, "Nie otrzymano cookie sesji.");

    const kategorie = await pobierzJson("/api/kategorie");
    const idKategorii = kategorie.dane.kategorie[0].id;

    const dodanie = await pobierzJson("/api/ksiazki", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie
      },
      body: JSON.stringify({
        tytul: "Książka testowa",
        autor: "Autor testowy",
        opis: "Opis testowy ma więcej niż dwadzieścia znaków.",
        id_kategorii: idKategorii,
        ocena: 4.5
      })
    });
    sprawdz(dodanie.odpowiedz.status === 201, "Dodawanie książki nie powiodło się.");

    const idKsiazki = dodanie.dane.ksiazka.id;
    const szczegoly = await pobierzJson(`/api/ksiazki/${idKsiazki}`);
    sprawdz(szczegoly.dane.ksiazka.tytul === "Książka testowa", "Szczegóły książki są niepoprawne.");

    const edycja = await pobierzJson(`/api/ksiazki/${idKsiazki}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie
      },
      body: JSON.stringify({
        tytul: "Książka testowa po edycji",
        autor: "Autor testowy",
        opis: "Opis po edycji nadal ma odpowiednią długość.",
        id_kategorii: idKategorii,
        ocena: 5
      })
    });
    sprawdz(edycja.odpowiedz.ok, "Edycja książki nie powiodła się.");

    const komentarz = await pobierzJson(`/api/ksiazki/${idKsiazki}/komentarze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie
      },
      body: JSON.stringify({
        tresc: "Komentarz testowy",
        ocena: 5
      })
    });
    sprawdz(komentarz.odpowiedz.status === 201, "Dodawanie komentarza nie powiodło się.");

    const komentarze = await pobierzJson(`/api/ksiazki/${idKsiazki}/komentarze`);
    sprawdz(komentarze.dane.komentarze.length === 1, "Lista komentarzy ma zły rozmiar.");

    const usuniecieKomentarza = await pobierzJson(`/api/komentarze/${komentarz.dane.komentarz.id}`, {
      method: "DELETE",
      headers: { Cookie: cookie }
    });
    sprawdz(usuniecieKomentarza.odpowiedz.ok, "Usuwanie komentarza nie powiodło się.");

    const filtrowanie = await pobierzJson("/api/ksiazki?szukaj=testowa");
    sprawdz(filtrowanie.dane.ksiazki.length >= 1, "Wyszukiwanie nie znalazło książki testowej.");

    const mojeKsiazki = await pobierzJson("/api/ksiazki/moje", {
      headers: { Cookie: cookie }
    });
    sprawdz(mojeKsiazki.dane.ksiazki.length === 1, "Widok moich książek jest niepoprawny.");

    const usuniecieKsiazki = await pobierzJson(`/api/ksiazki/${idKsiazki}`, {
      method: "DELETE",
      headers: { Cookie: cookie }
    });
    sprawdz(usuniecieKsiazki.odpowiedz.ok, "Usuwanie książki nie powiodło się.");

    console.log("Testy API zakończone powodzeniem.");
  } catch (blad) {
    console.error(blad.message);
    if (wyjscieSerwera) {
      console.error("Wyjście serwera testowego:");
      console.error(wyjscieSerwera);
    }
    process.exitCode = 1;
  } finally {
    serwer.kill();
  }
}

wykonajTesty();
