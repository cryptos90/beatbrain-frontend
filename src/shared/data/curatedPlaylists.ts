import type { PlaylistCard } from "../types/app";

export const CURATED_PLAYLISTS: PlaylistCard[] = [
  {
    id: "37i9dQZF1DX4UtSsGT1Sbe",
    title: "All Out 80s",
    imageUrl:
      "https://i.scdn.co/image/ab67706f00000002f3f8dc5121f2ea64f8f78f49",
    tags: ["80s", "Pop"],
    decadeTag: "80s",
  },
  {
    id: "37i9dQZF1DXbTxeAdrVG2l",
    title: "All Out 90s",
    imageUrl:
      "https://i.scdn.co/image/ab67706f000000024f5d5e9f4f3ea91d5f05463b",
    tags: ["90s", "Throwback"],
    decadeTag: "90s",
  },
  {
    id: "37i9dQZF1DXaKIA8E7WcJj",
    title: "All Out 00s",
    imageUrl:
      "https://i.scdn.co/image/ab67706f0000000225bcf9b0f4d3d8f8dcad4d1b",
    tags: ["2000s", "Hits"],
    decadeTag: "2000s",
  },
  {
    id: "37i9dQZF1DWXRqgorJj26U",
    title: "Rock Classics",
    imageUrl:
      "https://i.scdn.co/image/ab67706f0000000219f451ed7afc2f4b2f14d56d",
    tags: ["Rock"],
  },
  {
    id: "37i9dQZF1DXcBWIGoYBM5M",
    title: "Today's Top Hits",
    imageUrl:
      "https://i.scdn.co/image/ab67706f000000026fe24b27d58f4a3f5bb4a6a9",
    tags: ["Chart"],
  },
];

export type LocalPlaylistConfig = {
  id: string;
  fallbackTitle: string;
};

export const PLAYLIST_IDS: LocalPlaylistConfig[] = CURATED_PLAYLISTS.map((playlist) => ({
  id: playlist.id,
  fallbackTitle: playlist.title,
}));

