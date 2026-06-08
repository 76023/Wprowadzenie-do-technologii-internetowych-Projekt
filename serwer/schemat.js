const bcrypt = require("bcrypt");
const { pobierz, uruchom, wszystkie } = require("./baza");
const { TRYB } = require("./tryb-bazy");

const KLUCZ_GLOWNY = TRYB === "postgresql" ? "SERIAL PRIMARY KEY" : "INTEGER PRIMARY KEY AUTOINCREMENT";
const TYP_DATY = TRYB === "postgresql" ? "TIMESTAMP" : "TEXT";

async function utworzTabele() {
  await uruchom(`
    CREATE TABLE IF NOT EXISTS uzytkownicy (
      id ${KLUCZ_GLOWNY},
      nazwa TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      haslo_hash TEXT NOT NULL,
      data_rejestracji ${TYP_DATY} NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await uruchom(`
    CREATE TABLE IF NOT EXISTS kategorie (
      id ${KLUCZ_GLOWNY},
      nazwa TEXT NOT NULL UNIQUE,
      opis TEXT
    )
  `);

  await uruchom(`
    CREATE TABLE IF NOT EXISTS ksiazki (
      id ${KLUCZ_GLOWNY},
      tytul TEXT NOT NULL,
      autor TEXT NOT NULL,
      opis TEXT NOT NULL,
      id_kategorii INTEGER NOT NULL,
      ocena REAL NOT NULL DEFAULT 0,
      okladka_url TEXT,
      data_dodania ${TYP_DATY} NOT NULL DEFAULT CURRENT_TIMESTAMP,
      id_uzytkownika INTEGER NOT NULL,
      FOREIGN KEY (id_kategorii) REFERENCES kategorie(id),
      FOREIGN KEY (id_uzytkownika) REFERENCES uzytkownicy(id) ON DELETE CASCADE
    )
  `);

  await uruchom(`
    CREATE TABLE IF NOT EXISTS komentarze (
      id ${KLUCZ_GLOWNY},
      tresc TEXT NOT NULL,
      ocena INTEGER NOT NULL,
      id_uzytkownika INTEGER NOT NULL,
      id_ksiazki INTEGER NOT NULL,
      data_dodania ${TYP_DATY} NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_uzytkownika) REFERENCES uzytkownicy(id) ON DELETE CASCADE,
      FOREIGN KEY (id_ksiazki) REFERENCES ksiazki(id) ON DELETE CASCADE
    )
  `);

  await dopelnijKolumnyKsiazek();
}

async function pobierzNazwyKolumn(tabela) {
  if (TRYB === "postgresql") {
    const wiersze = await wszystkie(
      "SELECT column_name AS name FROM information_schema.columns WHERE table_name = ?",
      [tabela]
    );
    return new Set(wiersze.map((w) => w.name));
  }

  const wiersze = await wszystkie(`PRAGMA table_info(${tabela})`);
  return new Set(wiersze.map((w) => w.name));
}

async function dopelnijKolumnyKsiazek() {
  const nazwy = await pobierzNazwyKolumn("ksiazki");

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

  const sql = TRYB === "postgresql"
    ? "INSERT INTO kategorie (nazwa, opis) VALUES (?, ?) ON CONFLICT (nazwa) DO NOTHING"
    : "INSERT OR IGNORE INTO kategorie (nazwa, opis) VALUES (?, ?)";

  for (const [nazwa, opis] of kategorie) {
    await uruchom(sql, [nazwa, opis]);
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
    const obecna = istnieje.okladka_url || "";
    const czyPusta = !obecna;
    const czyStaryUrlSeed = obecna.startsWith("https://covers.openlibrary.org/");

    if (ksiazka.okladka_url && (czyPusta || czyStaryUrlSeed)) {
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
      okladka_url: "/img/okladki/solaris.svg",
      opis:
        "Klasyczna powieść science fiction o kontakcie z obcą inteligencją i granicach ludzkiego poznania. Stacja badawcza nad obcą planetą staje się sceną filozoficznego dramatu o pamięci i tęsknocie."
    },
    {
      tytul: "Lalka",
      autor: "Bolesław Prus",
      kategoria: "Powieść",
      ocena: 5,
      okladka_url: "/img/okladki/lalka.svg",
      opis:
        "Powieść o społeczeństwie, ambicji, uczuciach i Warszawie drugiej połowy XIX wieku. Historia Stanisława Wokulskiego to portret epoki i niespełnionej miłości na tle przemian społecznych."
    },
    {
      tytul: "Cesarz",
      autor: "Ryszard Kapuściński",
      kategoria: "Reportaż",
      ocena: 4,
      okladka_url: "/img/okladki/cesarz.svg",
      opis:
        "Reportaż literacki pokazujący mechanizmy władzy na przykładzie dworu Hajle Sellasje. Książka, w której Etiopia jest tylko pretekstem do uniwersalnej opowieści o autorytaryzmie."
    },
    {
      tytul: "Krótka historia czasu",
      autor: "Stephen Hawking",
      kategoria: "Nauka",
      ocena: 4,
      okladka_url: "/img/okladki/krotka-historia-czasu.svg",
      opis:
        "Popularnonaukowe wprowadzenie do pytań o kosmos, czas, czarne dziury i początek wszechświata. Klasyka, która tłumaczy współczesną fizykę bez wzorów, ale bez upraszczania."
    },
    {
      tytul: "Pan Tadeusz",
      autor: "Adam Mickiewicz",
      kategoria: "Powieść",
      ocena: 4.5,
      okladka_url: "/img/okladki/pan-tadeusz.svg",
      opis:
        "Epopeja narodowa o szlachcie polskiej, sporze o zamek i ostatnim zajeździe na Litwie. Język, obrazowanie i humor sprawiają, że ta lektura wciąż żyje poza szkolnym kanonem."
    },
    {
      tytul: "Chłopi",
      autor: "Władysław Reymont",
      kategoria: "Powieść",
      ocena: 4,
      okladka_url: "/img/okladki/chlopi.svg",
      opis:
        "Czterotomowa powieść o życiu wsi Lipce w rytmie pór roku. Reymont dał polskiej literaturze epopeję chłopską, za którą otrzymał literackiego Nobla."
    },
    {
      tytul: "Sto lat samotności",
      autor: "Gabriel García Márquez",
      kategoria: "Powieść",
      ocena: 5,
      okladka_url: "/img/okladki/sto-lat-samotnosci.svg",
      opis:
        "Saga rodziny Buendía z fikcyjnego miasteczka Macondo. Najbardziej znana powieść realizmu magicznego, w której historia, mit i pamięć łączą się w jeden organizm."
    },
    {
      tytul: "Mistrz i Małgorzata",
      autor: "Michaił Bułhakow",
      kategoria: "Powieść",
      ocena: 5,
      okladka_url: "/img/okladki/mistrz-i-malgorzata.svg",
      opis:
        "Diabeł odwiedza stalinowską Moskwę, a w tle toczy się opowieść o Mistrzu, jego ukochanej i Poncjuszu Piłacie. Powieść o odwadze, miłości i władzy."
    },
    {
      tytul: "Cyberiada",
      autor: "Stanisław Lem",
      kategoria: "Fantastyka",
      ocena: 4.5,
      okladka_url: "/img/okladki/cyberiada.svg",
      opis:
        "Cykl groteskowych opowiadań o konstruktorach Trurlu i Klapaucjuszu, którzy poruszają się po wszechświecie pełnym maszyn, królów i absurdu. Lem jako satyryk i filozof."
    },
    {
      tytul: "Ostatnie życzenie",
      autor: "Andrzej Sapkowski",
      kategoria: "Fantastyka",
      ocena: 4.5,
      okladka_url: "/img/okladki/ostatnie-zyczenie.svg",
      opis:
        "Zbiór opowiadań otwierający sagę o wiedźminie Geralcie z Rivii. Dżinn, strzyga, mała syrenka i pojedynek na słowa zamiast mieczy - tu zaczyna się polska fantastyka."
    },
    {
      tytul: "Diuna",
      autor: "Frank Herbert",
      kategoria: "Fantastyka",
      ocena: 5,
      okladka_url: "/img/okladki/diuna.svg",
      opis:
        "Polityka, religia i ekologia na pustynnej planecie Arrakis. Saga rodu Atrydów wyznaczyła standard współczesnej science fiction i wciąż jest wzorem worldbuildingu."
    },
    {
      tytul: "Władca Pierścieni: Drużyna Pierścienia",
      autor: "J.R.R. Tolkien",
      kategoria: "Fantastyka",
      ocena: 5,
      okladka_url: "/img/okladki/wladca-pierscieni.svg",
      opis:
        "Pierwsza część epickiej trylogii o wędrówce ku Mordorowi. Drużyna z Rivendell rusza w drogę, by zniszczyć Pierścień, który zagraża całemu Śródziemiu."
    },
    {
      tytul: "Heban",
      autor: "Ryszard Kapuściński",
      kategoria: "Reportaż",
      ocena: 5,
      okladka_url: "/img/okladki/heban.svg",
      opis:
        "Zbiór reportaży z Afryki pisanych przez lata jako korespondent. Kapuściński nie pisze o Afryce jako bloku, tylko o setkach lokalnych spraw, ludzi i dróg."
    },
    {
      tytul: "Gottland",
      autor: "Mariusz Szczygieł",
      kategoria: "Reportaż",
      ocena: 4.5,
      okladka_url: "/img/okladki/gottland.svg",
      opis:
        "Reportaże o czeskiej duszy XX wieku - pomniku Stalina, Bacie, Lidze i ucieczkach. Książka, która zmieniła sposób, w jaki Polacy patrzą na sąsiada zza Tatr."
    },
    {
      tytul: "Sapiens. Od zwierząt do bogów",
      autor: "Yuval Noah Harari",
      kategoria: "Nauka",
      ocena: 4,
      okladka_url: "/img/okladki/sapiens.svg",
      opis:
        "Historia gatunku Homo sapiens od sawanny po XXI wiek. Książka popularnonaukowa, która wywołała ogromną debatę o tym, co naprawdę zrobiło z nas to, kim jesteśmy."
    },
    {
      tytul: "Egoistyczny gen",
      autor: "Richard Dawkins",
      kategoria: "Nauka",
      ocena: 4.5,
      okladka_url: "/img/okladki/egoistyczny-gen.svg",
      opis:
        "Klasyka biologii ewolucyjnej, w której bohaterem doboru naturalnego okazuje się nie osobnik ani gatunek, lecz gen. Książka, która przedefiniowała sposób mówienia o ewolucji."
    },
    {
      tytul: "Uwikłanie",
      autor: "Zygmunt Miłoszewski",
      kategoria: "Kryminał",
      ocena: 4,
      okladka_url: "/img/okladki/uwiklanie.svg",
      opis:
        "Prokurator Teodor Szacki bada sprawę z elementami terapii ustawień rodzinnych. Polski kryminał, który wciąga i pokazuje Warszawę z innej strony."
    },
    {
      tytul: "Imię róży",
      autor: "Umberto Eco",
      kategoria: "Kryminał",
      ocena: 5,
      okladka_url: "/img/okladki/imie-rozy.svg",
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
