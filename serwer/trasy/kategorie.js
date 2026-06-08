const express = require("express");
const { wszystkie } = require("../baza");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const kategorie = await wszystkie(`
      SELECT id, nazwa, opis
      FROM kategorie
      ORDER BY nazwa ASC
    `);

    res.json({ kategorie });
  } catch (blad) {
    console.error("Blad pobierania kategorii:", blad);
    res.status(500).json({ komunikat: "Nie udało się pobrać kategorii." });
  }
});

module.exports = router;
