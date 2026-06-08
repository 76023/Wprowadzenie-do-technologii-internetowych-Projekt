const express = require("express");
const bcrypt = require("bcrypt");
const { pobierz, uruchom } = require("../baza");
const { ustawUzytkownikaSesji, wyczyscSesje } = require("../sesja");

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

function sprawdzLogowanie(dane) {
  const email = czyscTekst(dane.email).toLowerCase();
  const haslo = String(dane.haslo || "");
  const bledy = [];

  if (!sprawdzEmail(email)) {
    bledy.push("Podaj poprawny adres email.");
  }

  if (!haslo) {
    bledy.push("Podaj hasło.");
  }

  return { bledy, email, haslo };
}

router.get("/sesja", (req, res) => {
  res.json({
    uzytkownik: req.session.uzytkownik || null
  });
});

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

router.post("/logowanie", async (req, res) => {
  try {
    const { bledy, email, haslo } = sprawdzLogowanie(req.body);

    if (bledy.length) {
      res.status(400).json({ komunikat: bledy.join(" ") });
      return;
    }

    const uzytkownik = await pobierz(
      "SELECT id, nazwa, email, haslo_hash FROM uzytkownicy WHERE email = ?",
      [email]
    );

    if (!uzytkownik) {
      res.status(401).json({ komunikat: "Niepoprawny email lub hasło." });
      return;
    }

    const hasloPoprawne = await bcrypt.compare(haslo, uzytkownik.haslo_hash);
    if (!hasloPoprawne) {
      res.status(401).json({ komunikat: "Niepoprawny email lub hasło." });
      return;
    }

    ustawUzytkownikaSesji(req, uzytkownik);
    res.json({
      komunikat: "Zalogowano poprawnie.",
      uzytkownik: req.session.uzytkownik
    });
  } catch (blad) {
    console.error("Blad logowania:", blad);
    res.status(500).json({ komunikat: "Nie udało się zalogować." });
  }
});

router.post("/wylogowanie", async (req, res) => {
  try {
    if (!req.session.uzytkownik) {
      res.json({ komunikat: "Użytkownik nie był zalogowany." });
      return;
    }

    await wyczyscSesje(req);
    res.clearCookie("isaczytac.sid");
    res.json({ komunikat: "Wylogowano poprawnie." });
  } catch (blad) {
    console.error("Blad wylogowania:", blad);
    res.status(500).json({ komunikat: "Nie udało się wylogować." });
  }
});

module.exports = router;
