import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

interface CircularProgressProps {
  progress: number; // 0 to 1
  size?: number;
  onCancel?: () => void;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({ 
  progress, 
  size = 50,
  onCancel 
}) => {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#FFF"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      
      <TouchableOpacity 
        style={[styles.cancelBtn, { width: size, height: size }]} 
        onPress={onCancel}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={size * 0.5} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 100,
  },
  cancelBtn: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
