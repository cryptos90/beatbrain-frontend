import { useWindowDimensions } from "react-native";

type FluidAxis = "mixed" | "width" | "height";

export const HOST_BREAKPOINTS = {
  verySmallMax: 359,
  smallMax: 479,
  mobileMax: 767,
  tabletMax: 1023,
  laptopMax: 1279,
  desktopMax: 1599,
  wideMin: 1600,
  largeDisplayMin: 2440,
  fourKMin: 3840,
} as const;

export type HostViewportBand =
  | "verySmall"
  | "small"
  | "mobile"
  | "tablet"
  | "laptop"
  | "desktop"
  | "wide";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function interpolate(
  current: number,
  viewportMin: number,
  viewportMax: number,
  valueMin: number,
  valueMax: number,
) {
  if (viewportMax <= viewportMin) {
    return valueMin;
  }

  const progress = clamp((current - viewportMin) / (viewportMax - viewportMin), 0, 1);
  return valueMin + (valueMax - valueMin) * progress;
}

function resolveBreakpoint(width: number): HostViewportBand {
  if (width <= HOST_BREAKPOINTS.verySmallMax) {
    return "verySmall";
  }
  if (width <= HOST_BREAKPOINTS.smallMax) {
    return "small";
  }
  if (width <= HOST_BREAKPOINTS.mobileMax) {
    return "mobile";
  }
  if (width <= HOST_BREAKPOINTS.tabletMax) {
    return "tablet";
  }
  if (width <= HOST_BREAKPOINTS.laptopMax) {
    return "laptop";
  }
  if (width <= HOST_BREAKPOINTS.desktopMax) {
    return "desktop";
  }
  return "wide";
}

export function useHostViewport() {
  const { width, height } = useWindowDimensions();
  const breakpoint = resolveBreakpoint(width);
  const widthScale = width / 1440;
  const heightScale = height / 900;
  const mixedScale = clamp(Math.min(widthScale, heightScale), 0.68, 1.22);
  const isVerySmallViewport = breakpoint === "verySmall";
  const isSmallViewport = breakpoint === "small";
  const isMobileViewport =
    breakpoint === "verySmall" || breakpoint === "small" || breakpoint === "mobile";
  const isTabletViewport = breakpoint === "tablet";
  const isLaptopViewport = breakpoint === "laptop";
  const isDesktopViewport = breakpoint === "desktop";
  const isWideViewport = breakpoint === "wide";
  const isLargeDisplay = width >= HOST_BREAKPOINTS.largeDisplayMin;
  const isFourKViewport =
    width >= HOST_BREAKPOINTS.fourKMin || height >= 2160;
  const isLandscapePhone = width <= 932 && height <= 430;
  const isCompactHeight = height < 860;
  const isLowHeight = height < 760;
  const isVeryLowHeight = height < 680;
  const isShortHeight = height < 700;
  const isVeryShortHeight = height < 580;
  const isNarrowViewport = width < 768;
  const compactViewport = isMobileViewport || isCompactHeight || isLandscapePhone;
  const canUseWideSplit = width >= 1120 && height >= 760 && !isLandscapePhone;
  const spacingDensity = clamp(interpolate(height, 620, 980, 0.76, 1), 0.76, 1);
  const paddingDensity = clamp(interpolate(height, 620, 980, 0.78, 1), 0.78, 1);
  const typeDensity = clamp(interpolate(height, 620, 980, 0.8, 1), 0.8, 1);

  const applyDensity = (value: number, scale: number, min: number) =>
    Math.max(min, Math.round(value * scale));

  const fluidBetween = (
    valueMin: number,
    valueMax: number,
    axis: FluidAxis = "width",
    viewportMin?: number,
    viewportMax?: number,
  ) => {
    const current =
      axis === "height"
        ? height
        : axis === "mixed"
          ? Math.min(width, height)
          : width;
    const resolvedViewportMin =
      viewportMin ?? (axis === "height" ? 568 : axis === "mixed" ? 320 : 320);
    const resolvedViewportMax =
      viewportMax ?? (axis === "height" ? 1440 : axis === "mixed" ? 1440 : 1600);
    return clamp(
      Math.round(
        interpolate(
          current,
          resolvedViewportMin,
          resolvedViewportMax,
          valueMin,
          valueMax,
        ),
      ),
      Math.min(valueMin, valueMax),
      Math.max(valueMin, valueMax),
    );
  };

  const fluid = (base: number, min: number, max: number, axis: FluidAxis = "mixed") => {
    const scale =
      axis === "width"
        ? clamp(widthScale, 0.72, 1.24)
        : axis === "height"
          ? clamp(heightScale, 0.68, 1.16)
          : mixedScale;

    return clamp(Math.round(base * scale), min, max);
  };

  const pagePadding = applyDensity(fluidBetween(14, 38, "width"), spacingDensity, 12);
  const sectionGap = applyDensity(
    fluidBetween(compactViewport ? 10 : 14, 22, "width"),
    spacingDensity,
    8,
  );
  const panelPaddingX = applyDensity(
    fluidBetween(compactViewport ? 12 : 16, 26, "width"),
    paddingDensity,
    12,
  );
  const panelPaddingY = applyDensity(
    fluidBetween(compactViewport ? 12 : 16, 24, "height"),
    paddingDensity,
    10,
  );
  const controlMinHeight = applyDensity(
    fluidBetween(44, 66, "mixed", 320, 1200),
    paddingDensity,
    44,
  );
  const touchTargetMin = 44;
  const radii = {
    sm: applyDensity(fluidBetween(12, 18, "width"), spacingDensity, 12),
    md: applyDensity(fluidBetween(14, 22, "width"), spacingDensity, 14),
    lg: applyDensity(fluidBetween(18, 26, "width"), spacingDensity, 16),
    xl: applyDensity(fluidBetween(20, 30, "width"), spacingDensity, 18),
    pill: 999,
  } as const;
  const space = {
    xxs: applyDensity(fluidBetween(4, 8, "width"), spacingDensity, 4),
    xs: applyDensity(fluidBetween(6, 10, "width"), spacingDensity, 6),
    sm: applyDensity(fluidBetween(9, 14, "width"), spacingDensity, 8),
    md: applyDensity(fluidBetween(12, 18, "width"), spacingDensity, 10),
    lg: applyDensity(fluidBetween(16, 24, "width"), spacingDensity, 12),
    xl: applyDensity(fluidBetween(20, 32, "width"), spacingDensity, 16),
    xxl: applyDensity(fluidBetween(24, 40, "width"), spacingDensity, 20),
  } as const;
  const typeScale = {
    eyebrow: applyDensity(fluidBetween(10, 12, "width"), typeDensity, 10),
    label: applyDensity(fluidBetween(11, 14, "width"), typeDensity, 11),
    bodySm: applyDensity(fluidBetween(12, 15, "width"), typeDensity, 12),
    body: applyDensity(fluidBetween(14, 18, "width"), typeDensity, 13),
    bodyLg: applyDensity(fluidBetween(15, 20, "width"), typeDensity, 14),
    titleSm: applyDensity(fluidBetween(18, 28, "width"), typeDensity, 18),
    title: applyDensity(fluidBetween(22, 36, "width"), typeDensity, 21),
    hero: applyDensity(fluidBetween(26, 54, "width"), typeDensity, 24),
  } as const;
  const contentMax = {
    compact: 460,
    narrow: 720,
    medium: 980,
    wide: 1240,
    stage: 1520,
  } as const;

  const columnsForContainer = (
    containerWidth: number,
    minItemWidth: number,
    maxColumns = 4,
  ) => {
    if (!Number.isFinite(containerWidth) || containerWidth <= 0) {
      return 1;
    }

    const safeMaxColumns = Math.max(1, Math.floor(maxColumns));
    const safeMinItemWidth = Math.max(1, minItemWidth);
    return clamp(
      Math.floor(containerWidth / safeMinItemWidth),
      1,
      safeMaxColumns,
    );
  };

  return {
    width,
    height,
    breakpoint,
    widthScale,
    heightScale,
    mixedScale,
    compactViewport,
    isCompactHeight,
    isLowHeight,
    isVeryLowHeight,
    isShortViewport: isShortHeight,
    isVeryShortViewport: isVeryShortHeight,
    isShortHeight,
    isVeryShortHeight,
    isLandscapePhone,
    isVerySmallViewport,
    isSmallViewport,
    isMobileViewport,
    isTabletViewport,
    isNarrowViewport,
    isLaptopViewport,
    isDesktopViewport,
    isWideViewport,
    isLargeDisplay,
    isFourKViewport,
    canUseWideSplit,
    pagePadding,
    sectionGap,
    panelPaddingX,
    panelPaddingY,
    controlMinHeight,
    touchTargetMin,
    radii,
    space,
    typeScale,
    contentMax,
    fluid,
    fluidBetween,
    columnsForContainer,
  };
}
