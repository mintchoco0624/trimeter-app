// Public, key-free endpoints only. Never put passwords or private API keys here.
export const environment = {
  production: true,
  /**
   * Where the app checks for an updated fare matrix (HttpClient GET).
   * After pushing this project to GitHub, set it to the raw URL of src/assets/fare-matrix.json, e.g.
   * https://raw.githubusercontent.com/<user>/trimeter-app/main/src/assets/fare-matrix.json
   * Leave it empty to use only the copy bundled inside the app.
   */
  fareMatrixUrl: '',
  bundledFareMatrixUrl: 'assets/fare-matrix.json',
  /** OpenStreetMap Nominatim: turns coordinates into place names, and searches places. */
  nominatimUrl: 'https://nominatim.openstreetmap.org',
  /** OSRM demo server: road distance between two points (manual mode). */
  osrmUrl: 'https://router.project-osrm.org',
  /** Map tiles. */
  tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
};
