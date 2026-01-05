// beatbrain-frontend/src/mock/songAssets.ts
// Map: Song-ID (aus JSON) -> MP3 Asset
// MP3 Pfade:
// assets/songs/70s/<id>.mp3
// assets/songs/80s/<id>.mp3
// assets/songs/90s/<id>.mp3
// assets/songs/hiphop/<id>.mp3
// assets/songs/rock/<id>.mp3

export const SONG_ASSETS: Record<string, any> = {
  // -------- 70s --------
  "70s_1": require("../../assets/songs/70s/70s_1.mp3"),
  "70s_2": require("../../assets/songs/70s/70s_2.mp3"),
  "70s_3": require("../../assets/songs/70s/70s_3.mp3"),
  "70s_4": require("../../assets/songs/70s/70s_4.mp3"),
  "70s_5": require("../../assets/songs/70s/70s_5.mp3"),
  "70s_6": require("../../assets/songs/70s/70s_6.mp3"),
  "70s_7": require("../../assets/songs/70s/70s_7.mp3"),
  "70s_8": require("../../assets/songs/70s/70s_8.mp3"),
  "70s_9": require("../../assets/songs/70s/70s_9.mp3"),
  "70s_10": require("../../assets/songs/70s/70s_10.mp3"),

  // -------- 80s --------
  "80s_1": require("../../assets/songs/80s/80s_1.mp3"),
  "80s_2": require("../../assets/songs/80s/80s_2.mp3"),
  "80s_3": require("../../assets/songs/80s/80s_3.mp3"),
  "80s_4": require("../../assets/songs/80s/80s_4.mp3"),
  "80s_5": require("../../assets/songs/80s/80s_5.mp3"),
  "80s_6": require("../../assets/songs/80s/80s_6.mp3"),
  "80s_7": require("../../assets/songs/80s/80s_7.mp3"),
  "80s_8": require("../../assets/songs/80s/80s_8.mp3"),
  "80s_9": require("../../assets/songs/80s/80s_9.mp3"),
  "80s_10": require("../../assets/songs/80s/80s_10.mp3"),

  // -------- 90s --------
  "90s_1": require("../../assets/songs/90s/90s_1.mp3"),
  "90s_2": require("../../assets/songs/90s/90s_2.mp3"),
  "90s_3": require("../../assets/songs/90s/90s_3.mp3"),
  "90s_4": require("../../assets/songs/90s/90s_4.mp3"),
  "90s_5": require("../../assets/songs/90s/90s_5.mp3"),
  "90s_6": require("../../assets/songs/90s/90s_6.mp3"),
  "90s_7": require("../../assets/songs/90s/90s_7.mp3"),
  "90s_8": require("../../assets/songs/90s/90s_8.mp3"),
  "90s_9": require("../../assets/songs/90s/90s_9.mp3"),
  "90s_10": require("../../assets/songs/90s/90s_10.mp3"),

  // -------- hiphop --------
  "hiphop_1": require("../../assets/songs/hiphop/hiphop_1.mp3"),
  "hiphop_2": require("../../assets/songs/hiphop/hiphop_2.mp3"),
  "hiphop_3": require("../../assets/songs/hiphop/hiphop_3.mp3"),
  "hiphop_4": require("../../assets/songs/hiphop/hiphop_4.mp3"),
  "hiphop_5": require("../../assets/songs/hiphop/hiphop_5.mp3"),
  "hiphop_6": require("../../assets/songs/hiphop/hiphop_6.mp3"),
  "hiphop_7": require("../../assets/songs/hiphop/hiphop_7.mp3"),
  "hiphop_8": require("../../assets/songs/hiphop/hiphop_8.mp3"),
  "hiphop_9": require("../../assets/songs/hiphop/hiphop_9.mp3"),
  "hiphop_10": require("../../assets/songs/hiphop/hiphop_10.mp3"),

  // -------- rock --------
  "rock_1": require("../../assets/songs/rock/rock_1.mp3"),
  "rock_2": require("../../assets/songs/rock/rock_2.mp3"),
  "rock_3": require("../../assets/songs/rock/rock_3.mp3"),
  "rock_4": require("../../assets/songs/rock/rock_4.mp3"),
  "rock_5": require("../../assets/songs/rock/rock_5.mp3"),
  "rock_6": require("../../assets/songs/rock/rock_6.mp3"),
  "rock_7": require("../../assets/songs/rock/rock_7.mp3"),
  "rock_8": require("../../assets/songs/rock/rock_8.mp3"),
  "rock_9": require("../../assets/songs/rock/rock_9.mp3"),
  "rock_10": require("../../assets/songs/rock/rock_10.mp3"),
};

export function getSongAssetById(id: string): any | null {
  return SONG_ASSETS[id] ?? null;
}
