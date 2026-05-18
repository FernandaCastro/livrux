import React from 'react';
import Svg, { Rect, Line, Path } from 'react-native-svg';

interface BookCoverPlaceholderProps {
  width: number;
  height: number;
  spineColor?: string;
  coverColor?: string;
  lineColor?: string;
}

export function BookCoverPlaceholder({
  width,
  height,
  spineColor = '#7C6B5A',
  coverColor = '#A0876E',
  lineColor = '#C4A882',
}: BookCoverPlaceholderProps) {
  const spineWidth = width * 0.15;
  const r = 3;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Cover body */}
      <Rect x={spineWidth} y={0} width={width - spineWidth} height={height} rx={r} fill={coverColor} />

      {/* Spine */}
      <Rect x={0} y={0} width={spineWidth} height={height} rx={r} fill={spineColor} />
      {/* Overlap to square the right edge of the spine */}
      <Rect x={spineWidth - r} y={0} width={r} height={height} fill={spineColor} />

      {/* Decorative lines on cover */}
      <Line
        x1={spineWidth + 8} y1={height * 0.35}
        x2={width - 8}      y2={height * 0.35}
        stroke={lineColor} strokeWidth={1.5} strokeLinecap="round"
      />
      <Line
        x1={spineWidth + 8} y1={height * 0.45}
        x2={width - 8}      y2={height * 0.45}
        stroke={lineColor} strokeWidth={1.5} strokeLinecap="round"
      />
      <Line
        x1={spineWidth + 8} y1={height * 0.55}
        x2={width - 14}     y2={height * 0.55}
        stroke={lineColor} strokeWidth={1.5} strokeLinecap="round"
      />

      {/* Bottom page edge hint */}
      <Path
        d={`M${spineWidth} ${height - 4} Q${width / 2} ${height} ${width} ${height - 4}`}
        fill="none" stroke={lineColor} strokeWidth={1} opacity={0.5}
      />
    </Svg>
  );
}
