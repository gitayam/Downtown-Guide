/**
 * Geographic utilities for date planning
 * Haversine distance, route optimization, walking time estimates
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculate the distance between two points using Haversine formula
 * @returns Distance in kilometers
 */
export function haversineDistance(
  point1: Coordinates,
  point2: Coordinates
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(point2.latitude - point1.latitude);
  const dLon = toRadians(point2.longitude - point1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.latitude)) *
    Math.cos(toRadians(point2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Estimate walking time between two points
 * Average walking speed: 5 km/h = ~12 min/km
 * @returns Walking time in minutes
 */
export function estimateWalkTime(distanceKm: number): number {
  const WALKING_SPEED_KM_PER_MIN = 5 / 60; // 5 km/h
  return Math.ceil(distanceKm / WALKING_SPEED_KM_PER_MIN);
}

/**
 * Generate a human-friendly transition tip based on distance
 */
export function generateTransitionTip(
  from: Coordinates,
  to: Coordinates
): string {
  const distance = haversineDistance(from, to);
  const walkTime = estimateWalkTime(distance);

  if (walkTime <= 2) return "Just steps away!";
  if (walkTime <= 5) return `${walkTime} minute stroll.`;
  if (walkTime <= 10) return `Nice ${walkTime} minute walk through downtown.`;
  if (walkTime <= 15) return `${walkTime} minute walk - enjoy the scenery.`;
  if (walkTime <= 25) return `About ${walkTime} minutes walking, or a quick drive.`;
  return `${walkTime}+ minutes - consider driving or rideshare.`;
}

/**
 * Calculate total route distance for a list of stops
 */
export function calculateRouteDistance(stops: Coordinates[]): number {
  if (stops.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < stops.length; i++) {
    totalDistance += haversineDistance(stops[i - 1], stops[i]);
  }
  return totalDistance;
}

/**
 * Optimize route order using nearest-neighbor heuristic
 * Keeps first stop fixed (anchor point) and optimizes the rest
 */
export function optimizeRouteOrder<T extends { coords: Coordinates }>(
  stops: T[]
): T[] {
  if (stops.length <= 2) return stops;

  const optimized: T[] = [stops[0]];
  const remaining = [...stops.slice(1)];

  while (remaining.length > 0) {
    const current = optimized[optimized.length - 1];
    let nearestIdx = 0;
    let nearestDist = Infinity;

    remaining.forEach((stop, idx) => {
      const dist = haversineDistance(current.coords, stop.coords);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = idx;
      }
    });

    optimized.push(remaining.splice(nearestIdx, 1)[0]);
  }

  return optimized;
}

/**
 * Check if a venue is within walking distance of a point
 * Default threshold: 1.5 km (~18 min walk)
 */
export function isWalkable(
  from: Coordinates,
  to: Coordinates,
  maxDistanceKm: number = 1.5
): boolean {
  return haversineDistance(from, to) <= maxDistanceKm;
}

/**
 * Get the centroid (center point) of multiple coordinates
 */
export function getCentroid(points: Coordinates[]): Coordinates {
  if (points.length === 0) {
    // Default to downtown Fayetteville
    return { latitude: 35.0527, longitude: -78.8784 };
  }

  const sum = points.reduce(
    (acc, p) => ({
      latitude: acc.latitude + p.latitude,
      longitude: acc.longitude + p.longitude
    }),
    { latitude: 0, longitude: 0 }
  );

  return {
    latitude: sum.latitude / points.length,
    longitude: sum.longitude / points.length
  };
}
