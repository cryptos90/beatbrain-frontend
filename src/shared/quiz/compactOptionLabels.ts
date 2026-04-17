import type { QuestionObject, QuizQuestionOption } from "../types/app";

export type DisplayQuizQuestionOption = QuizQuestionOption & {
  displayLabel: string;
};

const DECORATIVE_ALBUM_SUFFIX_KEYWORDS = [
  "remaster",
  "deluxe",
  "edition",
  "expanded",
  "anniversary",
  "version",
  "reissue",
  "bonus",
  "further listening",
  "collector",
  "special",
  "super deluxe",
  "digitally remastered",
  "complete",
  "legacy",
  "mix",
  "mono",
  "stereo",
];

const TRAILING_BRACKET_SUFFIX_PATTERN =
  /\s*[\(\[][^()\]]*(remaster|deluxe|edition|expanded|anniversary|version|reissue|bonus|further listening|collector|special|super deluxe|digitally remastered|complete|legacy|mix|mono|stereo)[^()\]]*[\)\]]\s*$/i;

function normalizeLabel(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function stripTrailingDecorativeBrackets(value: string) {
  let current = value.trim();
  while (TRAILING_BRACKET_SUFFIX_PATTERN.test(current)) {
    current = current.replace(TRAILING_BRACKET_SUFFIX_PATTERN, "").trim();
  }
  return current;
}

function looksLikeDecorativeAlbumSuffix(value: string) {
  const normalized = normalizeLabel(value);
  if (!normalized) {
    return false;
  }

  if (DECORATIVE_ALBUM_SUFFIX_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return true;
  }

  return /\b\d{4}\b/.test(normalized) && /\b(remaster|edition|version|reissue)\b/.test(normalized);
}

function compactAlbumOptionLabel(value: string) {
  let current = stripTrailingDecorativeBrackets(value);
  let changed = true;

  while (changed) {
    changed = false;

    for (const separator of [": ", " - ", " – ", " — ", " / "]) {
      const separatorIndex = current.lastIndexOf(separator);
      if (separatorIndex <= 0) {
        continue;
      }

      const prefix = current.slice(0, separatorIndex).trim();
      const suffix = current.slice(separatorIndex + separator.length).trim();
      if (!prefix || !suffix) {
        continue;
      }

      if (looksLikeDecorativeAlbumSuffix(suffix)) {
        current = prefix;
        changed = true;
        break;
      }
    }

    const stripped = stripTrailingDecorativeBrackets(current);
    if (stripped !== current) {
      current = stripped;
      changed = true;
    }
  }

  return current.trim();
}

function toCompactDisplayLabel(questionObject: QuestionObject, option: QuizQuestionOption) {
  const originalLabel = String(option.label ?? option.value ?? "").trim();
  if (!originalLabel) {
    return "";
  }

  if (questionObject.answerFieldPath !== "albumName") {
    return originalLabel;
  }

  const compactLabel = compactAlbumOptionLabel(originalLabel);
  return compactLabel || originalLabel;
}

export function getDisplayQuizOptions(
  questionObject: QuestionObject,
  options: QuizQuestionOption[],
): DisplayQuizQuestionOption[] {
  const withCompactLabels = options.map((option) => ({
    ...option,
    displayLabel: toCompactDisplayLabel(questionObject, option),
  }));

  const compactLabelCounts = new Map<string, number>();
  for (const option of withCompactLabels) {
    const normalized = normalizeLabel(option.displayLabel);
    if (!normalized) {
      continue;
    }
    compactLabelCounts.set(normalized, (compactLabelCounts.get(normalized) ?? 0) + 1);
  }

  return withCompactLabels.map((option) => {
    const normalized = normalizeLabel(option.displayLabel);
    if (!normalized) {
      return option;
    }

    if ((compactLabelCounts.get(normalized) ?? 0) > 1) {
      return {
        ...option,
        displayLabel: String(option.label ?? option.value ?? "").trim(),
      };
    }

    return option;
  });
}
