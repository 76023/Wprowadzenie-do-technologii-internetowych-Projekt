function ustawAktywnaNawigacje() {
  const sciezka = window.location.pathname;
  document.querySelectorAll("[data-sciezka]").forEach((link) => {
    link.classList.remove("aktywna");
    if (link.dataset.sciezka === sciezka) {
      link.classList.add("aktywna");
    }
  });

  document.querySelectorAll(".nawigacja-dolna a").forEach((link) => {
    const adres = new URL(link.href);
    link.classList.remove("aktywna");
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

function ustawNawigacjeSesji(uzytkownik) {
  document.querySelectorAll("[data-tylko-gosc]").forEach((element) => {
    element.hidden = Boolean(uzytkownik);
  });

  document.querySelectorAll("[data-konto-mobilne]").forEach((link) => {
    if (uzytkownik) {
      link.href = "/moje-ksiazki";
      link.textContent = "Moje";
    } else {
      link.href = "/logowanie";
      link.textContent = "Konto";
    }
  });

  ustawAktywnaNawigacje();
}

async function ustawPanelUzytkownika() {
  const panele = document.querySelectorAll("[data-panel-uzytkownika]");
  if (!panele.length) {
    return;
  }

  try {
    const odpowiedz = await fetch("/api/auth/sesja");
    const dane = await odpowiedz.json();
    ustawNawigacjeSesji(dane.uzytkownik);

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
    ustawNawigacjeSesji(null);
    panele.forEach((panel) => {
      panel.innerHTML = '<p class="tekst-pomocniczy">Nie udało się pobrać sesji.</p>';
    });
  }
}

function pobierzNazwePola(pole) {
  if (pole.labels && pole.labels.length) {
    return pole.labels[0].textContent.trim();
  }

  const etykieta = pole.closest(".pole-formularza")?.querySelector("label, span");
  return etykieta ? etykieta.textContent.trim() : "to pole";
}

function ustawBladPola(pole, komunikat) {
  const kontener = pole.closest(".pole-formularza");
  if (!kontener) {
    return;
  }

  let blad = kontener.querySelector(".blad-pola");
  if (!blad) {
    blad = document.createElement("p");
    blad.className = "blad-pola";
    blad.id = `blad-${pole.name || Math.random().toString(36).slice(2)}`;
    kontener.appendChild(blad);
  }

  blad.textContent = komunikat;
  pole.setAttribute("aria-invalid", komunikat ? "true" : "false");
  pole.setAttribute("aria-describedby", blad.id);
}

function walidujPole(pole) {
  const nazwa = pobierzNazwePola(pole);
  const wartosc = pole.value.trim();

  if (pole.required && !wartosc) {
    return pole.tagName === "SELECT"
      ? `Wybierz wartość pola "${nazwa}".`
      : `Uzupełnij pole "${nazwa}".`;
  }

  if (!wartosc) {
    return "";
  }

  if (pole.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(wartosc)) {
    return "Podaj poprawny adres email.";
  }

  const minLength = Number(pole.getAttribute("minlength"));
  if (pole.hasAttribute("minlength") && Number.isInteger(minLength) && wartosc.length < minLength) {
    return `Pole "${nazwa}" musi mieć co najmniej ${minLength} znaki.`;
  }

  const maxLength = Number(pole.getAttribute("maxlength"));
  if (pole.hasAttribute("maxlength") && Number.isInteger(maxLength) && wartosc.length > maxLength) {
    return `Pole "${nazwa}" może mieć maksymalnie ${maxLength} znaków.`;
  }

  if (pole.type === "number") {
    const liczba = Number(wartosc);
    const min = Number(pole.getAttribute("min"));
    const max = Number(pole.getAttribute("max"));

    if (!Number.isFinite(liczba)) {
      return `Pole "${nazwa}" musi być liczbą.`;
    }

    if (Number.isFinite(min) && liczba < min) {
      return `Pole "${nazwa}" musi mieć wartość co najmniej ${min}.`;
    }

    if (Number.isFinite(max) && liczba > max) {
      return `Pole "${nazwa}" musi mieć wartość najwyżej ${max}.`;
    }
  }

  return "";
}

function sprawdzFormularz(formularz) {
  const pola = Array.from(formularz.querySelectorAll("input, textarea, select"))
    .filter((pole) => !pole.disabled);
  let pierwszeNiepoprawne = null;

  pola.forEach((pole) => {
    const komunikat = walidujPole(pole);
    ustawBladPola(pole, komunikat);

    if (komunikat && !pierwszeNiepoprawne) {
      pierwszeNiepoprawne = pole;
    }
  });

  if (pierwszeNiepoprawne) {
    pierwszeNiepoprawne.focus();
    return false;
  }

  return true;
}

function ustawWalidacjeFormularza(formularz) {
  formularz.noValidate = true;

  formularz.querySelectorAll("input, textarea, select").forEach((pole) => {
    ustawBladPola(pole, "");
    pole.addEventListener("input", () => ustawBladPola(pole, walidujPole(pole)));
    pole.addEventListener("change", () => ustawBladPola(pole, walidujPole(pole)));
  });
}

document.querySelectorAll("form").forEach(ustawWalidacjeFormularza);
document.addEventListener(
  "submit",
  (event) => {
    if (!sprawdzFormularz(event.target)) {
      event.preventDefault();
      event.stopPropagation();
    }
  },
  true
);

ustawAktywnaNawigacje();
ustawPanelUzytkownika();
