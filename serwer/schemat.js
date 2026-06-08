const bcrypt = require("bcrypt");
const { pobierz, uruchom, wszystkie } = require("./baza");

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
      okladka_url TEXT,
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

  await dopelnijKolumnyKsiazek();
}

async function dopelnijKolumnyKsiazek() {
  const kolumny = await wszystkie("PRAGMA table_info(ksiazki)");
  const nazwy = new Set(kolumny.map((kolumna) => kolumna.name));

  if (!nazwy.has("okladka_url")) {
    await uruchom("ALTER TABLE ksiazki ADD COLUMN okladka_url TEXT");
  }
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
    "SELECT id, okladka_url FROM ksiazki WHERE tytul = ? AND autor = ?",
    [ksiazka.tytul, ksiazka.autor]
  );

  if (istnieje) {
    if (ksiazka.okladka_url && !istnieje.okladka_url) {
      await uruchom(
        "UPDATE ksiazki SET okladka_url = ? WHERE id = ?",
        [ksiazka.okladka_url, istnieje.id]
      );
    }
    return istnieje.id;
  }

  const kategoria = await pobierzKategoriePoNazwie(ksiazka.kategoria);
  const wynik = await uruchom(
    `INSERT INTO ksiazki
      (tytul, autor, opis, id_kategorii, ocena, okladka_url, id_uzytkownika)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      ksiazka.tytul,
      ksiazka.autor,
      ksiazka.opis,
      kategoria.id,
      ksiazka.ocena,
      ksiazka.okladka_url || null,
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
      okladka_url: "https://covers.openlibrary.org/b/isbn/9780156027601-L.jpg",
      opis:
        "Klasyczna powieść science fiction o kontakcie z obcą inteligencją i granicach ludzkiego poznania. Stacja badawcza nad obcą planetą staje się sceną filozoficznego dramatu o pamięci i tęsknocie."
    },
    {
      tytul: "Lalka",
      autor: "Bolesław Prus",
      kategoria: "Powieść",
      ocena: 5,
      okladka_url: "https://covers.openlibrary.org/b/isbn/8307032334-L.jpg",
      opis:
        "Powieść o społeczeństwie, ambicji, uczuciach i Warszawie drugiej połowy XIX wieku. Historia Stanisława Wokulskiego to portret epoki i niespełnionej miłości na tle przemian społecznych."
    },
    {
      tytul: "Cesarz",
      autor: "Ryszard Kapuściński",
      kategoria: "Reportaż",
      ocena: 4,
      okladka_url: "https://covers.openlibrary.org/b/isbn/9788324004485-L.jpg",
      opis:
        "Reportaż literacki pokazujący mechanizmy władzy na przykładzie dworu Hajle Sellasje. Książka, w której Etiopia jest tylko pretekstem do uniwersalnej opowieści o autorytaryzmie."
    },
    {
      tytul: "Krótka historia czasu",
      autor: "Stephen Hawking",
      kategoria: "Nauka",
      ocena: 4,
      okladka_url: "https://covers.openlibrary.org/b/isbn/9780553380163-L.jpg",
      opis:
        "Popularnonaukowe wprowadzenie do pytań o kosmos, czas, czarne dziury i początek wszechświata. Klasyka, która tłumaczy współczesną fizykę bez wzorów, ale bez upraszczania."
    },
    {
      tytul: "Pan Tadeusz",
      autor: "Adam Mickiewicz",
      kategoria: "Powieść",
      ocena: 4.5,
      okladka_url: "https://covers.openlibrary.org/b/isbn/9788373273726-L.jpg",
      opis:
        "Epopeja narodowa o szlachcie polskiej, sporze o zamek i ostatnim zajeździe na Litwie. Język, obrazowanie i humor sprawiają, że ta lektura wciąż żyje poza szkolnym kanonem."
    },
    {
      tytul: "Chłopi",
      autor: "Władysław Reymont",
      kategoria: "Powieść",
      ocena: 4,
      okladka_url: "https://covers.openlibrary.org/b/isbn/9788373273139-L.jpg",
      opis:
        "Czterotomowa powieść o życiu wsi Lipce w rytmie pór roku. Reymont dał polskiej literaturze epopeję chłopską, za którą otrzymał literackiego Nobla."
    },
    {
      tytul: "Sto lat samotności",
      autor: "Gabriel García Márquez",
      kategoria: "Powieść",
      ocena: 5,
      okladka_url: "https://covers.openlibrary.org/b/isbn/9780060883287-L.jpg",
      opis:
        "Saga rodziny Buendía z fikcyjnego miasteczka Macondo. Najbardziej znana powieść realizmu magicznego, w której historia, mit i pamięć łączą się w jeden organizm."
    },
    {
      tytul: "Mistrz i Małgorzata",
      autor: "Michaił Bułhakow",
      kategoria: "Powieść",
      ocena: 5,
      okladka_url: "https://covers.openlibrary.org/b/isbn/9780141187761-L.jpg",
      opis:
        "Diabeł odwiedza stalinowską Moskwę, a w tle toczy się opowieść o Mistrzu, jego ukochanej i Poncjuszu Piłacie. Powieść o odwadze, miłości i władzy."
    },
    {
      tytul: "Cyberiada",
      autor: "Stanisław Lem",
      kategoria: "Fantastyka",
      ocena: 4.5,
      okladka_url: "https://covers.openlibrary.org/b/isbn/9788308039434-L.jpg",
      opis:
        "Cykl groteskowych opowiadań o konstruktorach Trurlu i Klapaucjuszu, którzy poruszają się po wszechświecie pełnym maszyn, królów i absurdu. Lem jako satyryk i filozof."
    },
    {
      tytul: "Ostatnie życzenie",
      autor: "Andrzej Sapkowski",
      kategoria: "Fantastyka",
      ocena: 4.5,
      okladka_url: "https://covers.openlibrary.org/b/isbn/9788375780635-L.jpg",
      opis:
        "Zbiór opowiadań otwierający sagę o wiedźminie Geralcie z Rivii. Dżinn, strzyga, mała syrenka i pojedynek na słowa zamiast mieczy - tu zaczyna się polska fantastyka."
    },
    {
      tytul: "Diuna",
      autor: "Frank Herbert",
      kategoria: "Fantastyka",
      ocena: 5,
      okladka_url: "https://covers.openlibrary.org/b/isbn/9780441172719-L.jpg",
      opis:
        "Polityka, religia i ekologia na pustynnej planecie Arrakis. Saga rodu Atrydów wyznaczyła standard współczesnej science fiction i wciąż jest wzorem worldbuildingu."
    },
    {
      tytul: "Władca Pierścieni: Drużyna Pierścienia",
      autor: "J.R.R. Tolkien",
      kategoria: "Fantastyka",
      ocena: 5,
      okladka_url: "https://covers.openlibrary.org/b/isbn/9780261103573-L.jpg",
      opis:
        "Pierwsza część epickiej trylogii o wędrówce ku Mordorowi. Drużyna z Rivendell rusza w drogę, by zniszczyć Pierścień, który zagraża całemu Śródziemiu."
    },
    {
      tytul: "Heban",
      autor: "Ryszard Kapuściński",
      kategoria: "Reportaż",
      ocena: 5,
      okladka_url: "https://covers.openlibrary.org/b/isbn/9780679402107-L.jpg",
      opis:
        "Zbiór reportaży z Afryki pisanych przez lata jako korespondent. Kapuściński nie pisze o Afryce jako bloku, tylko o setkach lokalnych spraw, ludzi i dróg."
    },
    {
      tytul: "Gottland",
      autor: "Mariusz Szczygieł",
      kategoria: "Reportaż",
      ocena: 4.5,
      okladka_url: "https://covers.openlibrary.org/b/isbn/9788375364095-L.jpg",
      opis:
        "Reportaże o czeskiej duszy XX wieku - pomniku Stalina, Bacie, Lidze i ucieczkach. Książka, która zmieniła sposób, w jaki Polacy patrzą na sąsiada zza Tatr."
    },
    {
      tytul: "Sapiens. Od zwierząt do bogów",
      autor: "Yuval Noah Harari",
      kategoria: "Nauka",
      ocena: 4,
      okladka_url: "https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg",
      opis:
        "Historia gatunku Homo sapiens od sawanny po XXI wiek. Książka popularnonaukowa, która wywołała ogromną debatę o tym, co naprawdę zrobiło z nas to, kim jesteśmy."
    },
    {
      tytul: "Egoistyczny gen",
      autor: "Richard Dawkins",
      kategoria: "Nauka",
      ocena: 4.5,
      okladka_url: "https://covers.openlibrary.org/b/isbn/9780192860927-L.jpg",
      opis:
        "Klasyka biologii ewolucyjnej, w której bohaterem doboru naturalnego okazuje się nie osobnik ani gatunek, lecz gen. Książka, która przedefiniowała sposób mówienia o ewolucji."
    },
    {
      tytul: "Uwikłanie",
      autor: "Zygmunt Miłoszewski",
      kategoria: "Kryminał",
      ocena: 4,
      okladka_url: "https://covers.openlibrary.org/b/isbn/9788376480398-L.jpg",
      opis:
        "Prokurator Teodor Szacki bada sprawę z elementami terapii ustawień rodzinnych. Polski kryminał, który wciąga i pokazuje Warszawę z innej strony."
    },
    {
      tytul: "Imię róży",
      autor: "Umberto Eco",
      kategoria: "Kryminał",
      ocena: 5,
      okladka_url: "https://covers.openlibrary.org/b/isbn/9780156001311-L.jpg",
      opis:
        "Średniowieczne opactwo, seria zagadkowych zgonów i biblioteka pełna sekretów. Eco łączy kryminał, traktat filozoficzny i literacką grę z czytelnikiem."
    }
  ];

  const idKsiazek = [];
  for (const ksiazka of ksiazki) {
    idKsiazek.push(await dodajKsiazkeStartowa(ksiazka, idUzytkownika));
  }

  const komentarze = [
    { ksiazka: "Solaris", ocena: 5, tresc: "Bardzo dobra książka do rozmowy o tym, czym jest poznanie." },
    { ksiazka: "Lalka", ocena: 5, tresc: "Długa, ale po czasie zostaje w pamięci." },
    { ksiazka: "Sto lat samotności", ocena: 5, tresc: "Trzeba dać się ponieść. Pierwsze sto stron wciąga na resztę życia." },
    { ksiazka: "Mistrz i Małgorzata", ocena: 5, tresc: "Po latach wraca się do niej z innym pytaniem za każdym razem." },
    { ksiazka: "Ostatnie życzenie", ocena: 4, tresc: "Świetne wejście do sagi - opowiadania trzymają poziom." },
    { ksiazka: "Diuna", ocena: 5, tresc: "Worldbuilding na najwyższym poziomie. Warto poznać oryginał." },
    { ksiazka: "Heban", ocena: 5, tresc: "Każdy rozdział to osobna podróż. Reportaż w najlepszym wydaniu." },
    { ksiazka: "Sapiens. Od zwierząt do bogów", ocena: 4, tresc: "Mocna synteza, ale warto czytać krytycznie." },
    { ksiazka: "Uwikłanie", ocena: 4, tresc: "Polski kryminał, który nie udaje skandynawskiego - i o to chodzi." }
  ];

  for (const komentarz of komentarze) {
    const indeks = ksiazki.findIndex((pozycja) => pozycja.tytul === komentarz.ksiazka);
    if (indeks === -1) {
      continue;
    }

    await dodajKomentarzStartowy({
      idUzytkownika,
      idKsiazki: idKsiazek[indeks],
      ocena: komentarz.ocena,
      tresc: komentarz.tresc
    });
  }
}

async function inicjalizujSchemat() {
  await utworzTabele();
  await dodajDaneStartowe();
}

module.exports = {
  inicjalizujSchemat
};
