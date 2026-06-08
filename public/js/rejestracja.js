const formularzRejestracji = document.querySelector("#formularz-rejestracji");
const komunikatRejestracji = document.querySelector("#komunikat-rejestracji");

function pokazKomunikatRejestracji(tresc, typ = "info") {
  komunikatRejestracji.textContent = tresc;
  komunikatRejestracji.className = `komunikat komunikat-${typ}`;
}

formularzRejestracji.addEventListener("submit", async (event) => {
  event.preventDefault();
  pokazKomunikatRejestracji("Tworzenie konta...");

  const daneFormularza = new FormData(formularzRejestracji);
  const dane = Object.fromEntries(daneFormularza.entries());

  try {
    const odpowiedz = await fetch("/api/auth/rejestracja", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dane)
    });

    const wynik = await odpowiedz.json();

    if (!odpowiedz.ok) {
      throw new Error(wynik.komunikat || "Nie udało się utworzyć konta.");
    }

    formularzRejestracji.reset();
    pokazKomunikatRejestracji(wynik.komunikat, "sukces");
  } catch (blad) {
    pokazKomunikatRejestracji(blad.message, "blad");
  }
});
