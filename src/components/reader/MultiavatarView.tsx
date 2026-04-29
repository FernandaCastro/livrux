import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import multiavatar from '@multiavatar/multiavatar';

interface MultiavatarViewProps {
  seed: string | null | undefined;
  size: number;
  borderColor?: string;
  borderWidth?: number;
}

export function MultiavatarView({ seed, size, borderColor, borderWidth = 0 }: MultiavatarViewProps) {
  const svgXml = useMemo(() => multiavatar(seed ?? 'default'), [seed]);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: borderColor ?? 'transparent',
          borderWidth,
        },
      ]}
    >
      <SvgXml xml={svgXml} width={size} height={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
