const listaKsiazek = document.querySelector("#lista-ksiazek");

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
    const odpowiedz = await fetch("/api/ksiazki");
    const dane = await odpowiedz.json();

    if (!odpowiedz.ok) {
      throw new Error(dane.komunikat || "Nieznany błąd.");
    }

    if (!dane.ksiazki.length) {
      pokazKomunikat("Nie dodano jeszcze żadnych książek.");
      return;
    }

    listaKsiazek.innerHTML = dane.ksiazki.map(zbudujKarteKsiazki).join("");
  } catch (blad) {
    pokazKomunikat(blad.message);
  }
}

pobierzKsiazki();
