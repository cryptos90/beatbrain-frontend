import { Dimensions } from "react-native";

export const { width: SCREEN_W } = Dimensions.get("window");
export const CARD_W = Math.min(340, SCREEN_W * 0.78);

export const HEADER_PAD_TOP = 54;
export const BACK_BTN_SIZE = 52;
export const BACK_BTN_ICON_SIZE = 22;
export const LOGO_SIZE = 200;
export const QUIZ_LOGO_WIDTH = 84;
export const QUIZ_LOGO_HEIGHT = 54;
export const BUTTON_DROP = BACK_BTN_SIZE * 2;
export const CHOOSE_FOOTER_PADDING_BOTTOM = 24 + 56;

export const QUESTIONS_PER_QUIZ = 5;
export const TIMER_SECONDS = 30;
