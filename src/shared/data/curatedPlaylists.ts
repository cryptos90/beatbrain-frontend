import type { PlaylistCard } from "../types/app";

export const CURATED_PLAYLIST_IDS = [
  "37i9dQZF1DXaKIA8E7WcJj", // All Out 60s
  "37i9dQZF1DWTJ7xPn4vNaz", // All Out 70s
  "37i9dQZF1DX4UtSsGT1Sbe", // All Out 80s
  "37i9dQZF1DXbTxeAdrVG2l", // All Out 90s
  "37i9dQZF1DX4o1oenSJRJd", // All Out 2000s
  "37i9dQZF1DX5Ejj0EkURtP", // All Out 2010s
  "37i9dQZF1DX2M1RktxUUHG", // All Out 2020s
  "37i9dQZF1DXb57FjYWz00c", // 80s Hits
  "37i9dQZF1EQqZlCxLOykhS", // 80s Mix
  "37i9dQZF1EQn2GRFTFMl2A", // 90s Mix
  "37i9dQZF1DX2syo5w7a1cu", // Soft 90s
  "37i9dQZF1DWXRqgorJj26U", // Rock Classics
  "37i9dQZF1DX1spT6G94GFC", // 80s Rock Anthems
  "37i9dQZF1DX206LSYrawGc", // 80s Rock Drive
] as const;

export function buildPlaylistPlaceholders(ids: readonly string[] = CURATED_PLAYLIST_IDS): PlaylistCard[] {
  return ids.map((id) => ({
    id,
    title: id,
    imageUrl: "",
  }));
}
