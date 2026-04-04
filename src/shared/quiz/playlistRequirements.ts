const MIN_PLAYABLE_PLAYLIST_TRACKS = 10;

export function getRequiredQuizSeedPoolSize(questionCount: number) {
  const normalizedQuestionCount = Number.isFinite(questionCount)
    ? Math.max(1, Math.min(100, Math.floor(questionCount)))
    : MIN_PLAYABLE_PLAYLIST_TRACKS;

  return Math.min(
    100,
    Math.max(MIN_PLAYABLE_PLAYLIST_TRACKS, normalizedQuestionCount + 3),
  );
}
