export type MockPlaylist = {
  id: string;
  title: string;
  cover: any;
};

export const MOCK_PLAYLISTS: MockPlaylist[] = [
  {
    id: 'playlist_01',
    title: '70s Playlist',
    cover: require('../../assets/playlists/70er.png'),
  },
  {
    id: 'playlist_02',
    title: '80s Playlist',
    cover: require('../../assets/playlists/80er.png'),
  },
  {
    id: 'playlist_03',
    title: '90s Playlist',
    cover: require('../../assets/playlists/90er.png'),
  },
  {
    id: 'playlist_04',
    title: 'Hip-Hop Playlist',
    cover: require('../../assets/playlists/HipHop.png'),
  },
  {
    id: 'playlist_05',
    title: 'Rock Playlist',
    cover: require('../../assets/playlists/Rock.png'),
  },
];
