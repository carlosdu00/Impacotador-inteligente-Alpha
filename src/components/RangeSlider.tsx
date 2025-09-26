// src/components/RangeSlider.tsx
import React from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import MultiSlider from '@ptomasroos/react-native-multi-slider';

interface RangeSliderProps {
  values: number[];
  min: number;
  max: number;
  onValuesChange: (values: number[]) => void;
  // opcional: passar sliderLength externo
  sliderLength?: number;
}

const { width: screenWidth } = Dimensions.get('window');

const RangeSlider: React.FC<RangeSliderProps> = ({ values, min, max, onValuesChange, sliderLength }) => {
  const computedSliderLength = sliderLength ?? Math.round(screenWidth * 0.75);

  return (
    <View style={styles.container}>
      <MultiSlider
        values={values}
        sliderLength={computedSliderLength}
        onValuesChange={onValuesChange}
        min={min}
        max={max}
        step={1}
        allowOverlap={false}
        snapped
        minMarkerOverlapDistance={40}
        customMarker={({ currentValue }) => (
          <View style={styles.marker}>
            <View style={styles.markerInner}>
              <View style={styles.valueContainer}>
                <Text style={styles.markerLabel}>{currentValue}</Text>
              </View>
            </View>
          </View>
        )}
        selectedStyle={styles.selectedTrack}
        unselectedStyle={styles.unselectedTrack}
        trackStyle={styles.track}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
  },
  marker: {
    height: 32,
    width: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerInner: {
    height: 28,
    width: 28,
    borderRadius: 14,
    backgroundColor: '#1a9274',
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedTrack: {
    backgroundColor: '#1a9274',
    height: 3,
  },
  unselectedTrack: {
    backgroundColor: '#d3d3d3',
    height: 2,
  },
  track: {
    height: 3,
    borderRadius: 1.5,
  },
});

export default RangeSlider;
