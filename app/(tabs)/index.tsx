import { BrandColors } from '@/constants/theme';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useCatalog } from './CatalogContext';

// ─── Mock deal data — replace with real price API later ──────────────────────
type DealItem = {
  Id:       string;
  Name:     string;
  Discount: string;
  NewPrice: string;
  OldPrice: string;
  Store:    string;
};

function MockDeals(FreqNames: string[]): DealItem[] {
  const MockPrices = [
    { Discount: '34% OFF', NewPrice: '$2.30', OldPrice: '$3.50', Store: 'Walmart' },
    { Discount: '12% OFF', NewPrice: '$3.49', OldPrice: '$3.99', Store: 'Walmart' },
    { Discount: '20% OFF', NewPrice: '$4.00', OldPrice: '$5.00', Store: 'Walmart' },
  ];
  return FreqNames.slice(0, 3).map((Name, I) => ({
    Id: I.toString(),
    Name,
    ...MockPrices[I],
  }));
}

// ─── Mock store price comparisons — replace with real store price API ───────────
type CompareItem = {
  Name:         string;
  CurrentStore: string;
  CurrentPrice: string;
  CheaperStore: string;
  CheaperPrice: string;
  SaveAmount:   string;
};

const MOCK_COMPARISONS: CompareItem[] = [
  { Name: 'Whole Milk',   CurrentStore: 'Walmart', CurrentPrice: '$2.30', CheaperStore: 'Aldi',        CheaperPrice: '$1.89', SaveAmount: '$0.41' },
  { Name: 'Eggs (12ct)',  CurrentStore: 'Walmart', CurrentPrice: '$3.49', CheaperStore: 'Aldi',        CheaperPrice: '$2.99', SaveAmount: '$0.50' },
  { Name: 'Greek Yogurt', CurrentStore: 'Walmart', CurrentPrice: '$4.00', CheaperStore: 'Trader Joes', CheaperPrice: '$3.49', SaveAmount: '$0.51' },
  { Name: 'Sliced Bread', CurrentStore: 'Walmart', CurrentPrice: '$3.99', CheaperStore: 'Aldi',        CheaperPrice: '$2.89', SaveAmount: '$1.10' },
];

function GetComparisons(FreqNames: string[]): CompareItem[] {
  return MOCK_COMPARISONS
    .filter(C => FreqNames.some(N =>
      N.toLowerCase().includes(C.Name.toLowerCase()) ||
      C.Name.toLowerCase().includes(N.toLowerCase())
    ))
    .slice(0, 3);
}

// ─── Dev/demo seed — remove before production ────────────────────────────────
const DEV_MOCK_FREQ = [
  { Id: 'mock1', Name: 'Whole Milk',   ScanCount: 5, Starred: false, LastScan: 'Today',     PriceRange: '$3–4' },
  { Id: 'mock2', Name: 'Eggs (12ct)',  ScanCount: 4, Starred: false, LastScan: 'Yesterday',  PriceRange: '$2–3' },
  { Id: 'mock3', Name: 'Greek Yogurt', ScanCount: 3, Starred: true,  LastScan: 'Mon',        PriceRange: '$4–5' },
];

// ─── Deals modal ─────────────────────────────────────────────────────────────
function DealsModal({ Visible, Deals, OnDismiss }: {
  Visible:   boolean;
  Deals:     DealItem[];
  OnDismiss: () => void;
}) {
  if (Deals.length === 0) return null;
  return (
    <Modal visible={Visible} transparent animationType="fade">
      <View style={dm.Overlay}>
        <View style={dm.Card}>
          <View style={dm.Header}>
            <View>
              <Text style={dm.Title}>{Deals.length} deal{Deals.length !== 1 ? 's' : ''} found!</Text>
              <Text style={dm.Sub}>On your frequently bought items</Text>
            </View>
            <TouchableOpacity onPress={OnDismiss} style={dm.CloseBtn} activeOpacity={0.7}>
              <Text style={dm.CloseIcon}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={dm.List} showsVerticalScrollIndicator={false}>
            {Deals.map(D => (
              <View key={D.Id} style={dm.DealCard}>
                <View style={dm.DealTop}>
                  <View style={dm.DiscountBadge}>
                    <Text style={dm.DiscountText}>{D.Discount}</Text>
                  </View>
                  <Text style={dm.OldPrice}>{D.OldPrice}</Text>
                </View>
                <View style={dm.DealRow}>
                  <View style={dm.DealInfo}>
                    <Text style={dm.DealName} numberOfLines={1}>{D.Name}</Text>
                    <Text style={dm.DealStore}>{D.Store}</Text>
                  </View>
                  <Text style={dm.NewPrice}>{D.NewPrice}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={dm.BtnRow}>
            <TouchableOpacity style={dm.BtnOutline} onPress={OnDismiss} activeOpacity={0.85}>
              <Text style={dm.BtnOutlineText}>Dismiss</Text>
            </TouchableOpacity>
            <TouchableOpacity style={dm.BtnPrimary} onPress={OnDismiss} activeOpacity={0.85}>
              <Text style={dm.BtnPrimaryText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Home screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { Items } = useCatalog();

  const [ShowDeals,     SetShowDeals]     = useState(false);
  const [LocationLabel, SetLocationLabel] = useState('Tap to set location');
  const HasInit = useRef(false);

  const RealFreqItems = Items.filter(I => I.ScanCount >= 3 || I.Starred);
  // DEV_MOCK_FREQ fallback — remove before production
  const FreqItems = RealFreqItems.length > 0 ? RealFreqItems : DEV_MOCK_FREQ;
  const Deals       = MockDeals(FreqItems.map(I => I.Name));
  const Comparisons = GetComparisons(FreqItems.map(I => I.Name));
  // Real-time: pulls directly from catalog context, newest first
  const RecentScans = [...Items].reverse().slice(0, 5);

  // TODO: wire to real scan price data (Sprint 8)
  // Mock spend — replace with actual sum from Items once prices are tracked
  const TotalSavings  = 14.70;
  const TotalSpend    = 82.50;
  const SavingsRate   = TotalSpend > 0 ? TotalSavings / TotalSpend : 0;

  useEffect(() => {
    if (HasInit.current) return;
    HasInit.current = true;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const Loc = await Location.getCurrentPositionAsync({});
          const [Place] = await Location.reverseGeocodeAsync(Loc.coords);
          if (Place?.city) SetLocationLabel(`${Place.city}, ${Place.region ?? ''}`);
        } catch { /* ignore */ }
      }
    })();
  }, []);

  useEffect(() => {
    if (FreqItems.length > 0) {
      const T = setTimeout(() => SetShowDeals(true), 800);
      return () => clearTimeout(T);
    }
  }, [FreqItems.length]);

  return (
    <View style={styles.Container}>
      <StatusBar style="light" />

      <DealsModal
        Visible={ShowDeals}
        Deals={Deals}
        OnDismiss={() => SetShowDeals(false)}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.Scroll}>

        {/* ── Hero header ── */}
        <View style={styles.HeroHeader}>
          <View style={styles.HeroTop}>
            <View>
              <Text style={styles.HeroTitle}>BudgetScout</Text>
              <Text style={styles.HeroSub}>Scouting the best prices for you</Text>
            </View>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.HeroLogo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.LocationStrip}>
            <Text style={styles.LocationIcon}>📍</Text>
            <Text style={styles.LocationText}>{LocationLabel}</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.LocationChange}>Change</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Savings ring (floats over header) ── */}
        <View style={styles.SavingsCard}>
          <View style={styles.SavingsLeft}>
            <Text style={styles.SavingsLabel}>SAVED THIS WEEK</Text>
            <Text style={styles.SavingsAmount}>${TotalSavings.toFixed(2)}</Text>
            <Text style={styles.SavingsSub}>on ${TotalSpend.toFixed(2)} of groceries</Text>
            <TouchableOpacity onPress={() => SetShowDeals(true)} activeOpacity={0.8}>
              <View style={styles.SavingsCta}>
                <Text style={styles.SavingsCtaText}>{Deals.length} deals now ›</Text>
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.SavingsRingWrap}>
            {(() => {
              const R = 38;
              const Stroke = 7;
              const Circ = 2 * Math.PI * R;
              const Dash = SavingsRate * Circ;
              const Size = (R + Stroke) * 2;
              return (
                <Svg width={Size} height={Size}>
                  <Circle
                    cx={Size / 2} cy={Size / 2} r={R}
                    fill="none"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth={Stroke}
                  />
                  <Circle
                    cx={Size / 2} cy={Size / 2} r={R}
                    fill="none"
                    stroke="#9fe1cb"
                    strokeWidth={Stroke}
                    strokeDasharray={`${Dash} ${Circ - Dash}`}
                    strokeDashoffset={Circ / 4}
                    strokeLinecap="round"
                  />
                </Svg>
              );
            })()}
            <View style={styles.SavingsRingLabel}>
              <Text style={styles.SavingsRingPct}>{Math.round(SavingsRate * 100)}%</Text>
              <Text style={styles.SavingsRingHint}>saved</Text>
            </View>
          </View>
        </View>

        {/* ── Deals card ── */}
        <View style={styles.DealsCard}>
          <View style={styles.DealsCardHeader}>
            <Text style={styles.DealsCardTitle}>
              {Deals.length} deal{Deals.length !== 1 ? 's' : ''} on your items
            </Text>
            <TouchableOpacity onPress={() => SetShowDeals(true)} activeOpacity={0.7}>
              <Text style={styles.DealsCardLink}>View all ›</Text>
            </TouchableOpacity>
          </View>
          {Deals.map((D, I) => (
            <View key={D.Id} style={[styles.DealRow, I < Deals.length - 1 && styles.DealRowBorder]}>
              <View style={styles.DealBadge}>
                <Text style={styles.DealBadgeText}>{D.Discount}</Text>
              </View>
              <Text style={styles.DealName} numberOfLines={1}>{D.Name}</Text>
              <Text style={styles.DealPrice}>{D.NewPrice}</Text>
            </View>
          ))}
        </View>

        {/* ── Better price found ── */}
        {Comparisons.length > 0 && (
          <View style={styles.CompareCard}>
            <View style={styles.CompareHeader}>
              <Text style={styles.CompareTitle}>Better price found</Text>
              <Text style={styles.CompareSub}>on your frequent items</Text>
            </View>
            {Comparisons.map((C, I) => (
              <View key={I} style={[styles.CompareRow, I < Comparisons.length - 1 && styles.CompareRowBorder]}>
                <View style={styles.CompareInfo}>
                  <Text style={styles.CompareName} numberOfLines={1}>{C.Name}</Text>
                  <View style={styles.CompareStores}>
                    <Text style={styles.CompareCurrentStore}>{C.CurrentStore} {C.CurrentPrice}</Text>
                    <Text style={styles.CompareArrow}> → </Text>
                    <Text style={styles.CompareCheaperStore}>{C.CheaperStore} {C.CheaperPrice}</Text>
                  </View>
                </View>
                <View style={styles.CompareSavePill}>
                  <Text style={styles.CompareSaveText}>Save {C.SaveAmount}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Recently scanned — live from catalog context ── */}
        <View style={styles.RecentCard}>
          <View style={styles.RecentHeader}>
            <Text style={styles.RecentTitle}>Recently Scanned</Text>
            <Text style={styles.RecentCount}>{Items.length} total</Text>
          </View>
          {RecentScans.length === 0 ? (
            <View style={styles.RecentEmpty}>
              <Text style={styles.RecentEmptyText}>No receipts scanned yet — tap Scan to get started</Text>
            </View>
          ) : (
            <View style={styles.RecentList}>
              {RecentScans.map(Item => (
                <View key={Item.Id} style={styles.RecentRow}>
                  <View style={[styles.RecentBadge, (Item.ScanCount >= 3 || Item.Starred) && styles.RecentBadgeFreq]}>
                    <Text style={styles.RecentBadgeText}>{Item.ScanCount}x</Text>
                  </View>
                  <View style={styles.RecentInfo}>
                    <Text style={styles.RecentName} numberOfLines={1}>{Item.Name}</Text>
                    <Text style={styles.RecentMeta}>{Item.LastScan} · {Item.PriceRange}</Text>
                  </View>
                  {(Item.ScanCount >= 3 || Item.Starred) && (
                    <View style={styles.RecentFreqPill}>
                      <Text style={styles.RecentFreqPillText}>FREQUENT</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Deals modal styles ───────────────────────────────────────────────────────
const dm = StyleSheet.create({
  Overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  Card:          { backgroundColor: BrandColors.white, borderRadius: 24, padding: 24, width: '100%', maxHeight: '80%' },
  Header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  Title:         { fontSize: 22, fontWeight: '800', color: BrandColors.deepTeal },
  Sub:           { fontSize: 12, color: BrandColors.muted, marginTop: 2 },
  CloseBtn:      { width: 30, height: 30, borderRadius: 15, backgroundColor: BrandColors.offWhite, alignItems: 'center', justifyContent: 'center' },
  CloseIcon:     { fontSize: 13, color: BrandColors.muted, fontWeight: '700' },
  List:          { maxHeight: 280 },
  DealCard:      { backgroundColor: BrandColors.paleGold, borderRadius: 14, borderWidth: 1.5, borderColor: BrandColors.lightGold, padding: 12, marginBottom: 10 },
  DealTop:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  DiscountBadge: { backgroundColor: BrandColors.gold, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  DiscountText:  { color: BrandColors.white, fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  OldPrice:      { fontSize: 11, color: BrandColors.muted, textDecorationLine: 'line-through' },
  DealRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  DealInfo:      { flex: 1 },
  DealName:      { fontSize: 14, fontWeight: '700', color: BrandColors.darkText },
  DealStore:     { fontSize: 11, color: BrandColors.muted, marginTop: 1 },
  NewPrice:      { fontSize: 20, fontWeight: '800', color: BrandColors.deepTeal },
  BtnRow:        { flexDirection: 'row', gap: 10, marginTop: 16 },
  BtnOutline:    { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: BrandColors.offWhite, borderWidth: 1.5, borderColor: BrandColors.mintTeal },
  BtnOutlineText:{ color: BrandColors.deepTeal, fontWeight: '700', fontSize: 15 },
  BtnPrimary:    { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: BrandColors.deepTeal },
  BtnPrimaryText:{ color: BrandColors.white, fontWeight: '700', fontSize: 15 },
});

// ─── Main styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  Container: { flex: 1, backgroundColor: BrandColors.offWhite },
  Scroll:    { paddingBottom: 40 },

  // ── Hero header ──
  HeroHeader:   { backgroundColor: BrandColors.deepTeal, paddingTop: 60, paddingHorizontal: 22, paddingBottom: 28 },
  HeroTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  HeroGreeting: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '500', marginBottom: 2 },
  HeroTitle:    { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
  HeroSub:      { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 3, fontStyle: 'italic' },
  HeroLogo:     { width: 48, height: 48, opacity: 0.9 },

  LocationStrip:  { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, gap: 6 },
  LocationIcon:   { fontSize: 12 },
  LocationText:   { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  LocationChange: { fontSize: 12, fontWeight: '700', color: BrandColors.mintTeal },

  // ── Deals card ──
  DealsCard:       { backgroundColor: BrandColors.white, marginHorizontal: 16, marginTop: 12, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: BrandColors.mintTeal },
  DealsCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  DealsCardTitle:  { fontSize: 14, fontWeight: '700', color: BrandColors.deepTeal },
  DealsCardLink:   { fontSize: 12, fontWeight: '700', color: BrandColors.midTeal },
  DealRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  DealRowBorder:   { borderBottomWidth: 1, borderBottomColor: BrandColors.offWhite },
  DealBadge:       { backgroundColor: BrandColors.gold, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  DealBadgeText:   { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  DealName:        { flex: 1, fontSize: 13, fontWeight: '600', color: BrandColors.darkText },
  DealPrice:       { fontSize: 15, fontWeight: '800', color: BrandColors.deepTeal },

  // ── Savings card ──
  SavingsCard:     { marginHorizontal: 16, marginTop: -16, backgroundColor: BrandColors.deepTeal, borderRadius: 18, paddingHorizontal: 20, paddingVertical: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  SavingsLeft:     { flex: 1 },
  SavingsLabel:    { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.55)', letterSpacing: 0.6, marginBottom: 3 },
  SavingsAmount:   { fontSize: 34, fontWeight: '800', color: '#fff', letterSpacing: 0.2, lineHeight: 40 },
  SavingsSub:      { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  SavingsCta:      { marginTop: 12, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' },
  SavingsCtaText:  { fontSize: 11, fontWeight: '700', color: '#fff' },
  SavingsRingWrap: { width: 90, height: 90, alignItems: 'center', justifyContent: 'center' },
  SavingsRingLabel:{ position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  SavingsRingPct:  { fontSize: 16, fontWeight: '800', color: '#fff', textAlign: 'center' },
  SavingsRingHint: { fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: '600', textAlign: 'center' },

  // ── Price comparison card ──
  CompareCard:         { backgroundColor: BrandColors.white, marginHorizontal: 16, marginTop: 12, borderRadius: 16, borderWidth: 1, borderColor: BrandColors.mintTeal, padding: 16 },
  CompareHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  CompareTitle:        { fontSize: 14, fontWeight: '800', color: BrandColors.deepTeal },
  CompareSub:          { fontSize: 11, color: BrandColors.muted },
  CompareRow:          { paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  CompareRowBorder:    { borderBottomWidth: 1, borderBottomColor: BrandColors.offWhite },
  CompareInfo:         { flex: 1, gap: 3 },
  CompareName:         { fontSize: 13, fontWeight: '700', color: BrandColors.darkText },
  CompareStores:       { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  CompareCurrentStore: { fontSize: 11, color: BrandColors.muted, textDecorationLine: 'line-through' },
  CompareArrow:        { fontSize: 11, color: BrandColors.muted },
  CompareCheaperStore: { fontSize: 11, fontWeight: '700', color: BrandColors.midTeal },
  CompareSavePill:     { backgroundColor: BrandColors.mintTeal, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  CompareSaveText:     { fontSize: 10, fontWeight: '800', color: BrandColors.deepTeal },

  // ── Recently scanned ──
  RecentCard:         { backgroundColor: BrandColors.white, marginHorizontal: 16, marginTop: 12, marginBottom: 4, borderRadius: 16, borderWidth: 1, borderColor: BrandColors.mintTeal, padding: 16 },
  RecentHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  RecentTitle:        { fontSize: 14, fontWeight: '800', color: BrandColors.deepTeal },
  RecentCount:        { fontSize: 11, color: BrandColors.muted, fontWeight: '500' },
  RecentEmpty:        { paddingVertical: 16, alignItems: 'center' },
  RecentEmptyText:    { fontSize: 12, color: BrandColors.muted, textAlign: 'center', lineHeight: 18 },
  RecentList:         { gap: 8 },
  RecentRow:          { flexDirection: 'row', alignItems: 'center', gap: 10 },
  RecentBadge:        { width: 34, height: 34, borderRadius: 9, backgroundColor: BrandColors.offWhite, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BrandColors.mintTeal, flexShrink: 0 },
  RecentBadgeFreq:    { backgroundColor: BrandColors.deepTeal, borderColor: BrandColors.deepTeal },
  RecentBadgeText:    { fontSize: 10, fontWeight: '800', color: BrandColors.white },
  RecentInfo:         { flex: 1, gap: 2 },
  RecentName:         { fontSize: 13, fontWeight: '600', color: BrandColors.darkText },
  RecentMeta:         { fontSize: 11, color: BrandColors.muted },
  RecentFreqPill:     { backgroundColor: BrandColors.paleGold, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, borderWidth: 1, borderColor: BrandColors.lightGold },
  RecentFreqPillText: { fontSize: 8, fontWeight: '800', color: BrandColors.gold, letterSpacing: 0.4 },

});