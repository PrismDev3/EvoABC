import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ScreenName } from '../types';

/**
 * A tiny purpose built navigator. EvoABC only ever shows one screen at a time
 * with a playful slide, so a full navigation library would be dead weight.
 */

export type RouteParams = Record<string, unknown>;

export interface NavRoute {
  name: ScreenName;
  params: RouteParams;
  key: string;
}

export interface NavController {
  route: NavRoute;
  canGoBack: boolean;
  push: (name: ScreenName, params?: RouteParams) => void;
  replace: (name: ScreenName, params?: RouteParams) => void;
  pop: (count?: number) => void;
  reset: (name: ScreenName, params?: RouteParams) => void;
  params: RouteParams;
}

const NavContext = createContext<NavController | null>(null);

export function useNav(): NavController {
  const context = useContext(NavContext);
  if (context === null) throw new Error('useNav must be used inside the Navigator');
  return context;
}

/** Typed param reader for a screen. */
export function useParams<T extends RouteParams>(): T {
  const { params } = useNav();
  return params as T;
}

type Presentation = 'slide' | 'fade';
type Direction = 'push' | 'pop';

const PRESENTATION: Partial<Record<ScreenName, Presentation>> = {
  onboarding: 'fade',
  home: 'fade',
  play: 'slide',
  result: 'fade',
};

const DURATION = 300;

let routeCounter = 0;
const makeRoute = (name: ScreenName, params: RouteParams): NavRoute => {
  routeCounter += 1;
  return { name, params, key: `${name}-${routeCounter}` };
};

interface NavigatorProps {
  screens: Record<ScreenName, React.ComponentType>;
  initial: ScreenName;
  initialParams?: RouteParams;
}

export function Navigator({ screens, initial, initialParams }: NavigatorProps) {
  const params = initialParams ?? {};
  const { width } = useWindowDimensions();
  const [stack, setStack] = useState<NavRoute[]>(() => [makeRoute(initial, params)]);
  const [leaving, setLeaving] = useState<NavRoute | null>(null);
  const [direction, setDirection] = useState<Direction>('push');
  const progress = useRef(new Animated.Value(1)).current;
  const busy = useRef(false);

  const route = stack[stack.length - 1] ?? makeRoute(initial, params);

  const animateIn = useCallback(
    (nextDirection: Direction) => {
      setDirection(nextDirection);
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [progress],
  );

  const push = useCallback(
    (name: ScreenName, nextParams: RouteParams = {}) => {
      setStack((current) => [...current, makeRoute(name, nextParams)]);
      animateIn('push');
    },
    [animateIn],
  );

  const replace = useCallback(
    (name: ScreenName, nextParams: RouteParams = {}) => {
      setStack((current) => [...current.slice(0, -1), makeRoute(name, nextParams)]);
      animateIn('push');
    },
    [animateIn],
  );

  const pop = useCallback(
    (count = 1) => {
      if (busy.current || stack.length <= 1) return;
      const target = stack[stack.length - 1];
      if (target === undefined) return;
      busy.current = true;
      setLeaving(target);
      setStack(stack.slice(0, Math.max(1, stack.length - count)));
      setDirection('pop');
      progress.setValue(1);
      Animated.timing(progress, {
        toValue: 0,
        duration: DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setLeaving(null);
        busy.current = false;
        progress.setValue(1);
      });
    },
    [progress, stack],
  );

  const reset = useCallback(
    (name: ScreenName, nextParams: RouteParams = {}) => {
      setLeaving(null);
      busy.current = false;
      setStack([makeRoute(name, nextParams)]);
      setDirection('push');
      progress.setValue(1);
    },
    [progress],
  );

  const controller = useMemo<NavController>(
    () => ({ route, canGoBack: stack.length > 1, push, replace, pop, reset, params: route.params }),
    [route, stack.length, push, replace, pop, reset],
  );

  const visible = stack.slice(-2);

  const cardStyle = (item: NavRoute, index: number, total: number) => {
    const presentation = PRESENTATION[item.name] ?? 'slide';
    const isTop = index === total - 1;
    if (presentation === 'fade') {
      return isTop ? { opacity: progress } : undefined;
    }
    const topFromPop = direction === 'pop';
    if (isTop && topFromPop) {
      return {
        transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.2, 0] }) }],
      };
    }
    return {
      transform: [
        {
          translateX: isTop
            ? progress.interpolate({ inputRange: [0, 1], outputRange: [width, 0] })
            : progress.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.2, 0] }),
        },
      ],
    };
  };

  const leavingPresentation: Presentation = leaving === null ? 'slide' : PRESENTATION[leaving.name] ?? 'slide';
  const LeavingScreen = leaving === null ? null : screens[leaving.name];

  return (
    <NavContext.Provider value={controller}>
      <View style={styles.root}>
        {visible.map((item, index) => {
          const Screen = screens[item.name];
          if (Screen === undefined) return null;
          const isTop = index === visible.length - 1;
          return (
            <Animated.View
              key={item.key}
              style={[StyleSheet.absoluteFill, cardStyle(item, index, visible.length), isTop ? styles.front : styles.behind]}
              pointerEvents={isTop && leaving === null ? 'auto' : 'none'}
            >
              <Screen />
            </Animated.View>
          );
        })}
        {leaving !== null && LeavingScreen !== null && LeavingScreen !== undefined ? (
          <Animated.View
            key={`leaving-${leaving.key}`}
            style={[
              StyleSheet.absoluteFill,
              styles.front,
              leavingPresentation === 'fade'
                ? { opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }
                : { transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [width, 0] }) }] },
            ]}
            pointerEvents="none"
          >
            <LeavingScreen />
          </Animated.View>
        ) : null}
      </View>
    </NavContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0E2036', overflow: 'hidden' },
  front: { zIndex: 2 },
  behind: { zIndex: 1 },
});
