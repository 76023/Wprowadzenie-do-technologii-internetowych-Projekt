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

ustawAktywnaNawigacje();
