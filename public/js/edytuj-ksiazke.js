const formularzEdycji = document.querySelector("#formularz-edycji");
const poleKategoriiEdycji = document.querySelector("#pole-kategorii");
const komunikatEdycji = document.querySelector("#komunikat-edycji");
const parametryEdycji = new URLSearchParams(window.location.search);
const idEdytowanejKsiazki = parametryEdycji.get("id");

function pokazKomunikatEdycji(tresc, typ = "info") {
  komunikatEdycji.textContent = tresc;
  komunikatEdycji.className = `komunikat komunikat-${typ}`;
}

async function pobierzJson(adres) {
  const odpowiedz = await fetch(adres);
  const dane = await odpowiedz.json();

  if (!odpowiedz.ok) {
    throw new Error(dane.komunikat || "Nie udało się pobrać danych.");
  }

  return dane;
}

async function zaladujDaneEdycji() {
  if (!idEdytowanejKsiazki) {
    pokazKomunikatEdycji("Nie podano identyfikatora książki.", "blad");
    formularzEdycji.hidden = true;
    return;
  }

  try {
    const [daneSesji, daneKategorii, daneKsiazki] = await Promise.all([
      pobierzJson("/api/auth/sesja"),
      pobierzJson("/api/kategorie"),
      pobierzJson(`/api/ksiazki/${idEdytowanejKsiazki}`)
    ]);

    if (!daneSesji.uzytkownik) {
      pokazKomunikatEdycji("Musisz być zalogowany, aby edytować książkę.", "blad");
      formularzEdycji.hidden = true;
      return;
    }

    poleKategoriiEdycji.innerHTML = '<option value="">Wybierz kategorię</option>';
    daneKategorii.kategorie.forEach((kategoria) => {
      const opcja = document.createElement("option");
      opcja.value = kategoria.id;
      opcja.textContent = kategoria.nazwa;
      poleKategoriiEdycji.appendChild(opcja);
    });

    const ksiazka = daneKsiazki.ksiazka;
    if (daneSesji.uzytkownik.id !== ksiazka.id_uzytkownika) {
      pokazKomunikatEdycji("Możesz edytować tylko własne książki.", "blad");
      formularzEdycji.hidden = true;
      return;
    }

    formularzEdycji.tytul.value = ksiazka.tytul;
    formularzEdycji.autor.value = ksiazka.autor;
    formularzEdycji.id_kategorii.value = ksiazka.id_kategorii;
    formularzEdycji.ocena.value = ksiazka.ocena;
    formularzEdycji.opis.value = ksiazka.opis;
  } catch (blad) {
    pokazKomunikatEdycji(blad.message, "blad");
    formularzEdycji.hidden = true;
  }
}

formularzEdycji.addEventListener("submit", async (event) => {
  event.preventDefault();
  pokazKomunikatEdycji("Zapisywanie zmian...");

  const daneFormularza = new FormData(formularzEdycji);
  const dane = Object.fromEntries(daneFormularza.entries());

  try {
    const odpowiedz = await fetch(`/api/ksiazki/${idEdytowanejKsiazki}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dane)
    });

    const wynik = await odpowiedz.json();

    if (!odpowiedz.ok) {
      throw new Error(wynik.komunikat || "Nie udało się zapisać zmian.");
    }

    window.location.href = `/ksiazka?id=${idEdytowanejKsiazki}`;
  } catch (blad) {
    pokazKomunikatEdycji(blad.message, "blad");
  }
});

zaladujDaneEdycji();
