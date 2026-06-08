const path = require("path");
const express = require("express");
const { sciezkaBazy, wlaczBaze } = require("./baza");
const { inicjalizujSchemat } = require("./schemat");
const trasyKategorii = require("./trasy/kategorie");
const trasyKsiazek = require("./trasy/ksiazki");

const app = express();
const PORT = process.env.PORT || 3000;

const katalogPubliczny = path.join(__dirname, "..", "public");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(katalogPubliczny));

function wyslijStrone(nazwaPliku) {
  return (req, res) => {
    res.sendFile(path.join(katalogPubliczny, nazwaPliku));
  };
}

app.get("/", wyslijStrone("index.html"));
app.get("/ksiazki", wyslijStrone("ksiazki.html"));
app.get("/ksiazka", wyslijStrone("ksiazka.html"));
app.get("/o-projekcie", wyslijStrone("o-projekcie.html"));

app.get("/api/status", (req, res) => {
  res.json({
    nazwa: "ISACzytac",
    baza: sciezkaBazy,
    status: "dziala"
  });
});

app.use("/api/kategorie", trasyKategorii);
app.use("/api/ksiazki", trasyKsiazek);

app.use((req, res) => {
  res.status(404).sendFile(path.join(katalogPubliczny, "404.html"));
});

async function start() {
  await wlaczBaze();
  await inicjalizujSchemat();

  app.listen(PORT, () => {
    console.log(`ISACzytac dziala pod adresem http://localhost:${PORT}`);
  });
}

start().catch((blad) => {
  console.error("Nie udalo sie uruchomic aplikacji:", blad);
  process.exit(1);
});
