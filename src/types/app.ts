export type PlaylistCard = {
  id: string;
  title: string;
  imageUrl: string;
};

export type QuestionObject = {
  questionText: string;
  answerFieldPath: string;
  answerType: "multiple-choice" | "binary" | "year-input";
};

export type QuizQuestion = {
  questionObject: QuestionObject;
  correctSongId: string;
  correctAnswer: string;
  wrongAnswers: string[];
  options: string[];
  trackPreviewUrl: string | null;
  trackInfo: {
    id: string;
    name: string;
    artist: string;
    album: string;
    year: string;
    explicit: boolean;
    popularity: number;
  };
};

export type Screen =
  | { name: "start" }
  | { name: "singleMenu" }
  | { name: "choose" }
  | { name: "create" }
  | { name: "quiz"; playlistTitle: string }
  | { name: "results" }
  | { name: "multiplayer" };

export type LobbyPlayer = {
  id: string;
  name: string;
  icon: string;
  score: number;
  answered: boolean;
  latestAnswer: string | null;
};

export type LobbyState = {
  joinCode: string;
  status: "lobby" | "question" | "reveal" | "results";
  players: LobbyPlayer[];
  maxPlayers: number;
};
