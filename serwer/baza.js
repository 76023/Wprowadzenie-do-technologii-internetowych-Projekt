const fs = require("fs");
const path = require("path");
const { TRYB } = require("./tryb-bazy");

let bazaSqlite = null;
let pulaPostgres = null;
let sciezkaBazy = null;

function ustawieniaSslDlaPostgres(adres) {
  if (!adres) {
    return false;
  }

  if (/(^|@)(localhost|127\.0\.0\.1)([:/]|$)/.test(adres)) {
    return false;
  }

  if (/[?&]sslmode=disable/i.test(adres)) {
    return false;
  }

  return { rejectUnauthorized: false };
}

function konwertujZnakiZapytania(sql) {
  let licznik = 0;
  return sql.replace(/\?/g, () => {
    licznik += 1;
    return `$${licznik}`;
  });
}

if (TRYB === "sqlite") {
  const sqlite3 = require("sqlite3").verbose();
  const katalogBazy = path.join(__dirname, "..", "baza");
  sciezkaBazy = process.env.DB_PATH || path.join(katalogBazy, "isaczytac.sqlite");
  const katalogDocelowyBazy = path.dirname(sciezkaBazy);

  if (!fs.existsSync(katalogDocelowyBazy)) {
    fs.mkdirSync(katalogDocelowyBazy, { recursive: true });
  }

  bazaSqlite = new sqlite3.Database(sciezkaBazy);
} else {
  const { Pool } = require("pg");
  pulaPostgres = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: ustawieniaSslDlaPostgres(process.env.DATABASE_URL),
    max: 5,
    idleTimeoutMillis: 30000
  });

  pulaPostgres.on("error", (blad) => {
    console.error("Blad puli PostgreSQL:", blad.message);
  });
}

function uruchom(sql, parametry = []) {
  if (TRYB === "sqlite") {
    return new Promise((resolve, reject) => {
      bazaSqlite.run(sql, parametry, function poUruchomieniu(blad) {
        if (blad) {
          reject(blad);
          return;
        }

        resolve({
          id: this.lastID,
          zmiany: this.changes
        });
      });
    });
  }

  return uruchomPostgres(sql, parametry);
}

async function uruchomPostgres(sql, parametry) {
  const sqlZParametrami = konwertujZnakiZapytania(sql);
  const czyInsert = /^\s*INSERT\b/i.test(sqlZParametrami);
  const maReturning = /\bRETURNING\b/i.test(sqlZParametrami);
  const finalnySql = czyInsert && !maReturning ? `${sqlZParametrami} RETURNING id` : sqlZParametrami;

  const wynik = await pulaPostgres.query(finalnySql, parametry);
  const wstawionyId = wynik.rows && wynik.rows[0] && wynik.rows[0].id !== undefined
    ? wynik.rows[0].id
    : null;

  return {
    id: wstawionyId,
    zmiany: wynik.rowCount === null ? 0 : wynik.rowCount
  };
}

function pobierz(sql, parametry = []) {
  if (TRYB === "sqlite") {
    return new Promise((resolve, reject) => {
      bazaSqlite.get(sql, parametry, (blad, wiersz) => {
        if (blad) {
          reject(blad);
          return;
        }

        resolve(wiersz);
      });
    });
  }

  return pobierzPostgres(sql, parametry);
}

async function pobierzPostgres(sql, parametry) {
  const sqlZParametrami = konwertujZnakiZapytania(sql);
  const wynik = await pulaPostgres.query(sqlZParametrami, parametry);
  return wynik.rows[0];
}

function wszystkie(sql, parametry = []) {
  if (TRYB === "sqlite") {
    return new Promise((resolve, reject) => {
      bazaSqlite.all(sql, parametry, (blad, wiersze) => {
        if (blad) {
          reject(blad);
          return;
        }

        resolve(wiersze);
      });
    });
  }

  return wszystkiePostgres(sql, parametry);
}

async function wszystkiePostgres(sql, parametry) {
  const sqlZParametrami = konwertujZnakiZapytania(sql);
  const wynik = await pulaPostgres.query(sqlZParametrami, parametry);
  return wynik.rows;
}

async function zamknijBaze() {
  if (TRYB === "sqlite") {
    return new Promise((resolve, reject) => {
      bazaSqlite.close((blad) => {
        if (blad) {
          reject(blad);
          return;
        }
        resolve();
      });
    });
  }

  await pulaPostgres.end();
}

async function wlaczBaze() {
  if (TRYB === "sqlite") {
    await uruchom("PRAGMA foreign_keys = ON");
    return;
  }

  await pobierz("SELECT 1 AS gotowe");
}

function pobierzPuleSesji() {
  return pulaPostgres;
}

module.exports = {
  pobierz,
  pobierzPuleSesji,
  sciezkaBazy,
  uruchom,
  wlaczBaze,
  wszystkie,
  zamknijBaze
};
