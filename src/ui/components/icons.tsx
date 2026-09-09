/**
 * Icons. Spec §21 — paths transcribed verbatim from the prototype's inline SVG,
 * including stroke widths and line caps. Do not redraw these by eye.
 *
 * All are on an 18×18 viewBox and inherit colour from the `color` prop, matching
 * the prototype's `stroke="currentColor"`.
 */

import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '../theme';

interface IconProps {
  readonly size?: number;
  readonly color?: string;
}

/** Back chevron. */
export function ChevronLeft({ size = 19, color = colors.muted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path
        d="M11 4l-5 5 5 5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Forward arrow, used in settings rows and the completion button. */
export function ArrowRight({ size = 16, color = colors.faint }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path
        d="M3.5 9h11M10 4.5l4.5 4.5L10 13.5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Four rounded squares — the LEVELS button. */
export function GridIcon({ size = 15, color = colors.mutedStrong }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Rect x={2.75} y={2.75} width={5.5} height={5.5} rx={1.6} stroke={color} strokeWidth={1.4} />
      <Rect x={9.75} y={2.75} width={5.5} height={5.5} rx={1.6} stroke={color} strokeWidth={1.4} />
      <Rect x={2.75} y={9.75} width={5.5} height={5.5} rx={1.6} stroke={color} strokeWidth={1.4} />
      <Rect x={9.75} y={9.75} width={5.5} height={5.5} rx={1.6} stroke={color} strokeWidth={1.4} />
    </Svg>
  );
}

/** Two sliders — the SETTINGS button. */
export function SlidersIcon({ size = 15, color = colors.mutedStrong }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path d="M2.5 5.5h13M2.5 12.5h13" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
      <Circle cx={6.5} cy={5.5} r={1.9} fill={colors.bg} stroke={color} strokeWidth={1.4} />
      <Circle cx={11.5} cy={12.5} r={1.9} fill={colors.bg} stroke={color} strokeWidth={1.4} />
    </Svg>
  );
}

/** Circular arrow — RESTART. */
export function RestartIcon({ size = 15, color = colors.muted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path
        d="M15 9a6 6 0 1 1-1.9-4.4"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15.2 3.2v3.5h-3.5"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
