import { BrandColors } from '@/constants/theme';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef as useMapRef, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

// ─── Types ────────────────────────────────────────────────────────────────────
type Store = {
  Id: string;
  Name: string;
  Address: string;
  Distance: string;
  Chain: StoreChain;
  Lat?: number;
  Lon?: number;
  Favorited: boolean;
};

type StoreSuggestion = {
  Name: string;
  Address: string;
  Chain: StoreChain;
  Lat: number;
  Lon: number;
  Miles: number;
};

type StoreChain = 'Walmart' | 'Target' | 'Trader Joes' | 'Aldi' | 'Whole Foods' | 'Other';

// ─── Chain config ─────────────────────────────────────────────────────────────
const CHAIN_CONFIG: Record<StoreChain, { Logo: string; Color: string; OSMKey: string }> = {
  'Walmart': { Logo: 'https://logo.clearbit.com/walmart.com', Color: '#0071ce', OSMKey: 'walmart' },
  'Target': { Logo: 'https://logo.clearbit.com/target.com', Color: '#cc0000', OSMKey: 'target' },
  'Trader Joes': { Logo: 'https://logo.clearbit.com/traderjoes.com', Color: '#b5432a', OSMKey: "trader joe's" },
  'Aldi': { Logo: 'https://logo.clearbit.com/aldi.us', Color: '#00539f', OSMKey: 'aldi' },
  'Whole Foods': { Logo: 'https://logo.clearbit.com/wholefoodsmarket.com', Color: '#00674b', OSMKey: 'whole foods' },
  'Other': { Logo: '', Color: BrandColors.midTeal, OSMKey: '' },
};

const SUPPORTED_CHAINS: StoreChain[] = ['Walmart', 'Target', 'Trader Joes', 'Aldi', 'Whole Foods'];
const INITIAL_STORES: Store[] = [];

// ─── Haversine distance (miles) ───────────────────────────────────────────────
function HaversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── In-memory cache ──────────────────────────────────────────────────────────
const SuggestionCache = new Map<string, { results: StoreSuggestion[]; ts: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Nominatim store search ───────────────────────────────────────────────────
async function FetchByNominatim(
  lat: number,
  lon: number,
  chainKey: string,
  radiusMiles: number = 25
): Promise<StoreSuggestion[]> {
  const cacheKey = `${chainKey}|${lat.toFixed(2)}|${lon.toFixed(2)}`;
  const cached = SuggestionCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.results;

  const chain =
    (Object.keys(CHAIN_CONFIG) as StoreChain[]).find(
      c => CHAIN_CONFIG[c].OSMKey.toLowerCase() === chainKey.toLowerCase()
    ) ?? 'Other';

  const delta = 0.4;
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?q=${encodeURIComponent(chainKey)}` +
    `&format=json&limit=20&countrycodes=us` +
    `&bounded=1` +
    `&viewbox=${lon - delta},${lat + delta},${lon + delta},${lat - delta}`;

  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'BudgetScout/1.0' },
  });
  const json = await res.json();

  const results = (json ?? [])
    .map((el: any) => {
      const elLat = parseFloat(el.lat);
      const elLon = parseFloat(el.lon);
      if (isNaN(elLat) || isNaN(elLon)) return null;
      const miles = HaversineMiles(lat, lon, elLat, elLon);
      if (miles > radiusMiles) return null;
      const parts = (el.display_name ?? '').split(',').map((s: string) => s.trim());
      const address = parts.slice(0, 4).join(', ');
      return {
        Name: el.name || chainKey,
        Address: address || 'Address unavailable',
        Chain: chain,
        Lat: elLat,
        Lon: elLon,
        Miles: miles,
      } as StoreSuggestion;
    })
    .filter((s: any): s is StoreSuggestion => s !== null)
    .sort((a: StoreSuggestion, b: StoreSuggestion) => a.Miles - b.Miles)
    .slice(0, 8);

  SuggestionCache.set(cacheKey, { results, ts: Date.now() });
  return results;
}

// ─── Geocode a typed address to coords via Nominatim ─────────────────────────
async function GeocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?q=${encodeURIComponent(address)}` +
    `&format=json&limit=1&countrycodes=us`;
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'BudgetScout/1.0' },
  });
  const json = await res.json();
  if (!json.length) return null;
  return { lat: parseFloat(json[0].lat), lon: parseFloat(json[0].lon) };
}

// ─── Store logo ───────────────────────────────────────────────────────────────
function StoreLogo({ Chain, Size = 36 }: { Chain: StoreChain; Size?: number }) {
  const config = CHAIN_CONFIG[Chain];
  const [HasError, SetErr] = useState(false);
  const boxSize = Size + 10;

  return (
    <View
      style={[
        styles.StoreIconWrap,
        {
          backgroundColor: config.Color + '18',
          width: boxSize,
          height: boxSize,
          borderRadius: boxSize * 0.28,
        },
      ]}
    >
      {config.Logo && !HasError ? (
        <Image
          source={{ uri: config.Logo }}
          style={{ width: Size, height: Size, borderRadius: Size * 0.2 }}
          resizeMode="contain"
          onError={() => SetErr(true)}
        />
      ) : (
        <Text style={{ fontSize: Size * 0.55, color: config.Color, fontWeight: '800' }}>{Chain[0]}</Text>
      )}
    </View>
  );
}

// ─── Store card ───────────────────────────────────────────────────────────────
function StoreCard({
  Store,
  OnRemove,
  OnToggleFav,
}: {
  Store: Store;
  OnRemove: (Id: string) => void;
  OnToggleFav: (Id: string) => void;
}) {
  return (
    <View style={[styles.StoreCard, Store.Favorited && styles.StoreCardFav]}>
      <StoreLogo Chain={Store.Chain} Size={36} />
      <View style={styles.StoreInfo}>
        <Text style={styles.StoreName}>{Store.Name}</Text>
        <Text style={styles.StoreAddress} numberOfLines={1}>
          {Store.Address}
        </Text>
        <Text style={styles.StoreDistance}>{Store.Distance}</Text>
      </View>
      <TouchableOpacity style={styles.FavBtn} onPress={() => OnToggleFav(Store.Id)} activeOpacity={0.8}>
        <Text style={[styles.FavIcon, Store.Favorited && styles.FavIconActive]}>★</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.RemoveBtn} onPress={() => OnRemove(Store.Id)} activeOpacity={0.8}>
        <Text style={styles.RemoveIcon}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function StoresScreen() {
  const [Stores, SetStores] = useState<Store[]>(INITIAL_STORES);
  const [Search, SetSearch] = useState('');
  const [ShowModal, SetShowModal] = useState(false);
  const [NewChain, SetNewChain] = useState<StoreChain>('Walmart');
  const [NewAddress, SetNewAddress] = useState('');
  const [UserCoords, SetUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [LocationDenied, SetLocationDenied] = useState(false);
  const [Suggestions, SetSuggestions] = useState<StoreSuggestion[]>([]);
  const [LoadingSuggest, SetLoadingSuggest] = useState(false);
  const [ShowManual, SetShowManual] = useState(false);
  const [SelectedStore, SetSelectedStore] = useState<Store | null>(null);
  const MapRef = useMapRef<MapView>(null);
  const SuggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    RequestLocation();
  }, []);

  async function RequestLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      SetUserCoords({ lat: loc.coords.latitude, lon: loc.coords.longitude });
      SetLocationDenied(false);
    } else {
      SetLocationDenied(true);
    }
  }

  // Fetch when modal opens or chain changes (no address typed)
  useEffect(() => {
    if (!ShowModal || !UserCoords || NewAddress.trim()) return;
    if (SuggestTimer.current) clearTimeout(SuggestTimer.current);
    SuggestTimer.current = setTimeout(async () => {
      SetLoadingSuggest(true);
      try {
        const results = await FetchByNominatim(UserCoords.lat, UserCoords.lon, CHAIN_CONFIG[NewChain].OSMKey);
        const deduped = results
          .map(s => ({ ...s, Miles: HaversineMiles(UserCoords.lat, UserCoords.lon, s.Lat, s.Lon) }))
          .sort((a, b) => a.Miles - b.Miles);
        SetSuggestions(deduped);
      } catch {
        SetSuggestions([]);
      } finally {
        SetLoadingSuggest(false);
      }
    }, 300);
  }, [NewChain, ShowModal, UserCoords]);

  // Live search as user types — geocode address then find chain near it
  useEffect(() => {
    if (!ShowModal || !UserCoords || !NewAddress.trim()) return;
    if (SuggestTimer.current) clearTimeout(SuggestTimer.current);
    SuggestTimer.current = setTimeout(async () => {
      SetLoadingSuggest(true);
      try {
        const geocoded = await GeocodeAddress(NewAddress.trim());
        const searchLat = geocoded?.lat ?? UserCoords.lat;
        const searchLon = geocoded?.lon ?? UserCoords.lon;
        const results = await FetchByNominatim(searchLat, searchLon, CHAIN_CONFIG[NewChain].OSMKey);
        const deduped = results
          .map(s => ({ ...s, Miles: HaversineMiles(UserCoords.lat, UserCoords.lon, s.Lat, s.Lon) }))
          .sort((a, b) => a.Miles - b.Miles);
        SetSuggestions(deduped);
      } catch {
        SetSuggestions([]);
      } finally {
        SetLoadingSuggest(false);
      }
    }, 600);
  }, [NewAddress, ShowModal, UserCoords, NewChain]);

  const FilteredSuggestions = Suggestions;

  const FilteredStores = Search.trim()
    ? Stores.filter(
        S =>
          S.Name.toLowerCase().includes(Search.toLowerCase()) ||
          S.Address.toLowerCase().includes(Search.toLowerCase())
      )
    : Stores;

  function HandleRemove(Id: string) {
    Alert.alert('Remove Store', 'Remove this store?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => SetStores(P => P.filter(S => S.Id !== Id)) },
    ]);
  }

  function HandleToggleFav(Id: string) {
    SetStores(P => {
      const Updated = P.map(S => (S.Id === Id ? { ...S, Favorited: !S.Favorited } : S));
      const Target = Updated.find(S => S.Id === Id);
      if (Target?.Lat && Target?.Lon && Target.Favorited) {
        MapRef.current?.animateToRegion(
          {
            latitude: Target.Lat,
            longitude: Target.Lon,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          },
          600
        );
        SetSelectedStore(Target);
      }
      return Updated;
    });
  }

  function HandleSelectSuggestion(S: StoreSuggestion) {
    const miles = UserCoords ? HaversineMiles(UserCoords.lat, UserCoords.lon, S.Lat, S.Lon) : S.Miles;
    SetStores(P => [
      ...P,
      {
        Id: Date.now().toString(),
        Name: S.Name,
        Address: S.Address,
        Distance: `${miles.toFixed(1)} mi`,
        Chain: S.Chain,
        Lat: S.Lat,
        Lon: S.Lon,
        Favorited: false,
      },
    ]);
    SetNewAddress('');
    SetNewChain('Walmart');
    SetSuggestions([]);
    SetShowManual(false);
    SetShowModal(false);
  }

  async function HandleAddManual() {
    if (!NewAddress.trim()) {
      Alert.alert('Missing Address', 'Please enter a store address.');
      return;
    }

    const id = Date.now().toString();
    const address = NewAddress.trim();
    SetStores(P => [
      ...P,
      {
        Id: id,
        Name: NewChain,
        Address: address,
        Distance: 'Calculating…',
        Chain: NewChain,
        Favorited: false,
      },
    ]);
    SetNewAddress('');
    SetNewChain('Walmart');
    SetShowModal(false);

    if (!UserCoords) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'BudgetScout/1.0' } }
      );
      const json = await res.json();
      if (json.length === 0) {
        SetStores(P => P.map(S => (S.Id === id ? { ...S, Distance: 'Distance unavailable' } : S)));
        return;
      }
      const lat = parseFloat(json[0].lat);
      const lon = parseFloat(json[0].lon);
      const miles = HaversineMiles(UserCoords.lat, UserCoords.lon, lat, lon);
      SetStores(P =>
        P.map(S => (S.Id === id ? { ...S, Distance: `${miles.toFixed(1)} mi`, Lat: lat, Lon: lon } : S))
      );
    } catch {
      SetStores(P => P.map(S => (S.Id === id ? { ...S, Distance: 'Distance unavailable' } : S)));
    }
  }

  const SortedStores = [
    ...FilteredStores.filter(S => S.Favorited),
    ...FilteredStores.filter(S => !S.Favorited),
  ];

  return (
    <View style={styles.Container}>
      <StatusBar style="light" />

      {/* ── Header ── */}
      <View style={styles.TopSection}>
        <Text style={styles.HeaderTitle}>My Store</Text>
      </View>

      {/* ── Map ── */}
      <View style={styles.MapSection}>
        <MapView
          ref={MapRef}
          style={styles.Map}
          provider={PROVIDER_DEFAULT}
          initialRegion={{
            latitude: UserCoords?.lat ?? 42.7284,
            longitude: UserCoords?.lon ?? -73.6918,
            latitudeDelta: 0.12,
            longitudeDelta: 0.12,
          }}
          showsUserLocation
          showsMyLocationButton
        >
          {Stores
            .filter(S => S.Lat && S.Lon)
            .map(S => (
              <Marker
                key={S.Id}
                coordinate={{ latitude: S.Lat!, longitude: S.Lon! }}
                title={S.Name}
                description={S.Address}
                pinColor={S.Favorited ? BrandColors.gold : CHAIN_CONFIG[S.Chain].Color}
                onPress={() => SetSelectedStore(S === SelectedStore ? null : S)}
              />
            ))}
        </MapView>

        {SelectedStore && (
          <View style={styles.MapCallout}>
            <View style={[styles.MapCalloutInner, SelectedStore.Favorited && styles.MapCalloutFav]}>
              <StoreLogo Chain={SelectedStore.Chain} Size={28} />
              <View style={styles.MapCalloutInfo}>
                <Text style={styles.MapCalloutName}>{SelectedStore.Name}</Text>
                <Text style={styles.MapCalloutAddr} numberOfLines={1}>
                  {SelectedStore.Address}
                </Text>
                <Text style={styles.MapCalloutDist}>{SelectedStore.Distance}</Text>
              </View>
              {SelectedStore.Favorited && <Text style={styles.MapCalloutStar}>★</Text>}
              <TouchableOpacity onPress={() => SetSelectedStore(null)} style={styles.MapCalloutClose}>
                <Text style={styles.MapCalloutCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {Stores.length === 0 && (
          <View style={styles.MapEmptyOverlay}>
            <Text style={styles.MapEmptyText}>Add stores to see them on the map</Text>
          </View>
        )}
      </View>

      {/* ── List ── */}
      <View style={styles.ListSection}>
        {SortedStores.length === 0 ? (
          <View style={styles.EmptyState}>
            <Text style={styles.EmptyTitle}>{Search ? 'No stores found' : 'No stores added yet'}</Text>
            <Text style={styles.EmptySub}>{Search ? 'Try a different search.' : 'Tap + to add your first store.'}</Text>
          </View>
        ) : (
          <FlatList
            data={SortedStores}
            keyExtractor={S => S.Id}
            contentContainerStyle={styles.ListContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => {
              const Favs = SortedStores.filter(S => S.Favorited);
              const ShowFavHeader = item.Favorited && index === 0 && Favs.length > 0;
              const ShowAllHeader = !item.Favorited && index === Favs.length && Favs.length > 0;
              return (
                <>
                  {ShowFavHeader && <Text style={styles.SectionLabel}>FAVORITES</Text>}
                  {ShowAllHeader && <Text style={styles.SectionLabel}>ALL STORES</Text>}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      if (item.Lat && item.Lon) {
                        MapRef.current?.animateToRegion(
                          {
                            latitude: item.Lat,
                            longitude: item.Lon,
                            latitudeDelta: 0.05,
                            longitudeDelta: 0.05,
                          },
                          500
                        );
                        SetSelectedStore(item);
                      }
                    }}
                  >
                    <StoreCard Store={item} OnRemove={HandleRemove} OnToggleFav={HandleToggleFav} />
                  </TouchableOpacity>
                </>
              );
            }}
          />
        )}
      </View>




{/* ── Bottom bar ── */}
      <View style={styles.BottomBar}>
        <View style={styles.SearchBar}>
          <Image source={require('@/assets/images/search.png')} style={styles.SearchIconImg} />
          <TextInput
            style={styles.SearchInput}
            placeholder="Search stores…"
            placeholderTextColor={BrandColors.muted}
            value={Search}
            onChangeText={SetSearch}
            autoCorrect={false}
          />
          {Search.length > 0 && (
            <TouchableOpacity onPress={() => SetSearch('')}>
              <Text style={styles.SearchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.FAB} onPress={() => SetShowModal(true)} activeOpacity={0.88}>
          <Text style={styles.FABIcon}>+</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={ShowModal} transparent animationType="slide" onRequestClose={() => SetShowModal(false)}>
        <KeyboardAvoidingView style={styles.ModalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => SetShowModal(false)} activeOpacity={1} />
          <View style={styles.ModalSheet}>
            <ScrollView
              contentContainerStyle={styles.ModalSheetScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.ModalHandle} />
              <Text style={styles.ModalTitle}>Add a Store</Text>

              {LocationDenied && (
                <TouchableOpacity style={styles.ModalLocationNote} onPress={() => Linking.openSettings()}>
                  <Text style={styles.ModalLocationNoteText}>
                    Location is off — enable it in Settings for auto-suggestions, or type an address manually below
                  </Text>
                </TouchableOpacity>
              )}

              <Text style={styles.ModalLabel}>STORE CHAIN</Text>
              <View style={styles.ChainGrid}>
                {SUPPORTED_CHAINS.map(Chain => (
                  <TouchableOpacity
                    key={Chain}
                    style={[styles.ChainOption, NewChain === Chain && styles.ChainOptionActive]}
                    onPress={() => SetNewChain(Chain)}
                    activeOpacity={0.8}
                  >
                    <StoreLogo Chain={Chain} Size={16} />
                    <Text style={[styles.ChainOptionText, NewChain === Chain && styles.ChainOptionTextActive]}>
                      {Chain}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {LoadingSuggest && (
                <View style={styles.SuggestLoading}>
                  <ActivityIndicator size="small" color={BrandColors.midGreen} />
                  <Text style={styles.SuggestLoadingText}>Finding nearby {NewChain} stores…</Text>
                </View>
              )}

              {!LoadingSuggest && FilteredSuggestions.length > 0 && (
                <View style={styles.SuggestList}>
                  <Text style={styles.SuggestHeader}>
                    {FilteredSuggestions.length} store{FilteredSuggestions.length !== 1 ? 's' : ''} nearby
                  </Text>
                  {FilteredSuggestions.map((S, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.SuggestItem}
                      onPress={() => HandleSelectSuggestion(S)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.SuggestItemLeft}>
                        <Text style={styles.SuggestItemName}>{S.Name}</Text>
                        <Text style={styles.SuggestItemAddr} numberOfLines={1}>
                          {S.Address}
                        </Text>
                      </View>
                      <Text style={styles.SuggestItemDist}>
                        {UserCoords
                          ? HaversineMiles(UserCoords.lat, UserCoords.lon, S.Lat, S.Lon).toFixed(1)
                          : S.Miles.toFixed(1)}{' '}
                        mi
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {!LoadingSuggest && UserCoords && Suggestions.length === 0 && (
                <Text style={styles.SuggestNone}>No {NewChain} stores found within 25 miles</Text>
              )}

              <TouchableOpacity style={styles.ManualToggle} onPress={() => SetShowManual(P => !P)} activeOpacity={0.8}>
                <Text style={styles.ManualToggleText}>
                  {ShowManual ? 'Hide manual entry' : "Don't see your store? Enter address manually"}
                </Text>
              </TouchableOpacity>

              {ShowManual && (
                <View style={styles.ManualInputWrap}>
                  <TextInput
                    style={styles.ModalInput}
                    placeholder="e.g. 123 Main St, Troy NY"
                    placeholderTextColor={BrandColors.muted}
                    value={NewAddress}
                    onChangeText={SetNewAddress}
                    autoCorrect={false}
                    autoFocus
                  />
                  <View style={styles.ModalBtns}>
                    <TouchableOpacity style={styles.ModalBtnSecondary} onPress={() => SetShowModal(false)} activeOpacity={0.85}>
                      <Text style={styles.ModalBtnSecondaryText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.ModalBtnPrimary} onPress={HandleAddManual} activeOpacity={0.85}>
                      <Text style={styles.ModalBtnPrimaryText}>Add Manually</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  Container: { flex: 1, backgroundColor: '#ffffff' },

  TopSection: {
    paddingTop: 80,
    paddingHorizontal: 16,
    paddingBottom: 20,
    backgroundColor: BrandColors.deepTeal,
  },
  HeaderTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: BrandColors.white,
    letterSpacing: 0.3,
  },

  LocationBanner: {
    marginHorizontal: 24,
    marginBottom: 10,
    backgroundColor: '#fff8e1',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffe082',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  LocationBannerText: { fontSize: 12, color: '#795548', fontWeight: '600' },

  SearchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.white,
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 4,
  },
  SearchIconImg:   { width: 85, height: 35, resizeMode: 'contain', marginLeft: -30 },
  SearchInput: { flex: 1, fontSize: 15, color: BrandColors.darkText, marginLeft: -25 },
  SearchClear: { fontSize: 13, color: BrandColors.muted, fontWeight: '700' },

  ChainsStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 6,
    alignItems: 'center',
  },
  ChainsLabel: { fontSize: 11, fontWeight: '700', color: BrandColors.muted, letterSpacing: 0.3 },
  ChainPill: {
    backgroundColor: BrandColors.paleGreen,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: BrandColors.mintTeal,
  },
  ChainPillText: { fontSize: 11, fontWeight: '600', color: BrandColors.deepTeal },

  ListContent: { paddingHorizontal: 16, paddingBottom: 80, gap: 8 },

  StoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.offWhite,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: BrandColors.mintTeal,
    padding: 14,
    gap: 12,
  },
  StoreIconWrap: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  StoreInfo: { flex: 1, gap: 2 },
  StoreName: { fontSize: 15, fontWeight: '700', color: BrandColors.darkText },
  StoreAddress: { fontSize: 12, color: BrandColors.muted },
  StoreDistance: { fontSize: 11, color: BrandColors.midTeal, fontWeight: '600', marginTop: 2 },
  RemoveBtn: {
    width: 28,
    height: 28,
    borderRadius: 30,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  RemoveIcon: { fontSize: 11, color: '#ef5350', fontWeight: '700' },
  FavBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  FavIcon: { fontSize: 22, color: BrandColors.mintTeal },
  FavIconActive: { color: BrandColors.gold },
  StoreCardFav: { borderColor: BrandColors.lightGold, backgroundColor: BrandColors.paleGold },
  SectionWrap: { gap: 8, marginBottom: 8 },
  SectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.muted,
    letterSpacing: 0.8,
    paddingHorizontal: 4,
    paddingVertical: 4,
    marginTop: 4,
  },

  EmptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 80 },
  EmptyTitle: { fontSize: 18, fontWeight: '800', color: BrandColors.deepTeal },
  EmptySub: { fontSize: 14, color: BrandColors.muted, textAlign: 'center', paddingHorizontal: 40 },

  MapSection: { height: 240, marginBottom: 12 },
  MapBorderWrap: { flex: 1 },
  Map: { flex: 1 },
  MapCallout: { position: 'absolute', bottom: 12, left: 12, right: 12 },
  MapCalloutInner: {
    backgroundColor: BrandColors.white,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  MapCalloutFav: { borderWidth: 1.5, borderColor: BrandColors.lightGold, backgroundColor: BrandColors.paleGold },
  MapCalloutInfo: { flex: 1 },
  MapCalloutName: { fontSize: 14, fontWeight: '700', color: BrandColors.darkText },
  MapCalloutAddr: { fontSize: 11, color: BrandColors.muted, marginTop: 1 },
  MapCalloutDist: { fontSize: 11, color: BrandColors.midTeal, fontWeight: '600', marginTop: 1 },
  MapCalloutStar: { fontSize: 18, color: BrandColors.gold },
  MapCalloutClose: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: BrandColors.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  MapCalloutCloseText: { fontSize: 11, color: BrandColors.muted, fontWeight: '700' },
  MapEmptyOverlay: {
    position: 'absolute',
    top: '40%',
    left: 24,
    right: 24,
    backgroundColor: BrandColors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  MapEmptyText: { fontSize: 13, color: BrandColors.muted, textAlign: 'center' },

  ListSection: { flex: 1, backgroundColor: BrandColors.white, minHeight: 200 },

  BottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 10,
    gap: 10,
    backgroundColor: BrandColors.white,
  },
  FAB: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: BrandColors.midTeal,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    shadowColor: BrandColors.midTeal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  FABIcon: { fontSize: 28, color: BrandColors.white, fontWeight: '300', marginTop: -2 },

  ModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  ModalSheet: {
    backgroundColor: BrandColors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 44,
    maxHeight: '92%',
  },
  ModalSheetScroll: { padding: 24 },
  ModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#d4ead6',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  ModalTitle: { fontSize: 20, fontWeight: '800', color: BrandColors.deepTeal, marginBottom: 16 },
  ModalLabel: { fontSize: 11, fontWeight: '700', color: BrandColors.muted, letterSpacing: 0.8, marginBottom: 10 },

  ModalLocationNote: {
    backgroundColor: '#fff8e1',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffe082',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  ModalLocationNoteText: { fontSize: 12, color: '#795548', fontWeight: '500' },

  ChainGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  ChainOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: BrandColors.paleGreen,
    borderWidth: 1.5,
    borderColor: BrandColors.mintTeal,
  },
  ChainOptionActive: { backgroundColor: BrandColors.deepTeal, borderColor: BrandColors.deepTeal },
  ChainOptionText: { fontSize: 13, fontWeight: '600', color: BrandColors.muted },
  ChainOptionTextActive: { color: BrandColors.white },

  ModalInput: {
    backgroundColor: BrandColors.offWhite,
    borderWidth: 1.5,
    borderColor: BrandColors.mintTeal,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: BrandColors.darkText,
    marginBottom: 14,
  },

  SuggestLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  SuggestLoadingText: { fontSize: 13, color: BrandColors.muted },
  SuggestList: {
    borderWidth: 1.5,
    borderColor: BrandColors.mintTeal,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  SuggestHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.muted,
    letterSpacing: 0.5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: BrandColors.offWhite,
  },
  SuggestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#d4ead6',
  },
  SuggestItemLeft: { flex: 1, marginRight: 8 },
  SuggestItemName: { fontSize: 14, fontWeight: '700', color: BrandColors.darkText },
  SuggestItemAddr: { fontSize: 12, color: BrandColors.muted, marginTop: 2 },
  SuggestItemDist: { fontSize: 13, fontWeight: '700', color: BrandColors.midTeal },
  SuggestNone: { fontSize: 13, color: BrandColors.muted, marginBottom: 16, textAlign: 'center' },

  ModalBtns: { flexDirection: 'row', gap: 12, marginTop: 4 },
  ModalBtnSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: BrandColors.paleGreen,
    borderWidth: 1.5,
    borderColor: BrandColors.mintTeal,
  },
  ModalBtnSecondaryText: { color: BrandColors.deepTeal, fontWeight: '700', fontSize: 15 },
  ModalBtnPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: BrandColors.midTeal,
    shadowColor: BrandColors.midTeal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ModalBtnPrimaryText: { color: BrandColors.white, fontWeight: '700', fontSize: 15 },

  ManualToggle: { paddingVertical: 16, alignItems: 'center' },
  ManualToggleText: {
    fontSize: 13,
    color: BrandColors.midTeal,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  ManualInputWrap: { marginTop: 4, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e8f5e9' },
});
