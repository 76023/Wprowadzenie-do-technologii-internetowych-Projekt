const szczegolyKsiazki = document.querySelector("#szczegoly-ksiazki");
const parametry = new URLSearchParams(window.location.search);
const idKsiazki = parametry.get("id");

function formatujDateSzczegolow(data) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(data));
}

function pokazBladSzczegolow(tresc) {
  szczegolyKsiazki.innerHTML = `
    <section class="karta">
      <p class="tekst-pomocniczy">${tresc}</p>
      <a class="przycisk" href="/ksiazki">Wróć do listy</a>
    </section>
  `;
}

function pokazKsiazke(ksiazka) {
  szczegolyKsiazki.innerHTML = `
    <article class="karta karta-szczegolow">
      <div class="meta-wiersz">
        <span>${ksiazka.kategoria}</span>
        <span>Dodano ${formatujDateSzczegolow(ksiazka.data_dodania)}</span>
      </div>
      <h2>${ksiazka.tytul}</h2>
      <p class="autor">Autor: ${ksiazka.autor}</p>
      <p>${ksiazka.opis}</p>
      <div class="meta-wiersz">
        <span>Ocena książki: ${Number(ksiazka.ocena).toFixed(1)}/5</span>
        <span>Dodał: ${ksiazka.nazwa_uzytkownika}</span>
      </div>
    </article>
  `;
}

async function pobierzSzczegolyKsiazki() {
  if (!idKsiazki) {
    pokazBladSzczegolow("Nie podano identyfikatora książki.");
    return;
  }

  try {
    const odpowiedz = await fetch(`/api/ksiazki/${idKsiazki}`);
    const dane = await odpowiedz.json();

    if (!odpowiedz.ok) {
      throw new Error(dane.komunikat || "Nie udało się pobrać książki.");
    }

    pokazKsiazke(dane.ksiazka);
  } catch (blad) {
    pokazBladSzczegolow(blad.message);
  }
}

pobierzSzczegolyKsiazki();
