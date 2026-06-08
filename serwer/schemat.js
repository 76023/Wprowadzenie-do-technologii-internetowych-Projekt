const bcrypt = require("bcrypt");
const { pobierz, uruchom } = require("./baza");

async function utworzTabele() {
  await uruchom(`
    CREATE TABLE IF NOT EXISTS uzytkownicy (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nazwa TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      haslo_hash TEXT NOT NULL,
      data_rejestracji TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await uruchom(`
    CREATE TABLE IF NOT EXISTS kategorie (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nazwa TEXT NOT NULL UNIQUE,
      opis TEXT
    )
  `);

  await uruchom(`
    CREATE TABLE IF NOT EXISTS ksiazki (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tytul TEXT NOT NULL,
      autor TEXT NOT NULL,
      opis TEXT NOT NULL,
      id_kategorii INTEGER NOT NULL,
      ocena REAL NOT NULL DEFAULT 0,
      data_dodania TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      id_uzytkownika INTEGER NOT NULL,
      FOREIGN KEY (id_kategorii) REFERENCES kategorie(id),
      FOREIGN KEY (id_uzytkownika) REFERENCES uzytkownicy(id) ON DELETE CASCADE
    )
  `);

  await uruchom(`
    CREATE TABLE IF NOT EXISTS komentarze (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tresc TEXT NOT NULL,
      ocena INTEGER NOT NULL,
      id_uzytkownika INTEGER NOT NULL,
      id_ksiazki INTEGER NOT NULL,
      data_dodania TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_uzytkownika) REFERENCES uzytkownicy(id) ON DELETE CASCADE,
      FOREIGN KEY (id_ksiazki) REFERENCES ksiazki(id) ON DELETE CASCADE
    )
  `);
}

async function dodajKategorieStartowe() {
  const kategorie = [
    ["Powieść", "Literatura obyczajowa, klasyczna i współczesna."],
    ["Fantastyka", "Książki z elementami świata wyobrażonego."],
    ["Reportaż", "Literatura faktu i opowieści dokumentalne."],
    ["Nauka", "Książki popularnonaukowe i edukacyjne."],
    ["Kryminał", "Zagadki, śledztwa i sensacja."]
  ];

  for (const [nazwa, opis] of kategorie) {
    await uruchom(
      "INSERT OR IGNORE INTO kategorie (nazwa, opis) VALUES (?, ?)",
      [nazwa, opis]
    );
  }
}

async function pobierzKategoriePoNazwie(nazwa) {
  return pobierz("SELECT id FROM kategorie WHERE nazwa = ?", [nazwa]);
}

async function dodajUzytkownikaStartowego() {
  const istnieje = await pobierz("SELECT id FROM uzytkownicy WHERE email = ?", [
    "demo@isaczytac.local"
  ]);

  if (istnieje) {
    return istnieje.id;
  }

  const hasloHash = await bcrypt.hash("demo1234", 10);
  const wynik = await uruchom(
    "INSERT INTO uzytkownicy (nazwa, email, haslo_hash) VALUES (?, ?, ?)",
    ["czytelnik_demo", "demo@isaczytac.local", hasloHash]
  );

  return wynik.id;
}

async function dodajKsiazkeStartowa(ksiazka, idUzytkownika) {
  const istnieje = await pobierz(
    "SELECT id FROM ksiazki WHERE tytul = ? AND autor = ?",
    [ksiazka.tytul, ksiazka.autor]
  );

  if (istnieje) {
    return istnieje.id;
  }

  const kategoria = await pobierzKategoriePoNazwie(ksiazka.kategoria);
  const wynik = await uruchom(
    `INSERT INTO ksiazki
      (tytul, autor, opis, id_kategorii, ocena, id_uzytkownika)
      VALUES (?, ?, ?, ?, ?, ?)`,
    [
      ksiazka.tytul,
      ksiazka.autor,
      ksiazka.opis,
      kategoria.id,
      ksiazka.ocena,
      idUzytkownika
    ]
  );

  return wynik.id;
}

async function dodajKomentarzStartowy(komentarz) {
  const istnieje = await pobierz(
    `SELECT id FROM komentarze
     WHERE id_uzytkownika = ? AND id_ksiazki = ? AND tresc = ?`,
    [komentarz.idUzytkownika, komentarz.idKsiazki, komentarz.tresc]
  );

  if (istnieje) {
    return;
  }

  await uruchom(
    `INSERT INTO komentarze (tresc, ocena, id_uzytkownika, id_ksiazki)
     VALUES (?, ?, ?, ?)`,
    [komentarz.tresc, komentarz.ocena, komentarz.idUzytkownika, komentarz.idKsiazki]
  );
}

async function dodajDaneStartowe() {
  await dodajKategorieStartowe();
  const idUzytkownika = await dodajUzytkownikaStartowego();

  const ksiazki = [
    {
      tytul: "Solaris",
      autor: "Stanisław Lem",
      kategoria: "Fantastyka",
      ocena: 5,
      opis:
        "Klasyczna powieść science fiction o kontakcie z obcą inteligencją i granicach ludzkiego poznania."
    },
    {
      tytul: "Lalka",
      autor: "Bolesław Prus",
      kategoria: "Powieść",
      ocena: 5,
      opis:
        "Powieść o społeczeństwie, ambicji, uczuciach i Warszawie drugiej połowy XIX wieku."
    },
    {
      tytul: "Cesarz",
      autor: "Ryszard Kapuściński",
      kategoria: "Reportaż",
      ocena: 4,
      opis:
        "Reportaż literacki pokazujący mechanizmy władzy na przykładzie dworu Hajle Sellasje."
    },
    {
      tytul: "Krótka historia czasu",
      autor: "Stephen Hawking",
      kategoria: "Nauka",
      ocena: 4,
      opis:
        "Popularnonaukowe wprowadzenie do pytań o kosmos, czas, czarne dziury i początek wszechświata."
    }
  ];

  const idKsiazek = [];
  for (const ksiazka of ksiazki) {
    idKsiazek.push(await dodajKsiazkeStartowa(ksiazka, idUzytkownika));
  }

  await dodajKomentarzStartowy({
    idUzytkownika,
    idKsiazki: idKsiazek[0],
    ocena: 5,
    tresc: "Bardzo dobra książka do rozmowy o tym, czym jest poznanie."
  });

  await dodajKomentarzStartowy({
    idUzytkownika,
    idKsiazki: idKsiazek[1],
    ocena: 5,
    tresc: "Długa, ale po czasie zostaje w pamięci."
  });
}

async function inicjalizujSchemat() {
  await utworzTabele();
  await dodajDaneStartowe();
}

module.exports = {
  inicjalizujSchemat
};
