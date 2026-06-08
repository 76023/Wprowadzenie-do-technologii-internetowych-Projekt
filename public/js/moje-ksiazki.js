const mojeKsiazki = document.querySelector("#moje-ksiazki");

function pokazKomunikatMoichKsiazek(tresc, opcje = {}) {
  const akcje = [];
  if (opcje.pokazLogowanie) {
    akcje.push('<a class="przycisk" href="/logowanie">Zaloguj się</a>');
  }
  if (opcje.pokazDodawanie) {
    akcje.push('<a class="przycisk" href="/dodaj-ksiazke">Dodaj pierwszą książkę</a>');
    akcje.push('<a class="przycisk-drugorzedny" href="/ksiazki">Przejdź do katalogu</a>');
  }
  mojeKsiazki.innerHTML = `
    <section class="karta">
      <p class="tekst-pomocniczy">${ucieknijHtml(tresc)}</p>
      ${akcje.length ? `<div class="akcje-karty">${akcje.join("")}</div>` : ""}
    </section>
  `;
}

function zbudujMojaKsiazke(ksiazka) {
  return `
    <article class="karta karta-moja">
      <a class="karta-moja-okladka" href="/ksiazka?id=${ksiazka.id}" aria-label="Otwórz ${ucieknijHtml(ksiazka.tytul)}">
        ${htmlOkladki(ksiazka)}
      </a>
      <div class="karta-moja-tekst">
        <span class="etykieta-kategorii">${ucieknijHtml(ksiazka.kategoria)}</span>
        <h2><a href="/ksiazka?id=${ksiazka.id}">${ucieknijHtml(ksiazka.tytul)}</a></h2>
        <p class="autor">${ucieknijHtml(ksiazka.autor)}</p>
        ${gwiazdkiOceny(ksiazka.ocena)}
        <p class="opis-skrocony">${ucieknijHtml(ksiazka.opis)}</p>
        <div class="akcje-karty">
          <a class="przycisk-drugorzedny" href="/edytuj-ksiazke?id=${ksiazka.id}">Edytuj</a>
          <a class="przycisk-drugorzedny" href="/ksiazka?id=${ksiazka.id}">Szczegóły</a>
        </div>
      </div>
    </article>
  `;
}

async function pobierzMojeKsiazki() {
  try {
    const odpowiedz = await fetch("/api/ksiazki/moje");
    const dane = await odpowiedz.json();

    if (odpowiedz.status === 401) {
      pokazKomunikatMoichKsiazek(dane.komunikat, { pokazLogowanie: true });
      return;
    }

    if (!odpowiedz.ok) {
      throw new Error(dane.komunikat || "Nie udało się pobrać książek.");
    }

    if (!dane.ksiazki.length) {
      pokazKomunikatMoichKsiazek("Twoja biblioteczka jest jeszcze pusta. Dodaj pierwszą książkę albo zajrzyj do katalogu, żeby zacząć.", { pokazDodawanie: true });
      return;
    }

    mojeKsiazki.innerHTML = dane.ksiazki.map(zbudujMojaKsiazke).join("");
  } catch (blad) {
    pokazKomunikatMoichKsiazek(blad.message);
  }
}

pobierzMojeKsiazki();
