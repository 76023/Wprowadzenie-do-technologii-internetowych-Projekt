const express = require("express");
const { pobierz, uruchom } = require("../baza");
const { wymagajLogowania } = require("../sesja");

const router = express.Router();

router.delete("/:id", wymagajLogowania, async (req, res) => {
  try {
    const komentarz = await pobierz(
      "SELECT id, id_uzytkownika FROM komentarze WHERE id = ?",
      [req.params.id]
    );

    if (!komentarz) {
      res.status(404).json({ komunikat: "Nie znaleziono komentarza." });
      return;
    }

    if (komentarz.id_uzytkownika !== req.session.uzytkownik.id) {
      res.status(403).json({ komunikat: "Możesz usuwać tylko własne komentarze." });
      return;
    }

    await uruchom("DELETE FROM komentarze WHERE id = ?", [req.params.id]);
    res.json({ komunikat: "Komentarz został usunięty." });
  } catch (blad) {
    console.error("Blad usuwania komentarza:", blad);
    res.status(500).json({ komunikat: "Nie udało się usunąć komentarza." });
  }
});

module.exports = router;
