const path = require("path");
const session = require("express-session");
const sqliteStore = require("connect-sqlite3");

const SQLiteStore = sqliteStore(session);

function konfigurujSesje(app) {
  app.set("trust proxy", 1);

  app.use(
    session({
      store: new SQLiteStore({
        db: "sesje.sqlite",
        dir: path.join(__dirname, "..", "baza")
      }),
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
