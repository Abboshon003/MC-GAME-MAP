import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, View } from 'react-native';
import { ItemSlot, PixelPanel, PixelText, SearchBox } from '@/components';
import { CategoryIcon, RedBannerIcon } from '@/icons';
import { formatDistance, geocodeSearch } from '@/nav';
import type { LatLng, Place } from '@/nav/types';
import { savedPlaces } from '@/data/savedPlaces';
import { colors, spacing } from '@/theme';

/**
 * Top-of-map search bar that expands into a proximity-sorted results list.
 * Results nearest the user come first (see geocodeSearch). Selecting a place
 * hands it to the map to route toward.
 */
export function SearchOverlay({
  near,
  onSelect,
}: {
  near: LatLng | null;
  onSelect: (place: Place) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);
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
        const places = await geocodeSearch(q, near ?? undefined);
        setResults(places);
        setError(places.length === 0 ? 'No such place on any map…' : null);
      } catch {
        setError('The cartographers are unreachable.');
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query, near?.lat, near?.lon]);

  const pick = (p: Place) => {
    setQuery(p.name);
    setFocused(false);
    setResults([]);
    Keyboard.dismiss();
    onSelect(p);
  };

  const showDropdown = focused && (results.length > 0 || searching || error || query.trim().length < 3);

  return (
    <View>
      <SearchBox
        value={query}
        onChangeText={setQuery}
        onFocus={() => setFocused(true)}
        placeholder="WHERE TO, ADVENTURER?"
      />

      {showDropdown && (
        <PixelPanel texture="stone" padded={false} style={{ marginTop: spacing.sm }}>
          <View style={{ padding: spacing.sm }}>
            {searching && (
              <PixelText variant="label" color={colors.textDim} align="center" style={{ padding: spacing.sm }}>
                Consulting cartographers…
              </PixelText>
            )}
            {error && !searching && (
              <PixelText variant="bodySM" color={colors.dangerRed} align="center" style={{ padding: spacing.sm }}>
                {error}
              </PixelText>
            )}
            {results.map((p) => (
              <ItemSlot
                key={p.id}
                icon={<RedBannerIcon size={38} />}
                title={p.name}
                subtitle={
                  (p.distanceMeters != null ? `${formatDistance(p.distanceMeters)} · ` : '') + (p.detail ?? '')
                }
                style={{ marginTop: spacing.xs }}
                onPress={() => pick(p)}
              />
            ))}
            {query.trim().length < 3 &&
              savedPlaces.map((p) => (
                <ItemSlot
                  key={p.id}
                  icon={<CategoryIcon category={p.category ?? 'star'} size={38} />}
                  title={p.name}
                  subtitle={p.detail}
                  style={{ marginTop: spacing.xs }}
                  onPress={() => pick(p)}
                />
              ))}
          </View>
        </PixelPanel>
      )}
    </View>
  );
}
