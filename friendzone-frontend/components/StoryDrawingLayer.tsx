import React from "react";
import { StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { StoryStroke } from "@/constants/storyDecor";

type Props = {
  strokes: StoryStroke[];
  width: number;
  height: number;
};

const toPath = (points: number[], width: number, height: number) => {
  if (points.length < 2) return "";
  let d = `M ${points[0] * width} ${points[1] * height}`;
  if (points.length === 2) return `${d} l 0.01 0`;
  for (let i = 2; i < points.length; i += 2) d += ` L ${points[i] * width} ${points[i + 1] * height}`;
  return d;
};

export default function StoryDrawingLayer({ strokes, width, height }: Props) {
  if (!strokes.length) return null;
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      {strokes.map((stroke, index) => (
        <Path
          key={index}
          d={toPath(stroke.points, width, height)}
          stroke={stroke.color}
          strokeWidth={stroke.width * width}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
    </Svg>
  );
}
