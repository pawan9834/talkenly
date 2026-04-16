import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
interface StatusRingProps {
  stories: any[];
  viewedStatusIds: Set<string>;
  size?: number;
  strokeWidth?: number;
  colors: {
    primary: string;
    border: string;
  };
}
const StatusRing: React.FC<StatusRingProps> = ({
  stories,
  viewedStatusIds,
  size = 58,
  strokeWidth = 2.5,
  colors,
}) => {
  const count = stories?.length || 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  if (count <= 1) {
    const isViewed = count === 1 ? viewedStatusIds.has(stories[0].id) : false;
    return (
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isViewed ? colors.border : colors.primary}
          strokeWidth={strokeWidth}
          fill="none"
        />
      </Svg>
    );
  }
  const gap = 4;
  const segmentLength = (circumference - gap * count) / count;
  const dashArray = `${segmentLength} ${circumference - segmentLength}`;
  return (
    <Svg
      width={size}
      height={size}
      style={{ transform: [{ rotate: "-90deg" }] }}
    >
      {stories.map((story: any, i: number) => {
        const isViewed = viewedStatusIds.has(story.id);
        return (
          <Circle
            key={story.id || i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={isViewed ? colors.border : colors.primary}
            strokeWidth={strokeWidth}
            strokeDasharray={dashArray}
            strokeDashoffset={-i * (segmentLength + gap)}
            fill="none"
          />
        );
      })}
    </Svg>
  );
};
export default React.memo(StatusRing);
