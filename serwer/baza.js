const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const katalogBazy = path.join(__dirname, "..", "baza");
const sciezkaBazy = process.env.DB_PATH || path.join(katalogBazy, "isaczytac.sqlite");

if (!fs.existsSync(katalogBazy)) {
  fs.mkdirSync(katalogBazy, { recursive: true });
}

const baza = new sqlite3.Database(sciezkaBazy);

function uruchom(sql, parametry = []) {
  return new Promise((resolve, reject) => {
    baza.run(sql, parametry, function poUruchomieniu(blad) {
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

function pobierz(sql, parametry = []) {
  return new Promise((resolve, reject) => {
    baza.get(sql, parametry, (blad, wiersz) => {
      if (blad) {
        reject(blad);
        return;
      }

      resolve(wiersz);
    });
  });
}

function wszystkie(sql, parametry = []) {
  return new Promise((resolve, reject) => {
    baza.all(sql, parametry, (blad, wiersze) => {
      if (blad) {
        reject(blad);
        return;
      }

      resolve(wiersze);
    });
  });
}

async function wlaczBaze() {
  await uruchom("PRAGMA foreign_keys = ON");
}

module.exports = {
  baza,
  pobierz,
  sciezkaBazy,
  uruchom,
  wlaczBaze,
  wszystkie
};
