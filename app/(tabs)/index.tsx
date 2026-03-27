import { BrandColors } from '@/constants/theme';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────
type SaleItem = {
  Id:       string;
  Name:     string;
  Discount: string;
  NewPrice: string;
  OldPrice: string;
  Store:    string;
  Distance: string;
  Pinned:   boolean;
};

type FreqItem = {
  Id:       string;
  Name:     string;
  Scans:    number;
  LastScan: string;
  OnSale:   boolean;
};

// ─── Mock data — replace with real DB/API calls ───────────────────────────────
const INITIAL_SALES: SaleItem[] = [
  { Id: '1', Name: 'Frosted Flakes 10oz', Discount: '34% OFF', NewPrice: '$2.30', OldPrice: '$3.50', Store: 'Walmart', Distance: '0.8 mi', Pinned: false },
  { Id: '2', Name: '2% Great Value Milk', Discount: '7% OFF',  NewPrice: '$4.00', OldPrice: '$4.32', Store: 'Walmart', Distance: '0.8 mi', Pinned: false },
  { Id: '3', Name: 'Dozen Large Eggs',    Discount: '12% OFF', NewPrice: '$3.49', OldPrice: '$3.99', Store: 'Walmart', Distance: '0.8 mi', Pinned: true  },
  { Id: '4', Name: 'Cheerios 18oz',       Discount: '20% OFF', NewPrice: '$4.00', OldPrice: '$5.00', Store: 'Walmart', Distance: '0.8 mi', Pinned: false },
];

const INITIAL_FREQ: FreqItem[] = [
  { Id: '1', Name: 'Frosted Flakes 10oz',   Scans: 7, LastScan: '2 wks ago',  OnSale: true  },
  { Id: '2', Name: '2% Great Value Milk',   Scans: 5, LastScan: '1 wk ago',   OnSale: true  },
  { Id: '3', Name: 'Dozen Large Eggs',      Scans: 4, LastScan: '3 days ago', OnSale: true  },
  { Id: '4', Name: 'Nature Valley Granola', Scans: 3, LastScan: '5 days ago', OnSale: false },
  { Id: '5', Name: 'Cheerios 18oz',         Scans: 4, LastScan: '1 wk ago',   OnSale: true  },
];
// ─────────────────────────────────────────────────────────────────────────────

// ─── Sale card ────────────────────────────────────────────────────────────────
function SaleCard({
  Item,
  OnPin,
  OnDismiss,
}: {
  Item:      SaleItem;
  OnPin:     (Id: string) => void;
  OnDismiss: (Id: string) => void;
})
{
  const Scale = useSharedValue(1);

  const CardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: Scale.value }],
  }));

  function HandlePress()
  {
    Scale.value = withSpring(0.97, { damping: 12 }, () =>
    {
      Scale.value = withSpring(1, { damping: 12 });
    });
  }

  return (
    <Animated.View style={[styles.SaleCard, Item.Pinned && styles.SaleCardPinned, CardStyle]}>
      <TouchableOpacity activeOpacity={0.9} onPress={HandlePress} style={styles.SaleCardInner}>

        {/* Top row — name + dismiss X */}
        <View style={styles.SaleTopRow}>
          <View style={styles.DiscountBadge}>
            <Text style={styles.DiscountText}>{Item.Discount}</Text>
          </View>
          <TouchableOpacity
            style={styles.DismissBtn}
            onPress={() => OnDismiss(Item.Id)}
            activeOpacity={0.8}
          >
            <Text style={styles.DismissIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Middle — info + price */}
        <View style={styles.SaleMiddleRow}>
          <View style={styles.SaleLeft}>
            <Text style={styles.SaleName} numberOfLines={1}>{Item.Name}</Text>
            <View style={styles.StoreRow}>
              <Text style={styles.StorePin}>📍</Text>
              <Text style={styles.StoreText}>{Item.Store} · {Item.Distance}</Text>
            </View>
          </View>

          <View style={styles.SaleRight}>
            <Text style={styles.NewPrice}>{Item.NewPrice}</Text>
            <Text style={styles.OldPrice}>{Item.OldPrice}</Text>
          </View>
        </View>

        {/* Pin button */}
        <TouchableOpacity
          style={[styles.PinBtn, Item.Pinned && styles.PinBtnActive]}
          onPress={() => OnPin(Item.Id)}
          activeOpacity={0.8}
        >
          <Text style={styles.PinIcon}>{Item.Pinned ? '📍 Pinned' : '📌 Pin deal'}</Text>
        </TouchableOpacity>

      </TouchableOpacity>
    </Animated.View>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Freq item row ────────────────────────────────────────────────────────────
function FreqRow({ Item }: { Item: FreqItem })
{
  return (
    <View style={styles.FreqRow}>
      <View style={styles.FreqIconWrap}>
        <Text style={styles.FreqIcon}>🛒</Text>
      </View>
      <View style={styles.FreqInfo}>
        <Text style={styles.FreqName} numberOfLines={1}>{Item.Name}</Text>
        <Text style={styles.FreqMeta}>{Item.Scans} scans · {Item.LastScan}</Text>
      </View>
      {Item.OnSale && (
        <View style={styles.OnSaleBadge}>
          <Text style={styles.OnSaleText}>ON SALE</Text>
        </View>
      )}
    </View>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function HomeScreen()
{
  const [Sales, SetSales] = useState<SaleItem[]>(INITIAL_SALES);
  const [FreqItems]       = useState<FreqItem[]>(INITIAL_FREQ);

  const PinnedSales   = Sales.filter(S => S.Pinned);
  const UnpinnedSales = Sales.filter(S => !S.Pinned);
  const OrderedSales  = [...PinnedSales, ...UnpinnedSales];

  function HandlePin(Id: string)
  {
    SetSales(Prev =>
      Prev.map(S => S.Id === Id ? { ...S, Pinned: !S.Pinned } : S)
    );
  }

  function HandleDismiss(Id: string)
  {
    SetSales(Prev => Prev.filter(S => S.Id !== Id));
  }

  return (
    <View style={styles.Container}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.ScrollContent}
      >

        {/* ── Header ── */}
        <View style={styles.Header}>
          <View style={styles.HeaderTop}>
            <View>
              <Text style={styles.HeaderTitle}>BudgetScout</Text>
              <Text style={styles.HeaderSub}>Scouting for the best prices</Text>
            </View>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.HeaderLogo}
              resizeMode="contain"
            />
          </View>

          {/* Store location strip */}
          <View style={styles.LocationStrip}>
            <Text style={styles.LocationIcon}>📍</Text>
            <Text style={styles.LocationText}>Walmart · 0.8 mi away</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.LocationChange}>Change</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Stats row ── */}
        <View style={styles.StatsRow}>
          <View style={styles.StatCard}>
            <Text style={styles.StatNum}>{Sales.length}</Text>
            <Text style={styles.StatLabel}>On Sale</Text>
          </View>
          <View style={[styles.StatCard, styles.StatCardActive]}>
            <Text style={[styles.StatNum, styles.StatNumActive]}>{PinnedSales.length}</Text>
            <Text style={[styles.StatLabel, styles.StatLabelActive]}>Pinned</Text>
          </View>
        </View>

        {/* ── On sale this week ── */}
        <View style={styles.Section}>
          <View style={styles.SectionHeader}>
            <Text style={styles.SectionTitle}> On Sale This Week</Text>
            <Text style={styles.SectionSub}>{Sales.length} deals</Text>
          </View>

          {OrderedSales.length === 0
            ? (
              <View style={styles.EmptyCard}>
                <Text style={styles.EmptyText}>No sales detected yet. Scan a receipt to get started!</Text>
              </View>
            )
            : OrderedSales.map(Item => (
              <SaleCard
                key={Item.Id}
                Item={Item}
                OnPin={HandlePin}
                OnDismiss={HandleDismiss}
              />
            ))
          }
        </View>

        {/* ── Frequently purchased ── */}
        <View style={styles.Section}>
          <View style={styles.SectionHeader}>
            <Text style={styles.SectionTitle}>Frequently Bought</Text>
            <Text style={styles.SectionSub}>{FreqItems.length} items</Text>
          </View>

          <View style={styles.FreqList}>
            {FreqItems.map(Item => (
              <FreqRow key={Item.Id} Item={Item} />
            ))}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  Container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  ScrollContent: {
    paddingBottom: 40,
  },

  // ── Header ──
  Header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  HeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  HeaderTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: BrandColors.deepGreen,
    letterSpacing: 0.3,
  },
  HeaderSub: {
    fontSize: 12,
    color: BrandColors.muted,
    marginTop: 2,
    fontStyle: 'italic',
  },
  HeaderLogo: {
    width: 52,
    height: 52,
  },
  LocationStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7fbf7',
    borderWidth: 1.5,
    borderColor: '#d4ead6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 6,
  },
  LocationIcon: { fontSize: 13 },
  LocationText: {
    flex: 1,
    fontSize: 13,
    color: BrandColors.darkText,
    fontWeight: '500',
  },
  LocationChange: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.midGreen,
  },

  // ── Stats ──
  StatsRow: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 20,
    gap: 10,
  },
  StatCard: {
    flex: 1,
    backgroundColor: '#f7fbf7',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#d4ead6',
  },
  StatCardActive: {
    backgroundColor: BrandColors.deepGreen,
    borderColor: BrandColors.deepGreen,
  },
  StatNum: {
    fontSize: 22,
    fontWeight: '800',
    color: BrandColors.deepGreen,
  },
  StatNumActive: {
    color: BrandColors.white,
  },
  StatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.muted,
    marginTop: 2,
  },
  StatLabelActive: {
    color: BrandColors.mintGreen,
  },

  // ── Sections ──
  Section: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  SectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  SectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.deepGreen,
  },
  SectionSub: {
    fontSize: 12,
    color: BrandColors.muted,
    fontWeight: '500',
  },

  // ── Sale card ──
  SaleCard: {
    backgroundColor: '#f7fbf7',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#d4ead6',
    marginBottom: 10,
    overflow: 'hidden',
  },
  SaleCardPinned: {
    borderColor: '#f9a825',
    backgroundColor: '#fffdf0',
  },
  SaleCardInner: {
    padding: 14,
    gap: 10,
  },
  SaleTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  DiscountBadge: {
    backgroundColor: BrandColors.midGreen,
    alignSelf: 'flex-start',
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
  DismissBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  DismissIcon: {
    fontSize: 11,
    color: BrandColors.muted,
    fontWeight: '700',
  },
  SaleMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  SaleLeft: {
    flex: 1,
    gap: 4,
  },
  SaleName: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.darkText,
  },
  StoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  StorePin: { fontSize: 11 },
  StoreText: {
    fontSize: 11,
    color: BrandColors.muted,
    fontWeight: '500',
  },
  SaleRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  NewPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.deepGreen,
  },
  OldPrice: {
    fontSize: 12,
    color: BrandColors.muted,
    textDecorationLine: 'line-through',
  },
  PinBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#d4ead6',
  },
  PinBtnActive: {
    backgroundColor: '#fff3cd',
    borderColor: '#f9a825',
  },
  PinIcon: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.deepGreen,
  },

  // ── Empty card ──
  EmptyCard: {
    backgroundColor: '#f7fbf7',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#d4ead6',
    padding: 20,
    alignItems: 'center',
  },
  EmptyText: {
    fontSize: 13,
    color: BrandColors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Freq list ──
  FreqList: {
    gap: 8,
  },
  FreqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7fbf7',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#d4ead6',
    padding: 12,
    gap: 12,
  },
  FreqIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  FreqIcon: { fontSize: 18 },
  FreqInfo: {
    flex: 1,
    gap: 2,
  },
  FreqName: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.darkText,
  },
  FreqMeta: {
    fontSize: 11,
    color: BrandColors.muted,
  },
  OnSaleBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BrandColors.mintGreen,
  },
  OnSaleText: {
    fontSize: 9,
    fontWeight: '800',
    color: BrandColors.midGreen,
    letterSpacing: 0.5,
  },
});
