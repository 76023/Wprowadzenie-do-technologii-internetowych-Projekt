const formularzLogowania = document.querySelector("#formularz-logowania");
const komunikatLogowania = document.querySelector("#komunikat-logowania");

function pokazKomunikatLogowania(tresc, typ = "info") {
  komunikatLogowania.textContent = tresc;
  komunikatLogowania.className = `komunikat komunikat-${typ}`;
}

formularzLogowania.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!sprawdzFormularz(formularzLogowania)) {
    return;
  }

  pokazKomunikatLogowania("Sprawdzanie danych...");

  const daneFormularza = new FormData(formularzLogowania);
  const dane = Object.fromEntries(daneFormularza.entries());

  try {
    const odpowiedz = await fetch("/api/auth/logowanie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dane)
    });

    const wynik = await odpowiedz.json();

    if (!odpowiedz.ok) {
      throw new Error(wynik.komunikat || "Nie udało się zalogować.");
    }

    pokazKomunikatLogowania(wynik.komunikat, "sukces");
    window.location.href = "/ksiazki";
  } catch (blad) {
    pokazKomunikatLogowania(blad.message, "blad");
  }
});
