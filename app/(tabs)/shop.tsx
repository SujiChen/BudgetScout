import { BrandColors } from '@/constants/theme';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
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
  View,
} from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────
type Store = {
  Id:       string;
  Name:     string;
  Address:  string;
  Distance: string;
  Chain:    StoreChain;
  Lat?:     number;
  Lon?:     number;
};

type StoreSuggestion = {
  Name:    string;
  Address: string;
  Chain:   StoreChain;
  Lat:     number;
  Lon:     number;
  Miles:   number;
};

type StoreChain = 'Walmart' | 'Target' | 'Trader Joes' | 'Aldi' | 'Whole Foods' | 'Other';

// ─── Chain config ─────────────────────────────────────────────────────────────
const CHAIN_CONFIG: Record<StoreChain, { Logo: string; Color: string; OSMKey: string }> = {
  'Walmart':     { Logo: 'https://logo.clearbit.com/walmart.com',             Color: '#0071ce', OSMKey: 'walmart'      },
  'Target':      { Logo: 'https://logo.clearbit.com/target.com',              Color: '#cc0000', OSMKey: 'target'       },
  'Trader Joes': { Logo: 'https://logo.clearbit.com/traderjoes.com',          Color: '#b5432a', OSMKey: "trader joe's" },
  'Aldi':        { Logo: 'https://logo.clearbit.com/aldi.us',                 Color: '#00539f', OSMKey: 'aldi'         },
  'Whole Foods': { Logo: 'https://logo.clearbit.com/wholefoodsmarket.com',    Color: '#00674b', OSMKey: 'whole foods'  },
  'Other':       { Logo: '',                                                   Color: BrandColors.midGreen, OSMKey: '' },
};

const SUPPORTED_CHAINS: StoreChain[] = ['Walmart', 'Target', 'Trader Joes', 'Aldi', 'Whole Foods'];

const INITIAL_STORES: Store[] = [];

// ───  distance (miles) ───────────────────────────────────────────────
function HaversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R    = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── In-memory cache ──────────────────────────────────────────────────────────
const SuggestionCache = new Map<string, { results: StoreSuggestion[]; ts: number }>();
const CACHE_TTL_MS    = 5 * 60 * 1000; // 5 minutes

// ─── Nominatim store search ───────────────────────────────────────────────────
async function FetchByNominatim(
  lat: number,
  lon: number,
  chainKey: string,
  radiusMiles: number = 25
): Promise<StoreSuggestion[]> {
  const cacheKey = `${chainKey}|${lat.toFixed(2)}|${lon.toFixed(2)}`;
  const cached   = SuggestionCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.results;

  const chain = (Object.keys(CHAIN_CONFIG) as StoreChain[]).find(
    c => CHAIN_CONFIG[c].OSMKey.toLowerCase() === chainKey.toLowerCase()
  ) ?? 'Other';

  const delta = 0.4;
  const url   = `https://nominatim.openstreetmap.org/search`
    + `?q=${encodeURIComponent(chainKey)}`
    + `&format=json&limit=20&countrycodes=us`
    + `&bounded=1`
    + `&viewbox=${lon - delta},${lat + delta},${lon + delta},${lat - delta}`;

  const res  = await fetch(url, {
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
      const parts   = (el.display_name ?? '').split(',').map((s: string) => s.trim());
      const address = parts.slice(0, 4).join(', ');
      return { Name: el.name || chainKey, Address: address || 'Address unavailable', Chain: chain, Lat: elLat, Lon: elLon, Miles: miles } as StoreSuggestion;
    })
    .filter((s: any): s is StoreSuggestion => s !== null)
    .sort((a: StoreSuggestion, b: StoreSuggestion) => a.Miles - b.Miles)
    .slice(0, 8);

  SuggestionCache.set(cacheKey, { results, ts: Date.now() });
  return results;
}

// ─── Geocode a typed address to coords via Nominatim ─────────────────────────
async function GeocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search`
    + `?q=${encodeURIComponent(address)}`
    + `&format=json&limit=1&countrycodes=us`;
  const res  = await fetch(url, {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'BudgetScout/1.0' },
  });
  const json = await res.json();
  if (!json.length) return null;
  return { lat: parseFloat(json[0].lat), lon: parseFloat(json[0].lon) };
}

// ─── Store logo ───────────────────────────────────────────────────────────────
function StoreLogo({ Chain, Size = 36 }: { Chain: StoreChain; Size?: number }) {
  const config              = CHAIN_CONFIG[Chain];
  const [HasError, SetErr]  = useState(false);
  const boxSize             = Size + 10;

  return (
    <View style={[styles.StoreIconWrap, { backgroundColor: config.Color + '18', width: boxSize, height: boxSize, borderRadius: boxSize * 0.28 }]}>
      {config.Logo && !HasError
        ? <Image source={{ uri: config.Logo }} style={{ width: Size, height: Size, borderRadius: Size * 0.2 }} resizeMode="contain" onError={() => SetErr(true)} />
        : <Text style={{ fontSize: Size * 0.55, color: config.Color, fontWeight: '800' }}>{Chain[0]}</Text>
      }
    </View>
  );
}

// ─── Store card ───────────────────────────────────────────────────────────────
function StoreCard({ Store, OnRemove }: { Store: Store; OnRemove: (Id: string) => void }) {
  return (
    <View style={styles.StoreCard}>
      <StoreLogo Chain={Store.Chain} Size={36} />
      <View style={styles.StoreInfo}>
        <Text style={styles.StoreName}>{Store.Name}</Text>
        <Text style={styles.StoreAddress} numberOfLines={1}>{Store.Address}</Text>
        <Text style={styles.StoreDistance}>{Store.Distance}</Text>
      </View>
      <TouchableOpacity style={styles.RemoveBtn} onPress={() => OnRemove(Store.Id)} activeOpacity={0.8}>
        <Text style={styles.RemoveIcon}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function StoresScreen() {
  const [Stores, SetStores]                   = useState<Store[]>(INITIAL_STORES);
  const [Search, SetSearch]                   = useState('');
  const [ShowModal, SetShowModal]             = useState(false);
  const [NewChain, SetNewChain]               = useState<StoreChain>('Walmart');
  const [NewAddress, SetNewAddress]           = useState('');
  const [UserCoords, SetUserCoords]           = useState<{ lat: number; lon: number } | null>(null);
  const [LocationDenied, SetLocationDenied]   = useState(false);
  const [Suggestions, SetSuggestions]         = useState<StoreSuggestion[]>([]);
  const [LoadingSuggest, SetLoadingSuggest]   = useState(false);
  const [ShowManual, SetShowManual]           = useState(false);
  const SuggestTimer                          = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { RequestLocation(); }, []);

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
      } catch { SetSuggestions([]); }
      finally  { SetLoadingSuggest(false); }
    }, 300);
  }, [NewChain, ShowModal, UserCoords]);

  // Live search as user types — geocode address then find chain near it
  useEffect(() => {
    if (!ShowModal || !UserCoords || !NewAddress.trim()) return;
    if (SuggestTimer.current) clearTimeout(SuggestTimer.current);
    SuggestTimer.current = setTimeout(async () => {
      SetLoadingSuggest(true);
      try {
        const geocoded  = await GeocodeAddress(NewAddress.trim());
        const searchLat = geocoded?.lat ?? UserCoords.lat;
        const searchLon = geocoded?.lon ?? UserCoords.lon;
        const results   = await FetchByNominatim(searchLat, searchLon, CHAIN_CONFIG[NewChain].OSMKey);
        const deduped   = results
          .map(s => ({ ...s, Miles: HaversineMiles(UserCoords.lat, UserCoords.lon, s.Lat, s.Lon) }))
          .sort((a, b) => a.Miles - b.Miles);
        SetSuggestions(deduped);
      } catch { SetSuggestions([]); }
      finally  { SetLoadingSuggest(false); }
    }, 600);
  }, [NewAddress]);

  const FilteredSuggestions = Suggestions;

  const FilteredStores = Search.trim()
    ? Stores.filter(S =>
        S.Name.toLowerCase().includes(Search.toLowerCase()) ||
        S.Address.toLowerCase().includes(Search.toLowerCase())
      )
    : Stores;

  function HandleRemove(Id: string) {
    Alert.alert('Remove Store', 'Remove this store from your favorites?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => SetStores(P => P.filter(S => S.Id !== Id)) },
    ]);
  }

  function HandleSelectSuggestion(S: StoreSuggestion) {
    // Always recalculate distance from user's actual GPS at time of adding
    const miles = UserCoords
      ? HaversineMiles(UserCoords.lat, UserCoords.lon, S.Lat, S.Lon)
      : S.Miles;
    SetStores(P => [...P, {
      Id: Date.now().toString(),
      Name: S.Name, Address: S.Address,
      Distance: `${miles.toFixed(1)} mi`,
      Chain: S.Chain, Lat: S.Lat, Lon: S.Lon,
    }]);
    SetNewAddress(''); SetNewChain('Walmart'); SetSuggestions([]); SetShowManual(false); SetShowModal(false);
  }

  async function HandleAddManual() {
    if (!NewAddress.trim()) { Alert.alert('Missing Address', 'Please enter a store address.'); return; }

    // Close modal immediately so user isn't waiting
    const id      = Date.now().toString();
    const address = NewAddress.trim();
    SetStores(P => [...P, {
      Id: id, Name: NewChain, Address: address,
      Distance: 'Calculating…', Chain: NewChain,
    }]);
    SetNewAddress(''); SetNewChain('Walmart'); SetShowModal(false);

    // Geocode the address with Nominatim (free) then compute haversine distance
    if (!UserCoords) return;
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'BudgetScout/1.0' } }
      );
      const json = await res.json();
      if (json.length === 0) {
        SetStores(P => P.map(S => S.Id === id ? { ...S, Distance: 'Distance unavailable' } : S));
        return;
      }
      const lat   = parseFloat(json[0].lat);
      const lon   = parseFloat(json[0].lon);
      const miles = HaversineMiles(UserCoords.lat, UserCoords.lon, lat, lon);
      SetStores(P => P.map(S =>
        S.Id === id ? { ...S, Distance: `${miles.toFixed(1)} mi`, Lat: lat, Lon: lon } : S
      ));
    } catch {
      SetStores(P => P.map(S => S.Id === id ? { ...S, Distance: 'Distance unavailable' } : S));
    }
  }

  return (
    <View style={styles.Container}>
      <StatusBar style="dark" />

      <View style={styles.Header}>
        <Text style={styles.HeaderTitle}>Stores</Text>
        <Text style={styles.HeaderSub}>{Stores.length} favorite store{Stores.length !== 1 ? 's' : ''}</Text>
      </View>

      {LocationDenied && (
        <TouchableOpacity style={styles.LocationBanner} onPress={() => Linking.openSettings()} activeOpacity={0.85}>
          <Text style={styles.LocationBannerText}>Location off — tap to enable for nearby store suggestions</Text>
        </TouchableOpacity>
      )}

      <View style={styles.SearchBar}>
        <TextInput
          style={styles.SearchInput}
          placeholder="Search stores or addresses…"
          placeholderTextColor={BrandColors.muted}
          value={Search}
          onChangeText={SetSearch}
          autoCorrect={false}
        />
        {Search.length > 0 && <TouchableOpacity onPress={() => SetSearch('')}><Text style={styles.SearchClear}>✕</Text></TouchableOpacity>}
      </View>

      <View style={styles.ChainsStrip}>
        <Text style={styles.ChainsLabel}>Supported:</Text>
        {SUPPORTED_CHAINS.map(Chain => (
          <View key={Chain} style={styles.ChainPill}>
            <Text style={styles.ChainPillText}>{Chain}</Text>
          </View>
        ))}
      </View>

      {FilteredStores.length === 0
        ? (
          <View style={styles.EmptyState}>
                    <Text style={styles.EmptyTitle}>{Search ? 'No stores found' : 'No stores added yet'}</Text>
            <Text style={styles.EmptySub}>{Search ? 'Try a different search.' : 'Tap + to add your favorite store.'}</Text>
          </View>
        )
        : (
          <FlatList
            data={FilteredStores}
            keyExtractor={S => S.Id}
            contentContainerStyle={styles.ListContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => <StoreCard Store={item} OnRemove={HandleRemove} />}
          />
        )
      }

      <TouchableOpacity style={styles.FAB} onPress={() => SetShowModal(true)} activeOpacity={0.88}>
        <Text style={styles.FABIcon}>+</Text>
      </TouchableOpacity>

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
                  <Text style={[styles.ChainOptionText, NewChain === Chain && styles.ChainOptionTextActive]}>{Chain}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Suggestions — shown first and prominently */}
            {LoadingSuggest && (
              <View style={styles.SuggestLoading}>
                <ActivityIndicator size="small" color={BrandColors.midGreen} />
                <Text style={styles.SuggestLoadingText}>Finding nearby {NewChain} stores…</Text>
              </View>
            )}

            {!LoadingSuggest && FilteredSuggestions.length > 0 && (
              <View style={styles.SuggestList}>
                <Text style={styles.SuggestHeader}>
                  {FilteredSuggestions.length} store{FilteredSuggestions.length !== 1 ? 's' : ''} nearby — tap to add instantly
                </Text>
                {FilteredSuggestions.map((S, i) => (
                  <TouchableOpacity key={i} style={styles.SuggestItem} onPress={() => HandleSelectSuggestion(S)} activeOpacity={0.8}>
                    <View style={styles.SuggestItemLeft}>
                      <Text style={styles.SuggestItemName}>{S.Name}</Text>
                      <Text style={styles.SuggestItemAddr} numberOfLines={1}>{S.Address}</Text>
                    </View>
                    <Text style={styles.SuggestItemDist}>
                      {UserCoords ? HaversineMiles(UserCoords.lat, UserCoords.lon, S.Lat, S.Lon).toFixed(1) : S.Miles.toFixed(1)} mi
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {!LoadingSuggest && UserCoords && Suggestions.length === 0 && (
              <Text style={styles.SuggestNone}>No {NewChain} stores found within 25 miles</Text>
            )}

            {/* Manual entry — de-emphasised, collapsed behind a toggle */}
            <TouchableOpacity
              style={styles.ManualToggle}
              onPress={() => SetShowManual(P => !P)}
              activeOpacity={0.8}
            >
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
  Container:       { flex: 1, backgroundColor: '#ffffff' },
  Header:          { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 12 },
  HeaderTitle:     { fontSize: 30, fontWeight: '800', color: BrandColors.deepGreen, letterSpacing: 0.3 },
  HeaderSub:       { fontSize: 13, color: BrandColors.muted, marginTop: 2 },

  LocationBanner:  { marginHorizontal: 24, marginBottom: 10, backgroundColor: '#fff8e1', borderRadius: 12, borderWidth: 1, borderColor: '#ffe082', paddingHorizontal: 14, paddingVertical: 10 },
  LocationBannerText: { fontSize: 12, color: '#795548', fontWeight: '600' },

  SearchBar:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f7fbf7', borderWidth: 1.5, borderColor: '#d4ead6', borderRadius: 14, marginHorizontal: 24, marginBottom: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  SearchInput:     { flex: 1, fontSize: 15, color: BrandColors.darkText },
  SearchClear:     { fontSize: 13, color: BrandColors.muted, fontWeight: '700' },

  ChainsStrip:     { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 24, marginBottom: 16, gap: 6, alignItems: 'center' },
  ChainsLabel:     { fontSize: 11, fontWeight: '700', color: BrandColors.muted, letterSpacing: 0.3 },
  ChainPill:       { backgroundColor: '#f0f7f0', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#d4ead6' },
  ChainPillText:   { fontSize: 11, fontWeight: '600', color: BrandColors.deepGreen },

  ListContent:     { paddingHorizontal: 24, paddingBottom: 100, gap: 10 },

  StoreCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f7fbf7', borderRadius: 16, borderWidth: 1.5, borderColor: '#d4ead6', padding: 14, gap: 12 },
  StoreIconWrap:   { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  StoreInfo:       { flex: 1, gap: 2 },
  StoreName:       { fontSize: 15, fontWeight: '700', color: BrandColors.darkText },
  StoreAddress:    { fontSize: 12, color: BrandColors.muted },
  StoreDistance:   { fontSize: 11, color: BrandColors.midGreen, fontWeight: '600', marginTop: 2 },
  RemoveBtn:       { width: 28, height: 28, borderRadius: 8, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  RemoveIcon:      { fontSize: 11, color: '#ef5350', fontWeight: '700' },

  EmptyState:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 80 },
  EmptyTitle:      { fontSize: 18, fontWeight: '800', color: BrandColors.deepGreen },
  EmptySub:        { fontSize: 14, color: BrandColors.muted, textAlign: 'center', paddingHorizontal: 40 },

  FAB:             { position: 'absolute', bottom: 32, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: BrandColors.midGreen, alignItems: 'center', justifyContent: 'center', shadowColor: BrandColors.midGreen, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  FABIcon:         { fontSize: 28, color: BrandColors.white, fontWeight: '300', marginTop: -2 },

  ModalOverlay:    { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  ModalSheet:      { backgroundColor: BrandColors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 44, maxHeight: '92%' },
  ModalSheetScroll:{ padding: 24 },
  ModalHandle:     { width: 40, height: 4, backgroundColor: '#d4ead6', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  ModalTitle:      { fontSize: 20, fontWeight: '800', color: BrandColors.deepGreen, marginBottom: 16 },
  ModalLabel:      { fontSize: 11, fontWeight: '700', color: BrandColors.muted, letterSpacing: 0.8, marginBottom: 10 },

  ModalLocationNote:     { backgroundColor: '#fff8e1', borderRadius: 10, borderWidth: 1, borderColor: '#ffe082', paddingHorizontal: 12, paddingVertical: 8, marginBottom: 14 },
  ModalLocationNoteText: { fontSize: 12, color: '#795548', fontWeight: '500' },

  ChainGrid:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  ChainOption:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: '#f0f7f0', borderWidth: 1.5, borderColor: '#d4ead6' },
  ChainOptionActive:    { backgroundColor: BrandColors.deepGreen, borderColor: BrandColors.deepGreen },
  ChainOptionText:      { fontSize: 13, fontWeight: '600', color: BrandColors.muted },
  ChainOptionTextActive:{ color: BrandColors.white },

  ModalInput:      { backgroundColor: '#f7fbf7', borderWidth: 1.5, borderColor: '#d4ead6', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: BrandColors.darkText, marginBottom: 14 },

  SuggestLoading:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  SuggestLoadingText:  { fontSize: 13, color: BrandColors.muted },
  SuggestList:         { borderWidth: 1.5, borderColor: '#d4ead6', borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  SuggestHeader:       { fontSize: 11, fontWeight: '700', color: BrandColors.muted, letterSpacing: 0.5, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#f7fbf7' },
  SuggestItem:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#d4ead6' },
  SuggestItemLeft:     { flex: 1, marginRight: 8 },
  SuggestItemName:     { fontSize: 14, fontWeight: '700', color: BrandColors.darkText },
  SuggestItemAddr:     { fontSize: 12, color: BrandColors.muted, marginTop: 2 },
  SuggestItemDist:     { fontSize: 13, fontWeight: '700', color: BrandColors.midGreen },
  SuggestNone:         { fontSize: 13, color: BrandColors.muted, marginBottom: 16, textAlign: 'center' },

  ModalBtns:            { flexDirection: 'row', gap: 12, marginTop: 4 },
  ModalBtnSecondary:    { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: '#f0f7f0', borderWidth: 1.5, borderColor: '#d4ead6' },
  ModalBtnSecondaryText:{ color: BrandColors.deepGreen, fontWeight: '700', fontSize: 15 },
  ModalBtnPrimary:      { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: BrandColors.midGreen, shadowColor: BrandColors.midGreen, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  ModalBtnPrimaryText:  { color: BrandColors.white, fontWeight: '700', fontSize: 15 },

  ManualToggle:     { paddingVertical: 16, alignItems: 'center' },
  ManualToggleText: { fontSize: 13, color: BrandColors.midGreen, fontWeight: '600', textDecorationLine: 'underline' },
  ManualInputWrap:  { marginTop: 4, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e8f5e9' },
});
