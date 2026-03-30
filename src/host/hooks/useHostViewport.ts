import { useWindowDimensions } from "react-native";

type FluidAxis = "mixed" | "width" | "height";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function useHostViewport() {
  const { width, height } = useWindowDimensions();
  const widthScale = width / 1440;
  const heightScale = height / 900;
  const mixedScale = clamp(Math.min(widthScale, heightScale), 0.68, 1.22);

  const fluid = (base: number, min: number, max: number, axis: FluidAxis = "mixed") => {
    const scale =
      axis === "width"
        ? clamp(widthScale, 0.72, 1.24)
        : axis === "height"
          ? clamp(heightScale, 0.68, 1.16)
          : mixedScale;

    return clamp(Math.round(base * scale), min, max);
  };

  return {
    width,
    height,
    widthScale,
    heightScale,
    mixedScale,
    isShortViewport: height < 760,
    isVeryShortViewport: height < 680,
    isNarrowViewport: width < 900,
    fluid,
  };
}
