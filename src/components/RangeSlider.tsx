// components/RangeSlider.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MultiSlider from '@ptomasroos/react-native-multi-slider';

interface RangeSliderProps {
  values: number[];
  min: number;
  max: number;
  onValuesChange: (values: number[]) => void;
}

const RangeSlider: React.FC<RangeSliderProps> = ({ values, min, max, onValuesChange }) => {
  return (
    <View style={styles.container}>
      <MultiSlider
        values={values}
        sliderLength={280}
        onValuesChange={onValuesChange}
        min={min}
        max={max}
        step={1}
        allowOverlap={false}
        snapped
        minMarkerOverlapDistance={40}
        customMarker={() => (
          <View style={styles.marker}>
            <View style={styles.markerInner} />
          </View>
        )}
        selectedStyle={styles.selectedTrack}
        unselectedStyle={styles.unselectedTrack}
        trackStyle={styles.track}
      />
      <View style={styles.labelsContainer}>
        <Text style={styles.label}>{values[0]}</Text>
        <Text style={styles.label}>{values[1]}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 20,
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  label: {
    fontSize: 14,
    color: '#333',
  },
  marker: {
    height: 30,
    width: 30,
    borderRadius: 15,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  markerInner: {
    height: 15,
    width: 15,
    borderRadius: 7.5,
    backgroundColor: '#1a9274',
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