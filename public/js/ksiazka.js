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

async function pobierzSesjeDlaSzczegolow() {
  try {
    const odpowiedz = await fetch("/api/auth/sesja");
    const dane = await odpowiedz.json();
    return dane.uzytkownik;
  } catch (blad) {
    return null;
  }
}

function pokazKsiazke(ksiazka, uzytkownik) {
  const czyAutor = uzytkownik && uzytkownik.id === ksiazka.id_uzytkownika;
  const akcjeAutora = czyAutor
    ? `
      <div class="akcje-karty">
        <a class="przycisk-drugorzedny" href="/edytuj-ksiazke?id=${ksiazka.id}">Edytuj</a>
        <button class="przycisk-niebezpieczny" type="button" data-usun-ksiazke>Usuń</button>
      </div>
    `
    : "";

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
      ${akcjeAutora}
    </article>
  `;

  const przyciskUsuwania = document.querySelector("[data-usun-ksiazke]");
  if (przyciskUsuwania) {
    przyciskUsuwania.addEventListener("click", usunKsiazke);
  }
}

async function usunKsiazke() {
  const potwierdzenie = window.confirm("Czy na pewno chcesz usunąć tę książkę?");
  if (!potwierdzenie) {
    return;
  }

  try {
    const odpowiedz = await fetch(`/api/ksiazki/${idKsiazki}`, {
      method: "DELETE"
    });
    const dane = await odpowiedz.json();

    if (!odpowiedz.ok) {
      throw new Error(dane.komunikat || "Nie udało się usunąć książki.");
    }

    window.location.href = "/ksiazki";
  } catch (blad) {
    pokazBladSzczegolow(blad.message);
  }
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

    const uzytkownik = await pobierzSesjeDlaSzczegolow();
    pokazKsiazke(dane.ksiazka, uzytkownik);
  } catch (blad) {
    pokazBladSzczegolow(blad.message);
  }
}

pobierzSzczegolyKsiazki();
