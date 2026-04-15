import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

interface CircularProgressProps {
  progress: number; // 0 to 1
  size?: number;
  onCancel?: () => void;
  label?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({ 
  progress, 
  size = 50,
  onCancel,
  label
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
      
      <View style={[styles.centerContent, { width: size, height: size }]}>
        {label ? (
          <Text style={[styles.progressText, { fontSize: size * 0.22 }]}>{label}</Text>
        ) : onCancel ? (
          <TouchableOpacity 
            style={[styles.cancelBtn, { width: size, height: size }]} 
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={size * 0.5} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <Ionicons name="arrow-down" size={size * 0.5} color="#FFF" />
        )}
      </View>
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
  centerContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    color: '#FFF',
    fontWeight: '700',
  },
});
