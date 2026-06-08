const express = require("express");
const { pobierz, uruchom, wszystkie } = require("../baza");
const { wymagajLogowania } = require("../sesja");

const router = express.Router();

function czyscTekst(wartosc) {
  return String(wartosc || "").trim();
}

function sprawdzAdresOkladki(wartosc) {
  if (!wartosc) {
    return "";
  }

  if (wartosc.length > 500) {
    return null;
  }

  if (wartosc.startsWith("/img/") && !wartosc.startsWith("//")) {
    if (wartosc.includes("..") || wartosc.includes("\\")) {
      return null;
    }
    return wartosc;
  }

  try {
    const adres = new URL(wartosc);
    if (adres.protocol !== "http:" && adres.protocol !== "https:") {
      return null;
    }
    return adres.toString();
  } catch (blad) {
    return null;
  }
}

function sprawdzKsiazke(dane) {
  const tytul = czyscTekst(dane.tytul);
  const autor = czyscTekst(dane.autor);
  const opis = czyscTekst(dane.opis);
  const idKategorii = Number(dane.id_kategorii);
  const ocena = Number(dane.ocena);
  const adresOkladki = czyscTekst(dane.okladka_url);
  const okladkaUrl = sprawdzAdresOkladki(adresOkladki);
  const bledy = [];

  if (tytul.length < 2 || tytul.length > 120) {
    bledy.push("Tytuł musi mieć od 2 do 120 znaków.");
  }

  if (autor.length < 2 || autor.length > 120) {
    bledy.push("Autor musi mieć od 2 do 120 znaków.");
  }

  if (opis.length < 20 || opis.length > 2000) {
    bledy.push("Opis musi mieć od 20 do 2000 znaków.");
  }

  if (!Number.isInteger(idKategorii) || idKategorii < 1) {
    bledy.push("Wybierz kategorię.");
  }

  if (!Number.isFinite(ocena) || ocena < 1 || ocena > 5) {
    bledy.push("Ocena musi być liczbą od 1 do 5.");
  }

  if (okladkaUrl === null) {
    bledy.push("Adres okładki musi być linkiem http lub https albo lokalną ścieżką /img/... (do 500 znaków).");
  }

  return { bledy, tytul, autor, opis, idKategorii, ocena, okladkaUrl: okladkaUrl || null };
}

function sprawdzKomentarz(dane) {
  const tresc = czyscTekst(dane.tresc);
  const ocena = Number(dane.ocena);
  const bledy = [];

  if (tresc.length < 3 || tresc.length > 1000) {
    bledy.push("Komentarz musi mieć od 3 do 1000 znaków.");
  }

  if (!Number.isInteger(ocena) || ocena < 1 || ocena > 5) {
    bledy.push("Ocena komentarza musi być liczbą od 1 do 5.");
  }

  return { bledy, tresc, ocena };
}

async function pobierzKsiazkePoId(id) {
  return pobierz("SELECT id, id_uzytkownika FROM ksiazki WHERE id = ?", [id]);
}

function czyWlasciciel(req, ksiazka) {
  return ksiazka.id_uzytkownika === req.session.uzytkownik.id;
}

router.get("/", async (req, res) => {
  try {
    const szukaj = czyscTekst(req.query.szukaj);
    const idKategorii = Number(req.query.kategoria);
    const warunki = [];
    const parametry = [];

    if (szukaj) {
      warunki.push("(ksiazki.tytul LIKE ? OR ksiazki.autor LIKE ?)");
      parametry.push(`%${szukaj}%`, `%${szukaj}%`);
    }

    if (Number.isInteger(idKategorii) && idKategorii > 0) {
      warunki.push("ksiazki.id_kategorii = ?");
      parametry.push(idKategorii);
    }

    const gdzie = warunki.length ? `WHERE ${warunki.join(" AND ")}` : "";

    const ksiazki = await wszystkie(`
      SELECT
        ksiazki.id,
        ksiazki.tytul,
        ksiazki.autor,
        ksiazki.opis,
        ksiazki.ocena,
        ksiazki.okladka_url,
        ksiazki.data_dodania,
        kategorie.nazwa AS kategoria,
        uzytkownicy.nazwa AS nazwa_uzytkownika,
        (
          SELECT COUNT(*)
          FROM komentarze
          WHERE komentarze.id_ksiazki = ksiazki.id
        ) AS liczba_komentarzy
      FROM ksiazki
      JOIN kategorie ON kategorie.id = ksiazki.id_kategorii
      JOIN uzytkownicy ON uzytkownicy.id = ksiazki.id_uzytkownika
      ${gdzie}
      ORDER BY ksiazki.data_dodania DESC
    `, parametry);

    res.json({ ksiazki });
  } catch (blad) {
    console.error("Blad pobierania ksiazek:", blad);
    res.status(500).json({ komunikat: "Nie udało się pobrać listy książek." });
  }
});

router.post("/", wymagajLogowania, async (req, res) => {
  try {
    const { bledy, tytul, autor, opis, idKategorii, ocena, okladkaUrl } = sprawdzKsiazke(req.body);

    if (bledy.length) {
      res.status(400).json({ komunikat: bledy.join(" ") });
      return;
    }

    const kategoria = await pobierz("SELECT id FROM kategorie WHERE id = ?", [idKategorii]);
    if (!kategoria) {
      res.status(400).json({ komunikat: "Wybrana kategoria nie istnieje." });
      return;
    }

    const wynik = await uruchom(
      `INSERT INTO ksiazki
        (tytul, autor, opis, id_kategorii, ocena, okladka_url, id_uzytkownika)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tytul, autor, opis, idKategorii, ocena, okladkaUrl, req.session.uzytkownik.id]
    );

    res.status(201).json({
      komunikat: "Książka została dodana.",
      ksiazka: { id: wynik.id }
    });
  } catch (blad) {
    console.error("Blad dodawania ksiazki:", blad);
    res.status(500).json({ komunikat: "Nie udało się dodać książki." });
  }
});

router.get("/moje", wymagajLogowania, async (req, res) => {
  try {
    const ksiazki = await wszystkie(
      `
        SELECT
          ksiazki.id,
          ksiazki.tytul,
          ksiazki.autor,
          ksiazki.opis,
          ksiazki.ocena,
          ksiazki.okladka_url,
          ksiazki.data_dodania,
          kategorie.nazwa AS kategoria
        FROM ksiazki
        JOIN kategorie ON kategorie.id = ksiazki.id_kategorii
        WHERE ksiazki.id_uzytkownika = ?
        ORDER BY ksiazki.data_dodania DESC
      `,
      [req.session.uzytkownik.id]
    );

    res.json({ ksiazki });
  } catch (blad) {
    console.error("Blad pobierania moich ksiazek:", blad);
    res.status(500).json({ komunikat: "Nie udało się pobrać Twoich książek." });
  }
});

router.put("/:id", wymagajLogowania, async (req, res) => {
  try {
    const ksiazka = await pobierzKsiazkePoId(req.params.id);
    if (!ksiazka) {
      res.status(404).json({ komunikat: "Nie znaleziono książki." });
      return;
    }

    if (!czyWlasciciel(req, ksiazka)) {
      res.status(403).json({ komunikat: "Możesz edytować tylko własne książki." });
      return;
    }

    const { bledy, tytul, autor, opis, idKategorii, ocena, okladkaUrl } = sprawdzKsiazke(req.body);
    if (bledy.length) {
      res.status(400).json({ komunikat: bledy.join(" ") });
      return;
    }

    const kategoria = await pobierz("SELECT id FROM kategorie WHERE id = ?", [idKategorii]);
    if (!kategoria) {
      res.status(400).json({ komunikat: "Wybrana kategoria nie istnieje." });
      return;
    }

    await uruchom(
      `UPDATE ksiazki
       SET tytul = ?, autor = ?, opis = ?, id_kategorii = ?, ocena = ?, okladka_url = ?
       WHERE id = ?`,
      [tytul, autor, opis, idKategorii, ocena, okladkaUrl, req.params.id]
    );

    res.json({ komunikat: "Książka została zaktualizowana." });
  } catch (blad) {
    console.error("Blad edycji ksiazki:", blad);
    res.status(500).json({ komunikat: "Nie udało się zaktualizować książki." });
  }
});

router.delete("/:id", wymagajLogowania, async (req, res) => {
  try {
    const ksiazka = await pobierzKsiazkePoId(req.params.id);
    if (!ksiazka) {
      res.status(404).json({ komunikat: "Nie znaleziono książki." });
      return;
    }

    if (!czyWlasciciel(req, ksiazka)) {
      res.status(403).json({ komunikat: "Możesz usunąć tylko własne książki." });
      return;
    }

    await uruchom("DELETE FROM ksiazki WHERE id = ?", [req.params.id]);
    res.json({ komunikat: "Książka została usunięta." });
  } catch (blad) {
    console.error("Blad usuwania ksiazki:", blad);
    res.status(500).json({ komunikat: "Nie udało się usunąć książki." });
  }
});

router.get("/:id/komentarze", async (req, res) => {
  try {
    const ksiazka = await pobierzKsiazkePoId(req.params.id);
    if (!ksiazka) {
      res.status(404).json({ komunikat: "Nie znaleziono książki." });
      return;
    }

    const komentarze = await wszystkie(
      `
        SELECT
          komentarze.id,
          komentarze.tresc,
          komentarze.ocena,
          komentarze.data_dodania,
          komentarze.id_uzytkownika,
          uzytkownicy.nazwa AS nazwa_uzytkownika
        FROM komentarze
        JOIN uzytkownicy ON uzytkownicy.id = komentarze.id_uzytkownika
        WHERE komentarze.id_ksiazki = ?
        ORDER BY komentarze.data_dodania DESC
      `,
      [req.params.id]
    );

    res.json({ komentarze });
  } catch (blad) {
    console.error("Blad pobierania komentarzy:", blad);
    res.status(500).json({ komunikat: "Nie udało się pobrać komentarzy." });
  }
});

router.post("/:id/komentarze", wymagajLogowania, async (req, res) => {
  try {
    const ksiazka = await pobierzKsiazkePoId(req.params.id);
    if (!ksiazka) {
      res.status(404).json({ komunikat: "Nie znaleziono książki." });
      return;
    }

    const { bledy, tresc, ocena } = sprawdzKomentarz(req.body);
    if (bledy.length) {
      res.status(400).json({ komunikat: bledy.join(" ") });
      return;
    }

    const wynik = await uruchom(
      `INSERT INTO komentarze (tresc, ocena, id_uzytkownika, id_ksiazki)
       VALUES (?, ?, ?, ?)`,
      [tresc, ocena, req.session.uzytkownik.id, req.params.id]
    );

    res.status(201).json({
      komunikat: "Komentarz został dodany.",
      komentarz: { id: wynik.id }
    });
  } catch (blad) {
    console.error("Blad dodawania komentarza:", blad);
    res.status(500).json({ komunikat: "Nie udało się dodać komentarza." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const ksiazka = await pobierz(
      `
        SELECT
          ksiazki.id,
          ksiazki.tytul,
          ksiazki.autor,
          ksiazki.opis,
          ksiazki.ocena,
          ksiazki.okladka_url,
          ksiazki.data_dodania,
          ksiazki.id_uzytkownika,
          kategorie.id AS id_kategorii,
          kategorie.nazwa AS kategoria,
          uzytkownicy.nazwa AS nazwa_uzytkownika
        FROM ksiazki
        JOIN kategorie ON kategorie.id = ksiazki.id_kategorii
        JOIN uzytkownicy ON uzytkownicy.id = ksiazki.id_uzytkownika
        WHERE ksiazki.id = ?
      `,
      [req.params.id]
    );

    if (!ksiazka) {
      res.status(404).json({ komunikat: "Nie znaleziono książki." });
      return;
    }

    res.json({ ksiazka });
  } catch (blad) {
    console.error("Blad pobierania szczegolow ksiazki:", blad);
    res.status(500).json({ komunikat: "Nie udało się pobrać szczegółów książki." });
  }
});

module.exports = router;
