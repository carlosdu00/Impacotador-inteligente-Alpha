// RangeSlider.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MultiSlider from '@ptomasroos/react-native-multi-slider';

type RangeSliderProps = {
  values: number[];
  min: number;
  max: number;
  step?: number;
  onValuesChange: (values: number[]) => void;
};

const CustomMarker = () => (
  <View style={styles.customMarker} />
);

const RangeSlider: React.FC<RangeSliderProps> = ({ values, min, max, step = 1, onValuesChange }) => {
  return (
    <View style={styles.container}>
      <MultiSlider
        values={values}
        sliderLength={280}
        onValuesChange={onValuesChange}
        min={min}
        max={max}
        step={step}
        allowOverlap={false}
        snapped
        customMarker={CustomMarker}
        containerStyle={styles.sliderContainer}
      />
      <View style={styles.sliderRuler}>
        <Text style={styles.rulerText}>{min}</Text>
        <Text style={styles.rulerText}>{Math.round((min + max) / 2)}</Text>
        <Text style={styles.rulerText}>{max}</Text>
      </View>
      <Text style={styles.currentValues}>{`Valores: ${values[0]} a ${values[1]}`}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  sliderContainer: {
    marginHorizontal: 20,
  },
  sliderRuler: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 280,
    marginHorizontal: 20,
  },
  rulerText: {
    fontSize: 12,
    color: '#555',
  },
  currentValues: {
    marginTop: 5,
    fontSize: 14,
    color: '#333',
  },
  customMarker: {
    height: 24,
    width: 24,
    borderRadius: 12,
    backgroundColor: '#007bff',
    borderWidth: 2,
    borderColor: '#fff',
    marginHorizontal: 6,
  },
});

export default RangeSlider;
