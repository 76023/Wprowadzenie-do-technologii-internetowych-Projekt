const formularzKsiazki = document.querySelector("#formularz-ksiazki");
const poleKategorii = document.querySelector("#pole-kategorii");
const komunikatKsiazki = document.querySelector("#komunikat-ksiazki");

function pokazKomunikatKsiazki(tresc, typ = "info") {
  komunikatKsiazki.textContent = tresc;
  komunikatKsiazki.className = `komunikat komunikat-${typ}`;
}

function pokazBrakDostepuDodawania() {
  formularzKsiazki.remove();
  komunikatKsiazki.className = "stan-akcji";
  komunikatKsiazki.innerHTML = `
    <p>Musisz się zalogować, aby wykonać tę akcję.</p>
    <a class="przycisk" href="/logowanie">Logowanie</a>
  `;
}

async function zaladujKategorie() {
  try {
    const odpowiedz = await fetch("/api/kategorie");
    const dane = await odpowiedz.json();

    if (!odpowiedz.ok) {
      throw new Error(dane.komunikat || "Nie udało się pobrać kategorii.");
    }

    poleKategorii.innerHTML = '<option value="">Wybierz kategorię</option>';
    dane.kategorie.forEach((kategoria) => {
      const opcja = document.createElement("option");
      opcja.value = kategoria.id;
      opcja.textContent = kategoria.nazwa;
      poleKategorii.appendChild(opcja);
    });
  } catch (blad) {
    poleKategorii.innerHTML = '<option value="">Brak kategorii</option>';
    pokazKomunikatKsiazki(blad.message, "blad");
  }
}

async function sprawdzDostepDodawania() {
  try {
    const odpowiedz = await fetch("/api/auth/sesja");
    const dane = await odpowiedz.json();

    if (!dane.uzytkownik) {
      pokazBrakDostepuDodawania();
      return false;
    }

    return true;
  } catch (blad) {
    return true;
  }
}

formularzKsiazki.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!sprawdzFormularz(formularzKsiazki)) {
    return;
  }

  pokazKomunikatKsiazki("Zapisywanie książki...");

  const daneFormularza = new FormData(formularzKsiazki);
  const dane = Object.fromEntries(daneFormularza.entries());

  try {
    const odpowiedz = await fetch("/api/ksiazki", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dane)
    });

    const wynik = await odpowiedz.json();

    if (!odpowiedz.ok) {
      throw new Error(wynik.komunikat || "Nie udało się dodać książki.");
    }

    window.location.href = `/ksiazka?id=${wynik.ksiazka.id}`;
  } catch (blad) {
    pokazKomunikatKsiazki(blad.message, "blad");
  }
});

sprawdzDostepDodawania().then((maDostep) => {
  if (maDostep) {
    zaladujKategorie();
  }
});
