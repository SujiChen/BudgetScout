export let GLOBAL_ZIP = '';

import { BrandColors } from '@/constants/theme';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useCatalog } from './CatalogContext';

// ─── MOCK PRICE DATABASE ─────────────────────────────
const MOCK_PRICES: Record<string, Record<string, number>> = {
  milk: {
    Walmart: 3.99,
    Target: 3.49,
    Aldi: 2.99,
  },
  eggs: {
    Walmart: 2.99,
    Target: 3.29,
    Aldi: 2.49,
  },
  bread: {
    Walmart: 2.50,
    Target: 2.80,
    Aldi: 1.99,
  },
  banana: {
    Walmart: 1.50,
    Target: 1.30,
    Aldi: 0.99,
  },
  chicken: {
    Walmart: 6.99,
    Target: 7.49,
    Aldi: 5.99,
  },
  rice: {
    Walmart: 4.00,
    Target: 4.50,
    Aldi: 3.50,
  },
  apple: {
    Walmart: 3.99,
    Target: 4.29,
    Aldi: 2.99,
  },
};

// ─── MATCH SCANNED ITEM → MOCK KEY ───────────────────
function findItemKey(name: string): string | null {
  const lower = name.toLowerCase();

  if (lower.includes('milk')) return 'milk';
  if (lower.includes('egg')) return 'eggs';
  if (lower.includes('bread')) return 'bread';

  if (lower.includes('banana')) return 'banana';
  if (lower.includes('chicken')) return 'chicken';
  if (lower.includes('rice')) return 'rice';
  if (lower.includes('apple')) return 'apple';

  return null;
}

// ─── Types ─────────────────────────────────────────
type DealItem = {
  Id: string;
  Name: string;
  Discount: string;
  NewPrice: string;
  OldPrice: string;
  Store: string;
};

type CompareItem = {
  Name: string;
  CurrentStore: string;
  CurrentPrice: string;
  CheaperStore: string;
  CheaperPrice: string;
  SaveAmount: string;
};

// ─── Helpers ───────────────────────────────────────
function parsePriceRange(priceRange?: string) {
  const cleaned = (priceRange ?? '').replace(/\$/g, '').trim();

  if (!cleaned) {
    return { low: 0, high: 0 };
  }

  const parts = cleaned.includes('–')
    ? cleaned.split('–')
    : cleaned.includes('-')
      ? cleaned.split('-')
      : [cleaned, cleaned];

  const low = parseFloat(parts[0]) || 0;
  const high = parseFloat(parts[1]) || low || 0;

  return { low, high };
}

function getStoresFromZip(zip: string) {
  if (!zip || zip.length < 5) return ['Walmart'];

  const prefix = parseInt(zip.slice(0, 2), 10);

  if (prefix >= 10 && prefix <= 14) {
    return ['Walmart', 'Aldi', 'Target'];
  }

  if (prefix >= 30 && prefix <= 39) {
    return ['Walmart', 'Publix', 'Target'];
  }

  if (prefix >= 60 && prefix <= 69) {
    return ['Walmart', 'Kroger', 'Target'];
  }

  if (prefix >= 90 && prefix <= 96) {
    return ['Walmart', 'Safeway', 'Target'];
  }

  return ['Walmart', 'Target'];
}

// ─── Deals modal ─────────────────────────────────────────────────────────────
function DealsModal({
  Visible,
  Deals,
  LocationLabel,
  OnDismiss,
}: {
  Visible: boolean;
  Deals: DealItem[];
  LocationLabel: string;
  OnDismiss: () => void;
}) {
  if (Deals.length === 0) return null;

  return (
    <Modal visible={Visible} transparent animationType="fade">
      <View style={dm.Overlay}>
        <View style={dm.Card}>
          <View style={dm.Header}>
            <View>
              <Text style={dm.Title}>
                {Deals.length} deal{Deals.length !== 1 ? 's' : ''} found!
              </Text>
              <Text style={dm.Sub}>On your frequently bought items</Text>
            </View>
            <TouchableOpacity
              onPress={OnDismiss}
              style={dm.CloseBtn}
              activeOpacity={0.7}>
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
                    <Text style={dm.DealName} numberOfLines={1}>
                      {D.Name}
                    </Text>
                    <Text style={dm.DealStore}>
                      {D.Store} ({LocationLabel})
                    </Text>
                  </View>
                  <Text style={dm.NewPrice}>{D.NewPrice}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={dm.BtnRow}>
            <TouchableOpacity
              style={dm.BtnOutline}
              onPress={OnDismiss}
              activeOpacity={0.85}>
              <Text style={dm.BtnOutlineText}>Dismiss</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={dm.BtnPrimary}
              onPress={OnDismiss}
              activeOpacity={0.85}>
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

  const [ShowDeals, SetShowDeals] = useState(false);
  const [LocationLabel, SetLocationLabel] = useState('Tap to set location');
  const [HasShownDeals, SetHasShownDeals] = useState(false);
  const [ShowZipModal, SetShowZipModal] = useState(false);
  const [ZipInput, SetZipInput] = useState('');
  const [SelectedZip, SetSelectedZip] = useState('');

  const FreqItems = Items.filter(
    I => I.ScanCount >= 1 || I.Starred
  );

  const NearbyStores = getStoresFromZip(SelectedZip);
  const PrimaryStore = NearbyStores[0];
  const SecondaryStore = NearbyStores[1] || 'Other Store';

  const Deals: DealItem[] = FreqItems.map((item, i) => {
    const key = findItemKey(item.Name);
    if (!key) return null;
  
    const prices = MOCK_PRICES[key];
    if (!prices) return null;
  
    const entries = Object.entries(prices);
  
    // Sort from cheapest → most expensive
    const sorted = entries.sort((a, b) => a[1] - b[1]);
  
    const [cheapestStore, cheapestPrice] = sorted[0];
    const [expensiveStore, expensivePrice] = sorted[sorted.length - 1];
  
    // No deal if same price
    if (cheapestPrice >= expensivePrice) return null;
  
    const discount = Math.round(
      ((expensivePrice - cheapestPrice) / expensivePrice) * 100
    );
  
    return {
      Id: i.toString(),
      Name: item.Name,
      Discount: `${discount}% OFF`,
      NewPrice: `$${cheapestPrice.toFixed(2)}`,
      OldPrice: `$${expensivePrice.toFixed(2)}`,
      Store: cheapestStore,
    };
  }).filter(Boolean) as DealItem[];

  const Comparisons: CompareItem[] = FreqItems.map(item => {
    const { low, high } = parsePriceRange(item.PriceRange);

    return {
      Name: item.Name,
      CurrentStore: PrimaryStore,
      CurrentPrice: `$${high.toFixed(2)}`,
      CheaperStore: SecondaryStore,
      CheaperPrice: `$${low.toFixed(2)}`,
      SaveAmount: `$${Math.max(0, high - low).toFixed(2)}`,
    };
  }).slice(0, 3);

  const RecentScans = [...Items].reverse().slice(0, 5);

  const TotalSpend = Items.reduce((sum, item) => {
    const { high } = parsePriceRange(item.PriceRange);
    return sum + high;
  }, 0);

  const TotalSavings = FreqItems.reduce((sum, item) => {
    const { low, high } = parsePriceRange(item.PriceRange);
    return sum + Math.max(0, high - low);
  }, 0);

  const SavingsRate = TotalSpend > 0 ? TotalSavings / TotalSpend : 0;

  useEffect(() => {
    if (SelectedZip) {
      // do nothing
    }
  }, [SelectedZip]);

  useEffect(() => {
    if (FreqItems.length > 0 && !HasShownDeals) {
      const T = setTimeout(() => {
        SetShowDeals(true);
        SetHasShownDeals(true);
      }, 800);
  
      return () => clearTimeout(T);
    }
  }, [FreqItems.length, HasShownDeals]);

  return (
    <View style={styles.Container}>
      <StatusBar style="light" />

      <DealsModal
        Visible={ShowDeals}
        Deals={Deals}
        LocationLabel={LocationLabel}
        OnDismiss={() => SetShowDeals(false)}
      />

      <Modal visible={ShowZipModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            padding: 24,
          }}>
          <View
            style={{
              backgroundColor: 'white',
              borderRadius: 20,
              padding: 20,
            }}>
            <Text style={{ fontSize: 18, fontWeight: '800', marginBottom: 12 }}>
              Enter ZIP Code
            </Text>

            <TextInput
              value={ZipInput}
              onChangeText={SetZipInput}
              placeholder="e.g. 12180"
              keyboardType="number-pad"
              style={{
                borderWidth: 1,
                borderColor: '#ccc',
                borderRadius: 10,
                padding: 12,
                marginBottom: 16,
              }}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 12,
                  backgroundColor: '#eee',
                  borderRadius: 10,
                  alignItems: 'center',
                }}
                onPress={() => SetShowZipModal(false)}>
                <Text>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 12,
                  backgroundColor: '#0f766e',
                  borderRadius: 10,
                  alignItems: 'center',
                }}
                onPress={async () => {
                  if (ZipInput.length < 5) return;

                  try {
                    const result = await Location.geocodeAsync(ZipInput);

                    if (result.length > 0) {
                      const { latitude, longitude } = result[0];

                      const [place] = await Location.reverseGeocodeAsync({
                        latitude,
                        longitude,
                      });

                      if (place?.city) {
                        SetLocationLabel(`${place.city}, ${place.region ?? ''}`);
                      } else {
                        SetLocationLabel(`ZIP ${ZipInput}`);
                      }
                    }

                    SetSelectedZip(ZipInput);
                    GLOBAL_ZIP = ZipInput;

                    SetShowZipModal(false);
                    SetZipInput('');
                  } catch (e) {
                    console.log(e);
                  }
                }}>
                <Text style={{ color: 'white', fontWeight: '700' }}>Set</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.Scroll}>
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
            <TouchableOpacity
              onPress={() => SetShowZipModal(true)}
              activeOpacity={0.7}>
              <Text style={styles.LocationChange}>Change</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Savings ring (floats over header) ── */}
        <View style={styles.SavingsCard}>
          <View style={styles.SavingsLeft}>
            <Text style={styles.SavingsLabel}>SAVED THIS WEEK</Text>
            <Text style={styles.SavingsAmount}>${TotalSavings.toFixed(2)}</Text>
            <Text style={styles.SavingsSub}>
              on ${TotalSpend.toFixed(2)} of groceries
            </Text>
            <TouchableOpacity
              onPress={() => SetShowDeals(true)}
              activeOpacity={0.8}>
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
              const Dash = Math.min(Math.max(SavingsRate, 0), 1) * Circ;
              const Size = (R + Stroke) * 2;
              return (
                <Svg width={Size} height={Size}>
                  <Circle
                    cx={Size / 2}
                    cy={Size / 2}
                    r={R}
                    fill="none"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth={Stroke}
                  />
                  <Circle
                    cx={Size / 2}
                    cy={Size / 2}
                    r={R}
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
              <Text style={styles.SavingsRingPct}>
                {Math.round(SavingsRate * 100)}%
              </Text>
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
            <TouchableOpacity
              onPress={() => SetShowDeals(true)}
              activeOpacity={0.7}>
              <Text style={styles.DealsCardLink}>View all ›</Text>
            </TouchableOpacity>
          </View>
          {Deals.length === 0 ? (
            <Text style={styles.RecentEmptyText}>
              No deal data yet. Scan more receipts to see frequent-item deals.
            </Text>
          ) : (
            Deals.map((D, I) => (
              <View
                key={D.Id}
                style={[
                  styles.DealRow,
                  I < Deals.length - 1 && styles.DealRowBorder,
                ]}>
                <View style={styles.DealBadge}>
                  <Text style={styles.DealBadgeText}>{D.Discount}</Text>
                </View>
                <Text style={styles.DealName} numberOfLines={1}>
                  {D.Name}
                </Text>
                <Text style={styles.DealPrice}>{D.NewPrice}</Text>
              </View>
            ))
          )}
        </View>

        {/* ── Better price found ── */}
        {Comparisons.length > 0 && (
          <View style={styles.CompareCard}>
            <View style={styles.CompareHeader}>
              <Text style={styles.CompareTitle}>Better price found</Text>
              <Text style={styles.CompareSub}>on your frequent items</Text>
            </View>
            {Comparisons.map((C, I) => (
              <View
                key={I}
                style={[
                  styles.CompareRow,
                  I < Comparisons.length - 1 && styles.CompareRowBorder,
                ]}>
                <View style={styles.CompareInfo}>
                  <Text style={styles.CompareName} numberOfLines={1}>
                    {C.Name}
                  </Text>
                  <View style={styles.CompareStores}>
                    <Text style={styles.CompareCurrentStore}>
                      {C.CurrentStore} ({LocationLabel}) {C.CurrentPrice}
                    </Text>
                    <Text style={styles.CompareArrow}> → </Text>
                    <Text style={styles.CompareCheaperStore}>
                      {C.CheaperStore} {C.CheaperPrice}
                    </Text>
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
              <Text style={styles.RecentEmptyText}>
                No receipts scanned yet — tap Scan to get started
              </Text>
            </View>
          ) : (
            <View style={styles.RecentList}>
              {RecentScans.map(Item => (
                <View key={Item.Id} style={styles.RecentRow}>
                  <View
                    style={[
                      styles.RecentBadge,
                      (Item.ScanCount >= 3 || Item.Starred) &&
                        styles.RecentBadgeFreq,
                    ]}>
                    <Text style={styles.RecentBadgeText}>{Item.ScanCount}x</Text>
                  </View>
                  <View style={styles.RecentInfo}>
                    <Text style={styles.RecentName} numberOfLines={1}>
                      {Item.Name}
                    </Text>
                    <Text style={styles.RecentMeta}>
                      {Item.LastScan} · {Item.PriceRange}
                    </Text>
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
  Overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  Card: {
    backgroundColor: BrandColors.white,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxHeight: '80%',
  },
  Header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  Title: {
    fontSize: 22,
    fontWeight: '800',
    color: BrandColors.deepTeal,
  },
  Sub: {
    fontSize: 12,
    color: BrandColors.muted,
    marginTop: 2,
  },
  CloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: BrandColors.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  CloseIcon: {
    fontSize: 13,
    color: BrandColors.muted,
    fontWeight: '700',
  },
  List: {
    maxHeight: 280,
  },
  DealCard: {
    backgroundColor: BrandColors.paleGold,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BrandColors.lightGold,
    padding: 12,
    marginBottom: 10,
  },
  DealTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  DiscountBadge: {
    backgroundColor: BrandColors.gold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  DiscountText: {
    color: BrandColors.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  OldPrice: {
    fontSize: 11,
    color: BrandColors.muted,
    textDecorationLine: 'line-through',
  },
  DealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  DealInfo: {
    flex: 1,
  },
  DealName: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.darkText,
  },
  DealStore: {
    fontSize: 11,
    color: BrandColors.muted,
    marginTop: 1,
  },
  NewPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: BrandColors.deepTeal,
  },
  BtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  BtnOutline: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: BrandColors.offWhite,
    borderWidth: 1.5,
    borderColor: BrandColors.mintTeal,
  },
  BtnOutlineText: {
    color: BrandColors.deepTeal,
    fontWeight: '700',
    fontSize: 15,
  },
  BtnPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: BrandColors.deepTeal,
  },
  BtnPrimaryText: {
    color: BrandColors.white,
    fontWeight: '700',
    fontSize: 15,
  },
});

// ─── Main styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  Container: { flex: 1, backgroundColor: BrandColors.offWhite },
  Scroll: { paddingBottom: 40 },

  HeroHeader: {
    backgroundColor: BrandColors.deepTeal,
    paddingTop: 60,
    paddingHorizontal: 22,
    paddingBottom: 28,
  },
  HeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  HeroGreeting: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
    marginBottom: 2,
  },
  HeroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },
  HeroSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 3,
    fontStyle: 'italic',
  },
  HeroLogo: {
    width: 48,
    height: 48,
    opacity: 0.9,
  },

  LocationStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 6,
  },
  LocationIcon: { fontSize: 12 },
  LocationText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  LocationChange: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.mintTeal,
  },

  DealsCard: {
    backgroundColor: BrandColors.white,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BrandColors.mintTeal,
  },
  DealsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  DealsCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.deepTeal,
  },
  DealsCardLink: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.midTeal,
  },
  DealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
  },
  DealRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.offWhite,
  },
  DealBadge: {
    backgroundColor: BrandColors.gold,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  DealBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  DealName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.darkText,
  },
  DealPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.deepTeal,
  },

  SavingsCard: {
    marginHorizontal: 16,
    marginTop: -16,
    backgroundColor: BrandColors.deepTeal,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  SavingsLeft: { flex: 1 },
  SavingsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  SavingsAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
    lineHeight: 40,
  },
  SavingsSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  SavingsCta: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  SavingsCtaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  SavingsRingWrap: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  SavingsRingLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  SavingsRingPct: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  SavingsRingHint: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    textAlign: 'center',
  },

  CompareCard: {
    backgroundColor: BrandColors.white,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BrandColors.mintTeal,
    padding: 16,
  },
  CompareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  CompareTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: BrandColors.deepTeal,
  },
  CompareSub: {
    fontSize: 11,
    color: BrandColors.muted,
  },
  CompareRow: {
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  CompareRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.offWhite,
  },
  CompareInfo: {
    flex: 1,
    gap: 3,
  },
  CompareName: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.darkText,
  },
  CompareStores: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  CompareCurrentStore: {
    fontSize: 11,
    color: BrandColors.muted,
    textDecorationLine: 'line-through',
  },
  CompareArrow: {
    fontSize: 11,
    color: BrandColors.muted,
  },
  CompareCheaperStore: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.midTeal,
  },
  CompareSavePill: {
    backgroundColor: BrandColors.mintTeal,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  CompareSaveText: {
    fontSize: 10,
    fontWeight: '800',
    color: BrandColors.deepTeal,
  },

  RecentCard: {
    backgroundColor: BrandColors.white,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BrandColors.mintTeal,
    padding: 16,
  },
  RecentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  RecentTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: BrandColors.deepTeal,
  },
  RecentCount: {
    fontSize: 11,
    color: BrandColors.muted,
    fontWeight: '500',
  },
  RecentEmpty: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  RecentEmptyText: {
    fontSize: 12,
    color: BrandColors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  RecentList: {
    gap: 8,
  },
  RecentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  RecentBadge: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: BrandColors.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BrandColors.mintTeal,
    flexShrink: 0,
  },
  RecentBadgeFreq: {
    backgroundColor: BrandColors.deepTeal,
    borderColor: BrandColors.deepTeal,
  },
  RecentBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: BrandColors.white,
  },
  RecentInfo: {
    flex: 1,
    gap: 2,
  },
  RecentName: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.darkText,
  },
  RecentMeta: {
    fontSize: 11,
    color: BrandColors.muted,
  },
  RecentFreqPill: {
    backgroundColor: BrandColors.paleGold,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: BrandColors.lightGold,
  },
  RecentFreqPillText: {
    fontSize: 8,
    fontWeight: '800',
    color: BrandColors.gold,
    letterSpacing: 0.4,
  },
});