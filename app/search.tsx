import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ItemSlot, PixelPanel, PixelText, ScreenHeader, SearchBox } from '@/components';
import { CategoryIcon, RedBannerIcon } from '@/icons';
import { geocodeSearch } from '@/nav';
import type { Place } from '@/nav/types';
import { savedPlaces } from '@/data/savedPlaces';
import { colors, spacing } from '@/theme';
import { play } from '@/sound/sounds';

/**
 * Search Destination — live geocoding (OSM Nominatim) rendered as an
 * inventory of discovered places.
 */
export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setSearching(false);
      setError(null);
      return;
    }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      try {
        const places = await geocodeSearch(q);
        setResults(places);
        setError(places.length === 0 ? 'No such place on any map…' : null);
      } catch {
        setError('The cartographers are unreachable. Check your connection.');
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  const goTo = (p: Place) => {
    play('map-scribble');
    router.push({
      pathname: '/map',
      params: { name: p.name, lat: String(p.location.lat), lon: String(p.location.lon) },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.charcoal }}>
      <ScreenHeader title="SEARCH DESTINATION" />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ maxWidth: 520, width: '100%', alignSelf: 'center' }}>
          <SearchBox
            value={query}
            onChangeText={setQuery}
            placeholder="WHERE TO, ADVENTURER?"
            autoFocus
          />

          {searching && (
            <PixelText
              variant="label"
              color={colors.textDim}
              style={{ marginTop: spacing.lg }}
              align="center"
            >
              Consulting cartographers…
            </PixelText>
          )}

          {error && !searching && (
            <PixelPanel texture="stone" style={{ marginTop: spacing.lg }}>
              <PixelText variant="bodySM" color={colors.dangerRed} align="center">
                {error}
              </PixelText>
            </PixelPanel>
          )}

          {/* Live results */}
          {results.length > 0 && (
            <PixelPanel texture="stone" padded={false} style={{ marginTop: spacing.lg }}>
              <View style={{ padding: spacing.sm }}>
                {results.map((p) => (
                  <ItemSlot
                    key={p.id}
                    icon={<RedBannerIcon size={40} />}
                    title={p.name}
                    subtitle={p.detail}
                    style={{ marginTop: spacing.xs }}
                    onPress={() => goTo(p)}
                  />
                ))}
              </View>
            </PixelPanel>
          )}

          {/* Quick access to saved places while the query is empty */}
          {query.trim().length < 3 && (
            <PixelPanel texture="dirt" padded={false} style={{ marginTop: spacing.lg }}>
              <View style={{ padding: spacing.sm }}>
                <PixelText variant="label" style={{ margin: spacing.sm }}>
                  FROM YOUR CHEST
                </PixelText>
                {savedPlaces.map((p) => (
                  <ItemSlot
                    key={p.id}
                    icon={<CategoryIcon category={p.category ?? 'star'} size={40} />}
                    title={p.name}
                    subtitle={p.detail}
                    style={{ marginTop: spacing.xs }}
                    onPress={() => goTo(p)}
                  />
                ))}
              </View>
            </PixelPanel>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
