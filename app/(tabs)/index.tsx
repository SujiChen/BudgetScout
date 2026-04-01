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
  const Deals     = MockDeals(FreqItems.map(I => I.Name));

  // TODO: replace with real savings tracking
  const TotalSavings = 14.70;

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

        {/* ── Deals card (floats over header) ── */}
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

        {/* ── Savings this week ── */}
        <View style={styles.SavingsCard}>
          <Text style={styles.SavingsLabel}>SAVINGS THIS WEEK</Text>
          <Text style={styles.SavingsAmount}>${TotalSavings.toFixed(2)}</Text>
          <Text style={styles.SavingsSub}>Across {Deals.length} deal{Deals.length !== 1 ? 's' : ''} on your items</Text>
          <TouchableOpacity onPress={() => SetShowDeals(true)} activeOpacity={0.8}>
            <View style={styles.SavingsCta}>
              <Text style={styles.SavingsCtaText}>{Deals.length} deals available now ›</Text>
            </View>
          </TouchableOpacity>
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
  DealsCard:       { backgroundColor: BrandColors.white, marginHorizontal: 16, marginTop: -16, borderRadius: 18, padding: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
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
  SavingsCard:    { marginHorizontal: 16, marginTop: 12, backgroundColor: BrandColors.deepTeal, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 20 },
  SavingsLabel:   { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 0.6, marginBottom: 4 },
  SavingsAmount:  { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: 0.2, lineHeight: 42 },
  SavingsSub:     { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  SavingsCta:     { marginTop: 14, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, alignSelf: 'flex-start' },
  SavingsCtaText: { fontSize: 12, fontWeight: '700', color: '#fff' },
});
