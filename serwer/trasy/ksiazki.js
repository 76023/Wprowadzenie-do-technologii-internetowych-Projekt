const express = require("express");
const { wszystkie } = require("../baza");

const router = express.Router();

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

module.exports = router;
