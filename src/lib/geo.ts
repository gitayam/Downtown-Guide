/**
 * Geographic utilities for distance calculation and routing
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculate the distance between two points using the Haversine formula
 * @returns distance in miles
 */
export function haversineDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 3958.8; // Earth's radius in miles
  const lat1 = toRadians(coord1.latitude);
  const lat2 = toRadians(coord2.latitude);
  const deltaLat = toRadians(coord2.latitude - coord1.latitude);
  const deltaLon = toRadians(coord2.longitude - coord1.longitude);

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Generate a transition tip based on distance between stops
 */
export function generateTransitionTip(from: Coordinates, to: Coordinates): string {
  const distance = haversineDistance(from, to);

  if (distance < 0.25) {
    return 'A short 2-3 minute walk away';
  } else if (distance < 0.5) {
    return 'About a 5-minute stroll';
  } else if (distance < 1) {
    return 'A pleasant 10-15 minute walk, or 3-minute drive';
  } else if (distance < 2) {
    return `About ${Math.round(distance)} mile - 5 minute drive`;
  } else {
    return `${Math.round(distance)} miles - ${Math.round(distance * 3)} minute drive`;
  }
}

/**
 * Check if a location is within a certain radius of downtown Fayetteville
 */
export function isNearDowntown(coords: Coordinates, radiusMiles: number = 2): boolean {
  const downtownCenter: Coordinates = {
    latitude: 35.0527,
    longitude: -78.8784
  };
  return haversineDistance(coords, downtownCenter) <= radiusMiles;
}
