import type { ReactNode, CSSProperties } from "react";

export type BorderGlowProps = {
  children?: ReactNode;
  className?: string;
  edgeSensitivity?: number;
  glowColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  glowRadius?: number;
  glowIntensity?: number;
  coneSpread?: number;
  animated?: boolean;
  colors?: string[];
  fillOpacity?: number;
  idleVisible?: boolean;
  style?: CSSProperties;
};

declare function BorderGlow(props: BorderGlowProps): React.JSX.Element;
export default BorderGlow;
