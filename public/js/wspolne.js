function ustawAktywnaNawigacje() {
  const sciezka = window.location.pathname;
  document.querySelectorAll("[data-sciezka]").forEach((link) => {
    if (link.dataset.sciezka === sciezka) {
      link.classList.add("aktywna");
    }
  });

  document.querySelectorAll(".nawigacja-dolna a").forEach((link) => {
    const adres = new URL(link.href);
    if (adres.pathname === sciezka) {
      link.classList.add("aktywna");
    }
  });
}

function ucieknijHtml(wartosc) {
  return String(wartosc)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function wylogujUzytkownika() {
  await fetch("/api/auth/wylogowanie", { method: "POST" });
  window.location.href = "/";
}

async function ustawPanelUzytkownika() {
  const panele = document.querySelectorAll("[data-panel-uzytkownika]");
  if (!panele.length) {
    return;
  }

  try {
    const odpowiedz = await fetch("/api/auth/sesja");
    const dane = await odpowiedz.json();

    panele.forEach((panel) => {
      if (dane.uzytkownik) {
        panel.innerHTML = `
          <p class="tekst-pomocniczy">Zalogowano jako</p>
          <strong>${ucieknijHtml(dane.uzytkownik.nazwa)}</strong>
          <button class="przycisk-drugorzedny" type="button" data-wyloguj>Wyloguj</button>
        `;
      } else {
        panel.innerHTML = `
          <p class="tekst-pomocniczy">Nie jesteś zalogowany.</p>
          <a class="przycisk-drugorzedny" href="/logowanie">Logowanie</a>
        `;
      }
    });

    document.querySelectorAll("[data-wyloguj]").forEach((przycisk) => {
      przycisk.addEventListener("click", wylogujUzytkownika);
    });
  } catch (blad) {
    panele.forEach((panel) => {
      panel.innerHTML = '<p class="tekst-pomocniczy">Nie udało się pobrać sesji.</p>';
    });
  }
}

ustawAktywnaNawigacje();
ustawPanelUzytkownika();
