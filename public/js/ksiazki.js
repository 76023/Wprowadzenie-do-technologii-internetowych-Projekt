const listaKsiazek = document.querySelector("#lista-ksiazek");
const formularzFiltrow = document.querySelector("#formularz-filtrow");
const poleSzukaj = document.querySelector("#pole-szukaj");
const filtrKategorii = document.querySelector("#filtr-kategorii");
const parametryListy = new URLSearchParams(window.location.search);

function formatujDate(data) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(data));
}

function skrocTekst(tekst, limit = 180) {
  if (tekst.length <= limit) {
    return tekst;
  }

  return `${tekst.slice(0, limit).trim()}...`;
}

function pokazKomunikat(tresc) {
  listaKsiazek.innerHTML = `
    <section class="karta">
      <p class="tekst-pomocniczy">${tresc}</p>
    </section>
  `;
}

function zbudujKarteKsiazki(ksiazka) {
  const liczbaKomentarzy = Number(ksiazka.liczba_komentarzy);
  const podpisKomentarzy = liczbaKomentarzy === 1 ? "1 komentarz" : `${liczbaKomentarzy} komentarze`;

  return `
    <article class="karta karta-ksiazki">
      <div class="meta-wiersz">
        <span>${ksiazka.kategoria}</span>
        <span>Dodano ${formatujDate(ksiazka.data_dodania)}</span>
      </div>
      <h2><a href="/ksiazka?id=${ksiazka.id}">${ksiazka.tytul}</a></h2>
      <p class="autor">Autor: ${ksiazka.autor}</p>
      <p>${skrocTekst(ksiazka.opis)}</p>
      <div class="meta-wiersz">
        <span>Ocena: ${Number(ksiazka.ocena).toFixed(1)}/5</span>
        <span>${podpisKomentarzy}</span>
        <span>Dodał: ${ksiazka.nazwa_uzytkownika}</span>
      </div>
    </article>
  `;
}

async function pobierzKsiazki() {
  pokazKomunikat("Ładowanie książek...");

  try {
    const zapytanie = new URLSearchParams();
    const szukaj = parametryListy.get("szukaj") || "";
    const kategoria = parametryListy.get("kategoria") || "";

    if (szukaj) {
      zapytanie.set("szukaj", szukaj);
    }

    if (kategoria) {
      zapytanie.set("kategoria", kategoria);
    }

    const adres = zapytanie.toString() ? `/api/ksiazki?${zapytanie.toString()}` : "/api/ksiazki";
    const odpowiedz = await fetch(adres);
    const dane = await odpowiedz.json();

    if (!odpowiedz.ok) {
      throw new Error(dane.komunikat || "Nieznany błąd.");
    }

    if (!dane.ksiazki.length) {
      pokazKomunikat("Nie znaleziono książek dla wybranych filtrów.");
      return;
    }

    listaKsiazek.innerHTML = dane.ksiazki.map(zbudujKarteKsiazki).join("");
  } catch (blad) {
    pokazKomunikat(blad.message);
  }
}

async function zaladujKategorieFiltrow() {
  poleSzukaj.value = parametryListy.get("szukaj") || "";
  filtrKategorii.value = parametryListy.get("kategoria") || "";

  try {
    const odpowiedz = await fetch("/api/kategorie");
    const dane = await odpowiedz.json();

    if (!odpowiedz.ok) {
      throw new Error(dane.komunikat || "Nie udało się pobrać kategorii.");
    }

    dane.kategorie.forEach((kategoria) => {
      const opcja = document.createElement("option");
      opcja.value = kategoria.id;
      opcja.textContent = kategoria.nazwa;
      filtrKategorii.appendChild(opcja);
    });

    filtrKategorii.value = parametryListy.get("kategoria") || "";
  } catch (blad) {
    filtrKategorii.disabled = true;
  }
}

formularzFiltrow.addEventListener("submit", (event) => {
  event.preventDefault();
  const noweParametry = new URLSearchParams();

  if (poleSzukaj.value.trim()) {
    noweParametry.set("szukaj", poleSzukaj.value.trim());
  }

  if (filtrKategorii.value) {
    noweParametry.set("kategoria", filtrKategorii.value);
  }

  const adres = noweParametry.toString() ? `/ksiazki?${noweParametry.toString()}` : "/ksiazki";
  window.location.href = adres;
});

zaladujKategorieFiltrow();
pobierzKsiazki();
