/**
 * Browser geolocation for check-in/check-out (Leistungsnachweis).
 */
export interface Coords {
  longitude: number;
  latitude: number;
}

export function getCurrentPosition(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          longitude: pos.coords.longitude,
          latitude: pos.coords.latitude,
        });
      },
      (err) => {
        const message =
          err.code === err.PERMISSION_DENIED
            ? "Standort wurde nicht freigegeben."
            : err.code === err.POSITION_UNAVAILABLE
              ? "Standort nicht verfügbar."
              : "Zeitüberschreitung beim Abrufen des Standorts.";
        reject(new Error(message));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}
