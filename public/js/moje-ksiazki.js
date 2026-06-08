const mojeKsiazki = document.querySelector("#moje-ksiazki");

function pokazKomunikatMoichKsiazek(tresc, pokazLogowanie = false) {
  mojeKsiazki.innerHTML = `
    <section class="karta">
      <p class="tekst-pomocniczy">${ucieknijHtml(tresc)}</p>
      ${pokazLogowanie ? '<a class="przycisk" href="/logowanie">Zaloguj się</a>' : ""}
    </section>
  `;
}

function zbudujMojaKsiazke(ksiazka) {
  return `
    <article class="karta karta-ksiazki">
      <div class="meta-wiersz">
        <span>${ucieknijHtml(ksiazka.kategoria)}</span>
        <span>Ocena: ${Number(ksiazka.ocena).toFixed(1)}/5</span>
      </div>
      <h2><a href="/ksiazka?id=${ksiazka.id}">${ucieknijHtml(ksiazka.tytul)}</a></h2>
      <p class="autor">Autor: ${ucieknijHtml(ksiazka.autor)}</p>
      <p>${ucieknijHtml(ksiazka.opis)}</p>
      <div class="akcje-karty">
        <a class="przycisk-drugorzedny" href="/edytuj-ksiazke?id=${ksiazka.id}">Edytuj</a>
        <a class="przycisk-drugorzedny" href="/ksiazka?id=${ksiazka.id}">Szczegóły</a>
      </div>
    </article>
  `;
}

async function pobierzMojeKsiazki() {
  try {
    const odpowiedz = await fetch("/api/ksiazki/moje");
    const dane = await odpowiedz.json();

    if (odpowiedz.status === 401) {
      pokazKomunikatMoichKsiazek(dane.komunikat, true);
      return;
    }

    if (!odpowiedz.ok) {
      throw new Error(dane.komunikat || "Nie udało się pobrać książek.");
    }

    if (!dane.ksiazki.length) {
      pokazKomunikatMoichKsiazek("Nie dodałeś jeszcze żadnych książek.");
      return;
    }

    mojeKsiazki.innerHTML = dane.ksiazki.map(zbudujMojaKsiazke).join("");
  } catch (blad) {
    pokazKomunikatMoichKsiazek(blad.message);
  }
}

pobierzMojeKsiazki();
