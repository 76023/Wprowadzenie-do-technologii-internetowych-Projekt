const path = require("path");
const fs = require("fs");
const session = require("express-session");
const { TRYB } = require("./tryb-bazy");
const { pobierzPuleSesji } = require("./baza");

function pobierzKatalogSesji() {
  if (process.env.SESSION_DB_DIR) {
    return process.env.SESSION_DB_DIR;
  }

  if (process.env.DB_PATH) {
    return path.dirname(process.env.DB_PATH);
  }

  return path.join(__dirname, "..", "baza");
}

function utworzMagazynSesji() {
  if (TRYB === "postgresql") {
    const PgSession = require("connect-pg-simple")(session);
    return new PgSession({
      pool: pobierzPuleSesji(),
      tableName: "sesje",
      createTableIfMissing: true
    });
  }

  const SQLiteStore = require("connect-sqlite3")(session);
  const katalogSesji = pobierzKatalogSesji();

  if (!fs.existsSync(katalogSesji)) {
    fs.mkdirSync(katalogSesji, { recursive: true });
  }

  return new SQLiteStore({
    db: "sesje.sqlite",
    dir: katalogSesji
  });
}

function konfigurujSesje(app) {
  app.set("trust proxy", 1);

  app.use(
    session({
      store: utworzMagazynSesji(),
      name: "isaczytac.sid",
      secret: process.env.SESSION_SECRET || "lokalny-sekret-isaczytac",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24 * 7
      }
    })
  );
}

function wymagajLogowania(req, res, next) {
  if (req.session && req.session.uzytkownik) {
    next();
    return;
  }

  res.status(401).json({ komunikat: "Musisz być zalogowany, aby wykonać tę akcję." });
}

function ustawUzytkownikaSesji(req, uzytkownik) {
  req.session.uzytkownik = {
    id: uzytkownik.id,
    nazwa: uzytkownik.nazwa,
    email: uzytkownik.email
  };
}

function wyczyscSesje(req) {
  return new Promise((resolve, reject) => {
    req.session.destroy((blad) => {
      if (blad) {
        reject(blad);
        return;
      }

      resolve();
    });
  });
}

module.exports = {
  konfigurujSesje,
  ustawUzytkownikaSesji,
  wymagajLogowania,
  wyczyscSesje
};
