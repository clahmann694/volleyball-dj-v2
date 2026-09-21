/**
 * Registriert den Service Worker und laedt die Seite einmal neu, sobald eine
 * neue Version uebernommen hat.
 *
 * Warum: Ohne das bleibt die App eine Version zurueck. Der alte Service Worker
 * liefert weiterhin die zwischengespeicherte Fassung aus; erst beim ZWEITEN
 * Neuladen sieht man die neue (am 2026-09-21 mit zwei echten Builds gemessen).
 * Genau daran ist die Nutzerin haengengeblieben.
 *
 * Bewusst KEINE periodische Update-Pruefung: Ein Neuladen mitten im Spiel wuerde
 * die laufende Musik stoppen. Geprueft wird nur beim Oeffnen der Seite - dann
 * laeuft noch nichts, und das Neuladen faellt nicht auf.
 */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  const base = import.meta.env.BASE_URL;
  // Lief beim Laden schon ein Service Worker? Dann ist ein Wechsel eine echte
  // Aktualisierung. Beim allerersten Besuch uebernimmt er ohne Vorgaenger -
  // da waere ein Neuladen unnoetig.
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${base}sw.js`, { scope: base })
      .catch(e => console.warn('Service Worker konnte nicht registriert werden', e));
  });
}
