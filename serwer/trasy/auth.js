const express = require("express");
const bcrypt = require("bcrypt");
const { pobierz, uruchom } = require("../baza");

const router = express.Router();

function czyscTekst(wartosc) {
  return String(wartosc || "").trim();
}

function sprawdzEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sprawdzRejestracje(dane) {
  const bledy = [];
  const nazwa = czyscTekst(dane.nazwa);
  const email = czyscTekst(dane.email).toLowerCase();
  const haslo = String(dane.haslo || "");

  if (nazwa.length < 3 || nazwa.length > 30) {
    bledy.push("Nazwa użytkownika musi mieć od 3 do 30 znaków.");
  }

  if (!sprawdzEmail(email)) {
    bledy.push("Podaj poprawny adres email.");
  }

  if (haslo.length < 6) {
    bledy.push("Hasło musi mieć co najmniej 6 znaków.");
  }

  return { bledy, nazwa, email, haslo };
}

router.post("/rejestracja", async (req, res) => {
  try {
    const { bledy, nazwa, email, haslo } = sprawdzRejestracje(req.body);

    if (bledy.length) {
      res.status(400).json({ komunikat: bledy.join(" ") });
      return;
    }

    const istnieje = await pobierz(
      "SELECT id FROM uzytkownicy WHERE nazwa = ? OR email = ?",
      [nazwa, email]
    );

    if (istnieje) {
      res.status(409).json({ komunikat: "Użytkownik o takiej nazwie lub emailu już istnieje." });
      return;
    }

    const hasloHash = await bcrypt.hash(haslo, 10);
    await uruchom(
      "INSERT INTO uzytkownicy (nazwa, email, haslo_hash) VALUES (?, ?, ?)",
      [nazwa, email, hasloHash]
    );

    res.status(201).json({ komunikat: "Konto zostało utworzone. Możesz się zalogować." });
  } catch (blad) {
    console.error("Blad rejestracji:", blad);
    res.status(500).json({ komunikat: "Nie udało się utworzyć konta." });
  }
});

module.exports = router;
