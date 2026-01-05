export type MockPlaylist = {
  id: string;
  title: string;
  cover: any;
};

type RawPlaylist = {
  id: string;
  title: string;
  cover: string; // filename in assets/playlists
};

// ✅ mock_playlist.json liegt in: assets/playlists/
import rawPlaylists from "../../assets/playlists/mock_playlists.json";

// ❗ In React Native muss require() statisch sein → Mapping-Tabelle:
const COVER_MAP: Record<string, any> = {
  "80er.png": require("../../assets/playlists/80er.png"),
  "90er.png": require("../../assets/playlists/90er.png"),
  "70er.png": require("../../assets/playlists/70er.png"),
  "HipHop.png": require("../../assets/playlists/HipHop.png"),
  "Rock.png": require("../../assets/playlists/Rock.png"),
};

export const MOCK_PLAYLISTS: MockPlaylist[] = (rawPlaylists as RawPlaylist[]).map((p) => ({
  id: p.id,
  title: p.title,
  cover: COVER_MAP[p.cover],
}));
