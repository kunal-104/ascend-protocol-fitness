import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { colors, fonts, space } from './theme';

export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flex: 1, backgroundColor: colors.bg }, style]}>
      <LinearGradient colors={['#071226', colors.bg, colors.bg]} style={StyleSheet.absoluteFill} />
      <GridOverlay />
      {children}
    </View>
  );
}

/** Faint horizontal scanlines for the HUD look. */
function GridOverlay() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: 24 }, (_, i) => (
        <View key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${(i / 24) * 100}%`, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(43,196,255,0.05)' }} />
      ))}
    </View>
  );
}

export function T({
  children,
  style,
  variant = 'body',
  numberOfLines,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  variant?: 'title' | 'heading' | 'body' | 'label' | 'caption' | 'number';
  numberOfLines?: number;
}) {
  return (
    <Text numberOfLines={numberOfLines} style={[textStyles[variant], style]}>
      {children}
    </Text>
  );
}

const textStyles = StyleSheet.create({
  title: { fontFamily: fonts.bold, fontSize: 30, color: colors.text, letterSpacing: 2, textTransform: 'uppercase' },
  heading: { fontFamily: fonts.bold, fontSize: 20, color: colors.text, letterSpacing: 1.2 },
  body: { fontFamily: fonts.regular, fontSize: 16, color: colors.text, lineHeight: 22 },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.glow, letterSpacing: 2, textTransform: 'uppercase' },
  caption: { fontFamily: fonts.regular, fontSize: 13, color: colors.textDim, lineHeight: 18 },
  number: { fontFamily: fonts.bold, fontSize: 28, color: colors.text },
});

/** The signature "System window": glowing border, corner brackets and an optional header tag. */
export function Panel({
  children,
  tag,
  style,
  accent = colors.panelBorder,
}: {
  children: ReactNode;
  tag?: string;
  style?: StyleProp<ViewStyle>;
  accent?: string;
}) {
  return (
    <View style={[styles.panel, { borderColor: accent, shadowColor: accent }, style]}>
      <Corner pos="tl" color={accent} />
      <Corner pos="tr" color={accent} />
      <Corner pos="bl" color={accent} />
      <Corner pos="br" color={accent} />
      {tag ? (
        <View style={styles.tagRow}>
          <View style={[styles.diamond, { backgroundColor: accent }]} />
          <T variant="label" style={{ color: accent }}>
            {tag}
          </T>
          <View style={[styles.tagLine, { backgroundColor: accent }]} />
        </View>
      ) : null}
      {children}
    </View>
  );
}

function Corner({ pos, color }: { pos: 'tl' | 'tr' | 'bl' | 'br'; color: string }) {
  const s = 12;
  const base: ViewStyle = { position: 'absolute', width: s, height: s, borderColor: color };
  const map: Record<typeof pos, ViewStyle> = {
    tl: { top: -2, left: -2, borderTopWidth: 3, borderLeftWidth: 3 },
    tr: { top: -2, right: -2, borderTopWidth: 3, borderRightWidth: 3 },
    bl: { bottom: -2, left: -2, borderBottomWidth: 3, borderLeftWidth: 3 },
    br: { bottom: -2, right: -2, borderBottomWidth: 3, borderRightWidth: 3 },
  };
  return <View pointerEvents="none" style={[base, map[pos]]} />;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const color = variant === 'danger' ? colors.danger : colors.glow;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        { borderColor: color, shadowColor: color },
        variant === 'primary' && { backgroundColor: 'rgba(43,196,255,0.16)' },
        (disabled || loading) && { opacity: 0.4 },
        pressed && { transform: [{ scale: 0.98 }], backgroundColor: 'rgba(43,196,255,0.28)' },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={color} /> : <T style={[styles.buttonText, { color }]}>{title}</T>}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <T style={{ color: selected ? colors.bg : colors.text, fontFamily: fonts.semibold }}>{label}</T>
    </Pressable>
  );
}

export function Option({ title, desc, selected, onPress }: { title: string; desc?: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={[styles.option, selected && { borderColor: colors.glow, backgroundColor: 'rgba(43,196,255,0.12)' }]}
    >
      <View style={[styles.radio, selected && { backgroundColor: colors.glow }]} />
      <View style={{ flex: 1 }}>
        <T style={{ fontFamily: fonts.bold, fontSize: 17 }}>{title}</T>
        {desc ? <T variant="caption">{desc}</T> : null}
      </View>
    </Pressable>
  );
}

export function Input(props: TextInputProps & { label?: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: space(1) }}>
      {label ? <T variant="label">{label}</T> : null}
      <TextInput placeholderTextColor={colors.textFaint} selectionColor={colors.glow} style={[styles.input, style]} {...rest} />
    </View>
  );
}

export function Bar({ value, max, color = colors.glow, height = 8 }: { value: number; max: number; color?: string; height?: number }) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(1, value / max));
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [pct, anim]);
  return (
    <View style={{ height, backgroundColor: colors.track, borderRadius: height / 2, overflow: 'hidden' }}>
      <Animated.View
        style={{
          height,
          borderRadius: height / 2,
          backgroundColor: color,
          width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          shadowColor: color,
          shadowOpacity: 0.9,
          shadowRadius: 6,
        }}
      />
    </View>
  );
}

/** Reveals text one character at a time, like a terminal. */
export function Typewriter({ text, speed = 28, style, onDone }: { text: string; speed?: number; style?: StyleProp<TextStyle>; onDone?: () => void }) {
  const [n, setN] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    setN(0);
    const id = setInterval(() => {
      setN((c) => {
        if (c >= text.length) {
          clearInterval(id);
          done.current?.();
          return c;
        }
        return c + 1;
      });
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return (
    <T style={style}>
      {text.slice(0, n)}
      {n < text.length ? '▌' : ''}
    </T>
  );
}

export interface AlertSpec {
  tag: string;
  title: string;
  lines: string[];
  accent?: string;
  button?: string;
}

/** Full-screen "System notification" pop-up for rewards, level-ups and announcements. */
export function SystemAlert({ alert, onClose }: { alert: AlertSpec | null; onClose: () => void }) {
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!alert) return;
    scale.setValue(0.85);
    opacity.setValue(0);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [alert, scale, opacity]);
  return (
    <Modal visible={!!alert} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.alertBackdrop}>
        <Animated.View style={{ width: '100%', transform: [{ scale }], opacity }}>
          {alert ? (
            <Panel tag={alert.tag} accent={alert.accent ?? colors.panelBorder}>
              <T variant="title" style={{ textAlign: 'center', marginBottom: space(3), color: alert.accent ?? colors.text }}>
                {alert.title}
              </T>
              {alert.lines.map((l, i) => (
                <T key={i} style={{ textAlign: 'center', marginBottom: space(1) }}>
                  {l}
                </T>
              ))}
              <Button title={alert.button ?? 'Acknowledge'} onPress={onClose} style={{ marginTop: space(4) }} />
            </Panel>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space(2) }, style]}>{children}</View>;
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.panelBorderDim, marginVertical: space(3) }} />;
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    padding: space(4),
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: space(2), marginBottom: space(3) },
  diamond: { width: 8, height: 8, transform: [{ rotate: '45deg' }] },
  tagLine: { flex: 1, height: 1, opacity: 0.4 },
  button: {
    borderWidth: 1,
    paddingVertical: space(3.5),
    paddingHorizontal: space(5),
    alignItems: 'center',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  buttonText: { fontFamily: fonts.bold, fontSize: 17, letterSpacing: 3, textTransform: 'uppercase' },
  chip: {
    borderWidth: 1,
    borderColor: colors.panelBorderDim,
    paddingVertical: space(2),
    paddingHorizontal: space(3.5),
  },
  chipSelected: { backgroundColor: colors.glow, borderColor: colors.glow },
  option: {
    flexDirection: 'row',
    gap: space(3),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.panelBorderDim,
    padding: space(3.5),
  },
  radio: { width: 14, height: 14, borderWidth: 1.5, borderColor: colors.glow, transform: [{ rotate: '45deg' }] },
  input: {
    borderWidth: 1,
    borderColor: colors.panelBorderDim,
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 18,
    paddingHorizontal: space(3.5),
    paddingVertical: space(3),
    backgroundColor: 'rgba(5,12,26,0.8)',
  },
  alertBackdrop: { flex: 1, backgroundColor: 'rgba(0,4,12,0.82)', justifyContent: 'center', padding: space(6) },
});
