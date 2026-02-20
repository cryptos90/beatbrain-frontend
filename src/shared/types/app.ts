export type PlaylistCard = {
  id: string;
  title: string;
  imageUrl: string;
  tags?: string[];
  decadeTag?: string;
};

export type ChoosePlaylist = {
  id: string;
  name: string;
  coverUrl: string;
};

export type QuestionObject = {
  questionText: string;
  answerFieldPath: string;
  answerType: "multiple-choice" | "binary" | "year-input";
};

export type QuizQuestion = {
  questionObject: QuestionObject;
  correctSongId: string;
  correctTrackUri?: string;
  correctAnswer: string;
  wrongAnswers: string[];
  options: string[];
  trackInfo: {
    id: string;
    uri?: string;
    name: string;
    artist: string;
    album: string;
    coverUrl: string;
    year: string;
    explicit?: boolean;
    popularity?: number;
  };
};

export type Screen =
  | { name: "start" }
  | { name: "singleMenu" }
  | { name: "choose" }
  | { name: "create" }
  | { name: "quiz"; playlistTitle: string }
  | { name: "results" }
  | { name: "multiplayerJoin" }
  | { name: "multiplayerQuiz" }
  | { name: "multiplayerResults" };

export type LobbyPlayer = {
  id: string;
  name: string;
  avatarDataUrl: string;
  score: number;
  answered: boolean;
  latestAnswer: string | null;
  readyForNext: boolean;
  isHost?: boolean;
  socketId?: string;
};

export type LobbyState = {
  joinCode: string;
  status: "lobby" | "question" | "reveal" | "results";
  currentQuestionId?: string | null;
  roundDeadline?: number | null;
  players: LobbyPlayer[];
  maxPlayers: number;
};



