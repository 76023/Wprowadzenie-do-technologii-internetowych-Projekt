const szczegolyKsiazki = document.querySelector("#szczegoly-ksiazki");
const parametry = new URLSearchParams(window.location.search);
const idKsiazki = parametry.get("id");
let aktualnyUzytkownik = null;

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
      <p class="tekst-pomocniczy">${ucieknijHtml(tresc)}</p>
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
  aktualnyUzytkownik = uzytkownik;
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
    <article class="karta karta-szczegolow hero-ksiazka">
      <div class="hero-okladka">
        ${htmlOkladki(ksiazka, "okladka okladka-duza")}
      </div>
      <div class="hero-tekst">
        <span class="etykieta-kategorii">${ucieknijHtml(ksiazka.kategoria)}</span>
        <h2>${ucieknijHtml(ksiazka.tytul)}</h2>
        <p class="autor">${ucieknijHtml(ksiazka.autor)}</p>
        <div class="hero-ocena">
          ${gwiazdkiOceny(ksiazka.ocena)}
          <span class="ocena-liczbowa">${Number(ksiazka.ocena).toFixed(1)} / 5</span>
        </div>
        <p class="opis-ksiazki">${ucieknijHtml(ksiazka.opis)}</p>
        <div class="meta-wiersz">
          <span>Dodał: ${ucieknijHtml(ksiazka.nazwa_uzytkownika)}</span>
          <span>${formatujDateSzczegolow(ksiazka.data_dodania)}</span>
        </div>
        ${akcjeAutora}
      </div>
    </article>
    <section class="karta">
      <h2>Opinie czytelników</h2>
      <div id="lista-komentarzy">
        <p class="tekst-pomocniczy">Ładowanie opinii...</p>
      </div>
    </section>
    <section class="karta" id="sekcja-komentarza">
      ${zbudujFormularzKomentarza(uzytkownik)}
    </section>
  `;

  const przyciskUsuwania = document.querySelector("[data-usun-ksiazke]");
  if (przyciskUsuwania) {
    przyciskUsuwania.addEventListener("click", usunKsiazke);
  }

  const formularzKomentarza = document.querySelector("#formularz-komentarza");
  if (formularzKomentarza) {
    ustawWalidacjeFormularza(formularzKomentarza);
    formularzKomentarza.addEventListener("submit", dodajKomentarz);
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

function zbudujFormularzKomentarza(uzytkownik) {
  if (!uzytkownik) {
    return `
      <h2>Dodaj opinię</h2>
      <p class="tekst-pomocniczy">Opinie mogą dodawać tylko zalogowani czytelnicy.</p>
      <a class="przycisk" href="/logowanie">Zaloguj się</a>
    `;
  }

  return `
    <h2>Dodaj opinię</h2>
    <form class="formularz" id="formularz-komentarza">
      <div class="pole-formularza">
        <label for="pole-oceny-komentarza">Ocena</label>
        <select name="ocena" id="pole-oceny-komentarza" required>
          <option value="5">5 - bardzo dobra</option>
          <option value="4">4 - dobra</option>
          <option value="3">3 - średnia</option>
          <option value="2">2 - słaba</option>
          <option value="1">1 - bardzo słaba</option>
        </select>
      </div>

      <div class="pole-formularza">
        <label for="pole-tresci-komentarza">Treść opinii</label>
        <textarea name="tresc" id="pole-tresci-komentarza" minlength="3" maxlength="1000" required></textarea>
      </div>

      <button class="przycisk" type="submit">Opublikuj opinię</button>
    </form>
    <div class="komunikat" id="komunikat-komentarza" aria-live="polite"></div>
  `;
}

function zbudujKomentarz(komentarz) {
  const czyAutor = aktualnyUzytkownik && aktualnyUzytkownik.id === komentarz.id_uzytkownika;
  const przyciskUsuwania = czyAutor
    ? `<button class="przycisk-niebezpieczny" type="button" data-usun-komentarz="${komentarz.id}">Usuń</button>`
    : "";

  return `
    <article class="komentarz">
      <div class="komentarz-naglowek">
        <strong>${ucieknijHtml(komentarz.nazwa_uzytkownika)}</strong>
        ${gwiazdkiOceny(komentarz.ocena)}
      </div>
      <p class="komentarz-data">${formatujDateSzczegolow(komentarz.data_dodania)}</p>
      <p>${ucieknijHtml(komentarz.tresc)}</p>
      ${przyciskUsuwania}
    </article>
  `;
}

async function pobierzKomentarze() {
  const listaKomentarzy = document.querySelector("#lista-komentarzy");

  try {
    const odpowiedz = await fetch(`/api/ksiazki/${idKsiazki}/komentarze`);
    const dane = await odpowiedz.json();

    if (!odpowiedz.ok) {
      throw new Error(dane.komunikat || "Nie udało się pobrać komentarzy.");
    }

    if (!dane.komentarze.length) {
      listaKomentarzy.innerHTML = '<p class="tekst-pomocniczy">Nie ma jeszcze opinii czytelników.</p>';
      return;
    }

    listaKomentarzy.innerHTML = dane.komentarze.map(zbudujKomentarz).join("");
    listaKomentarzy.querySelectorAll("[data-usun-komentarz]").forEach((przycisk) => {
      przycisk.addEventListener("click", () => usunKomentarz(przycisk.dataset.usunKomentarz));
    });
  } catch (blad) {
    listaKomentarzy.innerHTML = `<p class="tekst-pomocniczy">${ucieknijHtml(blad.message)}</p>`;
  }
}

async function dodajKomentarz(event) {
  event.preventDefault();
  const formularz = event.currentTarget;
  if (!sprawdzFormularz(formularz)) {
    return;
  }

  const komunikat = document.querySelector("#komunikat-komentarza");
  komunikat.textContent = "Dodawanie komentarza...";

  const dane = Object.fromEntries(new FormData(formularz).entries());

  try {
    const odpowiedz = await fetch(`/api/ksiazki/${idKsiazki}/komentarze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dane)
    });
    const wynik = await odpowiedz.json();

    if (!odpowiedz.ok) {
      throw new Error(wynik.komunikat || "Nie udało się dodać komentarza.");
    }

    formularz.reset();
    komunikat.textContent = wynik.komunikat;
    komunikat.className = "komunikat komunikat-sukces";
    pobierzKomentarze();
  } catch (blad) {
    komunikat.textContent = blad.message;
    komunikat.className = "komunikat komunikat-blad";
  }
}

async function usunKomentarz(idKomentarza) {
  const potwierdzenie = window.confirm("Czy na pewno chcesz usunąć ten komentarz?");
  if (!potwierdzenie) {
    return;
  }

  try {
    const odpowiedz = await fetch(`/api/komentarze/${idKomentarza}`, {
      method: "DELETE"
    });
    const dane = await odpowiedz.json();

    if (!odpowiedz.ok) {
      throw new Error(dane.komunikat || "Nie udało się usunąć komentarza.");
    }

    await pobierzKomentarze();
    const komunikat = document.querySelector("#komunikat-komentarza");
    if (komunikat) {
      komunikat.textContent = "Komentarz został usunięty.";
      komunikat.className = "komunikat komunikat-sukces";
    }
  } catch (blad) {
    window.alert(blad.message);
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
    pobierzKomentarze();
  } catch (blad) {
    pokazBladSzczegolow(blad.message);
  }
}

pobierzSzczegolyKsiazki();
