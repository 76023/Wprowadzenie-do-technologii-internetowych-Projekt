const express = require("express");
const { pobierz, uruchom, wszystkie } = require("../baza");
const { wymagajLogowania } = require("../sesja");

const router = express.Router();

function czyscTekst(wartosc) {
  return String(wartosc || "").trim();
}

function sprawdzKsiazke(dane) {
  const tytul = czyscTekst(dane.tytul);
  const autor = czyscTekst(dane.autor);
  const opis = czyscTekst(dane.opis);
  const idKategorii = Number(dane.id_kategorii);
  const ocena = Number(dane.ocena);
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

  return { bledy, tytul, autor, opis, idKategorii, ocena };
}

async function pobierzKsiazkePoId(id) {
  return pobierz("SELECT id, id_uzytkownika FROM ksiazki WHERE id = ?", [id]);
}

function czyWlasciciel(req, ksiazka) {
  return ksiazka.id_uzytkownika === req.session.uzytkownik.id;
}

router.get("/", async (req, res) => {
  try {
    const ksiazki = await wszystkie(`
      SELECT
        ksiazki.id,
        ksiazki.tytul,
        ksiazki.autor,
        ksiazki.opis,
        ksiazki.ocena,
        ksiazki.data_dodania,
        kategorie.nazwa AS kategoria,
        uzytkownicy.nazwa AS nazwa_uzytkownika,
        COUNT(komentarze.id) AS liczba_komentarzy
      FROM ksiazki
      JOIN kategorie ON kategorie.id = ksiazki.id_kategorii
      JOIN uzytkownicy ON uzytkownicy.id = ksiazki.id_uzytkownika
      LEFT JOIN komentarze ON komentarze.id_ksiazki = ksiazki.id
      GROUP BY ksiazki.id
      ORDER BY datetime(ksiazki.data_dodania) DESC
    `);

    res.json({ ksiazki });
  } catch (blad) {
    console.error("Blad pobierania ksiazek:", blad);
    res.status(500).json({ komunikat: "Nie udało się pobrać listy książek." });
  }
});

router.post("/", wymagajLogowania, async (req, res) => {
  try {
    const { bledy, tytul, autor, opis, idKategorii, ocena } = sprawdzKsiazke(req.body);

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
        (tytul, autor, opis, id_kategorii, ocena, id_uzytkownika)
        VALUES (?, ?, ?, ?, ?, ?)`,
      [tytul, autor, opis, idKategorii, ocena, req.session.uzytkownik.id]
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

    const { bledy, tytul, autor, opis, idKategorii, ocena } = sprawdzKsiazke(req.body);
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
       SET tytul = ?, autor = ?, opis = ?, id_kategorii = ?, ocena = ?
       WHERE id = ?`,
      [tytul, autor, opis, idKategorii, ocena, req.params.id]
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
