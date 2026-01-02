export type MockPlaylist = {
  id: string;
  title: string;
  cover: any;
};

export const MOCK_PLAYLISTS: MockPlaylist[] = [
  {
    id: 'playlist_01',
    title: 'Synthwave Nights',
    cover: require('../../assets/playlists/playlist_01.png'),
  },
  {
    id: 'playlist_02',
    title: 'Lo-Fi Focus',
    cover: require('../../assets/playlists/playlist_02.png'),
  },
  {
    id: 'playlist_03',
    title: 'Indie Discovery',
    cover: require('../../assets/playlists/playlist_03.png'),
  },
  {
    id: 'playlist_04',
    title: 'Hip-Hop Heat',
    cover: require('../../assets/playlists/playlist_04.png'),
  },
  {
    id: 'playlist_05',
    title: 'Pop Essentials',
    cover: require('../../assets/playlists/playlist_05.png'),
  },
];
