export type LocalPlaylistConfig = {
  id: string;
  fallbackTitle: string;
};

// Developer-maintained Spotify playlist IDs for Choose Quiz.
export const PLAYLIST_IDS: LocalPlaylistConfig[] = [
  { id: '37i9dQZF1DXcBWIGoYBM5M', fallbackTitle: 'Today Top Hits' },
  { id: '37i9dQZF1DX4dyzvuaRJ0n', fallbackTitle: 'mint' },
  { id: '37i9dQZF1DWXRqgorJj26U', fallbackTitle: 'Rock Classics' },
  { id: '37i9dQZF1DX0XUsuxWHRQd', fallbackTitle: 'RapCaviar' },
  { id: '37i9dQZF1DXa2PvUpywmrr', fallbackTitle: 'The Pulse of Indie' },
];
