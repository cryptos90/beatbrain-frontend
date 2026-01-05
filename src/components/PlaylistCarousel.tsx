import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Text,
  View,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const AUTO_SCROLL_MS = 3200;

import type { MockPlaylist } from "../mock/playlists";

type Props = {
  playlists: MockPlaylist[];
  onPlaylistChange: (playlist: MockPlaylist) => void;
};

export default function PlaylistCarousel({ playlists, onPlaylistChange }: Props) {
  const SIDE_PADDING = 24;
  const ITEM_WIDTH = SCREEN_WIDTH - SIDE_PADDING * 2;

  const looped = useMemo(() => {
    if (playlists.length <= 1) return playlists;
    return [playlists[playlists.length - 1], ...playlists, playlists[0]];
  }, [playlists]);

  const listRef = useRef<FlatList<MockPlaylist>>(null);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedIndexRef = useRef(0);

  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isUserInteractingRef = useRef(false);
  const isMomentumRef = useRef(false);

  const REAL_START = playlists.length > 1 ? 1 : 0;
  const REAL_END = playlists.length;

  const stopAutoScroll = () => {
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    autoTimerRef.current = null;
  };

  const startAutoScroll = () => {
    stopAutoScroll();
    if (playlists.length <= 1) return;

    autoTimerRef.current = setInterval(() => {
      if (isUserInteractingRef.current || isMomentumRef.current) return;

      const next = (selectedIndexRef.current + 1) % playlists.length;
      selectedIndexRef.current = next;
      setSelectedIndex(next);
      onPlaylistChange(playlists[next]);

      listRef.current?.scrollToOffset({
        offset: (next + 1) * ITEM_WIDTH,
        animated: true,
      });
    }, AUTO_SCROLL_MS);
  };

  useEffect(() => {
    if (!playlists.length) return;

    selectedIndexRef.current = 0;
    setSelectedIndex(0);
    onPlaylistChange(playlists[0]);

    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({
        offset: REAL_START * ITEM_WIDTH,
        animated: false,
      });
    });

    startAutoScroll();
    return stopAutoScroll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlists.length]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    isMomentumRef.current = false;
    isUserInteractingRef.current = false;

    const rawIndex = Math.round(e.nativeEvent.contentOffset.x / ITEM_WIDTH);

    if (rawIndex === 0) {
      listRef.current?.scrollToOffset({ offset: REAL_END * ITEM_WIDTH, animated: false });
      selectedIndexRef.current = playlists.length - 1;
    } else if (rawIndex === REAL_END + 1) {
      listRef.current?.scrollToOffset({ offset: REAL_START * ITEM_WIDTH, animated: false });
      selectedIndexRef.current = 0;
    } else {
      selectedIndexRef.current = rawIndex - 1;
    }

    setSelectedIndex(selectedIndexRef.current);
    onPlaylistChange(playlists[selectedIndexRef.current]);
    startAutoScroll();
  };

  return (
    <View>
      <FlatList
        ref={listRef}
        horizontal
        data={looped}
        keyExtractor={(item, idx) => `${item.id}-${idx}`}
        snapToInterval={ITEM_WIDTH}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{ paddingHorizontal: SIDE_PADDING }}
        getItemLayout={(_, index) => ({
          length: ITEM_WIDTH,
          offset: ITEM_WIDTH * index,
          index,
        })}
        onScrollBeginDrag={() => {
          isUserInteractingRef.current = true;
          isMomentumRef.current = true;
          stopAutoScroll();
        }}
        onMomentumScrollBegin={() => {
          isMomentumRef.current = true;
        }}
        onScrollEndDrag={() => {
          isUserInteractingRef.current = false;
        }}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item }) => (
          <View style={{ width: ITEM_WIDTH }}>
            <View style={{ borderRadius: 18, overflow: "hidden" }}>
              <Image
                source={item.cover}
                style={{ width: "100%", height: ITEM_WIDTH * 0.6 }}
              />
              <View style={{ padding: 14 }}>
                <Text style={{ fontSize: 18, fontWeight: "700" }}>
                  {item.title}
                </Text>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}
