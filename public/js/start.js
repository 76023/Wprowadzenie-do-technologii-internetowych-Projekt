const elementPolecane = document.querySelector("#ksiazki-polecane");
const elementOstatnie = document.querySelector("#ksiazki-ostatnie");
const elementNajlepsze = document.querySelector("#ksiazki-najlepsze");
const elementKategorie = document.querySelector("#lista-kategorii");

function pokazKomunikatSekcji(element, tresc) {
  if (!element) {
    return;
  }
  element.innerHTML = `<p class="tekst-pomocniczy" style="grid-column: 1 / -1;">${ucieknijHtml(tresc)}</p>`;
}

function zbudujKarteOkladki(ksiazka) {
  return `
    <a class="karta-okladka" href="/ksiazka?id=${ksiazka.id}">
      ${htmlOkladki(ksiazka)}
      <div class="karta-okladka-tekst">
        <span class="etykieta-kategorii">${ucieknijHtml(ksiazka.kategoria)}</span>
        <strong>${ucieknijHtml(ksiazka.tytul)}</strong>
        <span class="autor">${ucieknijHtml(ksiazka.autor)}</span>
        ${gwiazdkiOceny(ksiazka.ocena)}
      </div>
    </a>
  `;
}

function policzKategorie(ksiazki) {
  const licznik = new Map();
  ksiazki.forEach((ksiazka) => {
    const nazwa = ksiazka.kategoria;
    licznik.set(nazwa, (licznik.get(nazwa) || 0) + 1);
  });
  return licznik;
}

async function pobierzKsiazkiStartowe() {
  pokazKomunikatSekcji(elementPolecane, "Ładowanie polecanych...");
  pokazKomunikatSekcji(elementOstatnie, "Ładowanie nowości...");
  pokazKomunikatSekcji(elementNajlepsze, "Ładowanie najlepszych...");
  pokazKomunikatSekcji(elementKategorie, "Ładowanie kategorii...");

  try {
    const [odpowiedzKsiazek, odpowiedzKategorii] = await Promise.all([
      fetch("/api/ksiazki"),
      fetch("/api/kategorie")
    ]);

    const dane = await odpowiedzKsiazek.json();
    if (!odpowiedzKsiazek.ok) {
      throw new Error(dane.komunikat || "Nie udało się pobrać danych.");
    }

    const daneKategorii = odpowiedzKategorii.ok ? await odpowiedzKategorii.json() : { kategorie: [] };
    const mapaKategorii = new Map();
    (daneKategorii.kategorie || []).forEach((kat) => mapaKategorii.set(kat.nazwa, kat.id));

    const ksiazki = dane.ksiazki || [];

    if (!ksiazki.length) {
      const komunikat = "Nie dodano jeszcze żadnych książek.";
      pokazKomunikatSekcji(elementPolecane, komunikat);
      pokazKomunikatSekcji(elementOstatnie, komunikat);
      pokazKomunikatSekcji(elementNajlepsze, komunikat);
      pokazKomunikatSekcji(elementKategorie, "Brak kategorii do pokazania.");
      return;
    }

    const polecane = [...ksiazki].sort((a, b) => Number(b.ocena) - Number(a.ocena)).slice(0, 6);
    if (elementPolecane) {
      elementPolecane.innerHTML = polecane.map(zbudujKarteOkladki).join("");
    }

    const ostatnie = ksiazki.slice(0, 6);
    if (elementOstatnie) {
      elementOstatnie.innerHTML = ostatnie.map(zbudujKarteOkladki).join("");
    }

    const najlepsze = [...ksiazki]
      .sort((a, b) => Number(b.ocena) - Number(a.ocena) || Number(b.liczba_komentarzy || 0) - Number(a.liczba_komentarzy || 0))
      .slice(0, 6);
    if (elementNajlepsze) {
      elementNajlepsze.innerHTML = najlepsze.map(zbudujKarteOkladki).join("");
    }

    if (elementKategorie) {
      const licznik = policzKategorie(ksiazki);
      const wpisy = Array.from(licznik.entries()).sort((a, b) => b[1] - a[1]);

      if (!wpisy.length) {
        pokazKomunikatSekcji(elementKategorie, "Brak kategorii do pokazania.");
      } else {
        elementKategorie.innerHTML = wpisy
          .map(([nazwa, liczba]) => {
            const slowo = liczba === 1 ? "pozycja" : liczba < 5 ? "pozycje" : "pozycji";
            const idKategorii = mapaKategorii.get(nazwa);
            const adres = idKategorii ? `/ksiazki?kategoria=${idKategorii}` : "/ksiazki";
            return `
              <a class="kafelek-kategorii" href="${adres}">
                <strong>${ucieknijHtml(nazwa)}</strong>
                <span>${liczba} ${slowo}</span>
              </a>
            `;
          })
          .join("");
      }
    }
  } catch (blad) {
    pokazKomunikatSekcji(elementPolecane, blad.message);
    pokazKomunikatSekcji(elementOstatnie, blad.message);
    pokazKomunikatSekcji(elementNajlepsze, blad.message);
    pokazKomunikatSekcji(elementKategorie, blad.message);
  }
}

pobierzKsiazkiStartowe();
