const ostatnieKsiazki = document.querySelector("#ostatnie-ksiazki");

function pokazStartowyKomunikat(tresc) {
  ostatnieKsiazki.innerHTML = `<p class="tekst-pomocniczy">${ucieknijHtml(tresc)}</p>`;
}

async function pokazOstatnieKsiazki() {
  pokazStartowyKomunikat("Ładowanie książek...");

  try {
    const odpowiedz = await fetch("/api/ksiazki");
    const dane = await odpowiedz.json();

    if (!odpowiedz.ok) {
      throw new Error(dane.komunikat || "Nie udało się pobrać danych.");
    }

    const ksiazki = dane.ksiazki.slice(0, 3);
    if (!ksiazki.length) {
      pokazStartowyKomunikat("Nie dodano jeszcze żadnych książek.");
      return;
    }

    ostatnieKsiazki.innerHTML = ksiazki
      .map(
        (ksiazka) => `
          <a class="wiersz-link" href="/ksiazka?id=${ksiazka.id}">
            <strong>${ucieknijHtml(ksiazka.tytul)}</strong>
            <span>${ucieknijHtml(ksiazka.autor)}</span>
          </a>
        `
      )
      .join("");
  } catch (blad) {
    pokazStartowyKomunikat(blad.message);
  }
}

pokazOstatnieKsiazki();
