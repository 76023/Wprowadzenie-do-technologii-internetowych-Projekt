function wykryjTrybBazy() {
  const adres = String(process.env.DATABASE_URL || "").trim();

  if (adres) {
    return "postgresql";
  }

  return "sqlite";
}

function czyTrybProdukcyjny() {
  return process.env.NODE_ENV === "production";
}

const TRYB = wykryjTrybBazy();

function opisTrybu() {
  return TRYB === "postgresql" ? "PostgreSQL" : "SQLite";
}

module.exports = {
  TRYB,
  czyTrybProdukcyjny,
  opisTrybu,
  wykryjTrybBazy
};
