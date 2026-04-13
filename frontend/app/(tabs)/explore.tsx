import { BrandColors } from '@/constants/theme';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { CatalogItem, useCatalog } from './CatalogContext';

const DELETE_BTN_W    = 72;
const SWIPE_THRESHOLD = -72;

// Item is frequented if scanned 3+ times OR manually starred
function IsFrequented(I: CatalogItem) { return I.ScanCount >= 3 || I.Starred; }

// ─── Swipeable row with checkbox ─────────────────────────────────────────────
function SwipeRow({
  Item,
  OnDelete,
  OnToggleStar,
  Checked,
  OnToggleCheck,
}: {
  Item:          CatalogItem;
  OnDelete:      (Id: string) => void;
  OnToggleStar:  (Id: string) => void;
}) {
  const TranslateX    = useSharedValue(0);
  const DeleteOpacity = useSharedValue(0);

  const PanGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((Event) => {
      const NewX          = Math.max(Event.translationX, -DELETE_BTN_W - 10);
      TranslateX.value    = Math.min(NewX, 0);
      DeleteOpacity.value = TranslateX.value < -20 ? 1 : 0;
    })
    .onEnd(() => {
      if (TranslateX.value < SWIPE_THRESHOLD) {
        TranslateX.value = withTiming(-DELETE_BTN_W, { duration: 200 });
      } else {
        TranslateX.value    = withSpring(0, { damping: 16 });
        DeleteOpacity.value = withTiming(0, { duration: 150 });
      }
    });

  const RowStyle       = useAnimatedStyle(() => ({ transform: [{ translateX: TranslateX.value }] }));
  const DeleteBtnStyle = useAnimatedStyle(() => ({ opacity: DeleteOpacity.value }));

  function CloseAndDelete() {
    TranslateX.value    = withTiming(0, { duration: 200 });
    DeleteOpacity.value = withTiming(0, { duration: 150 });
    runOnJS(OnDelete)(Item.Id);
  }

  const Freq = IsFrequented(Item);

  return (
    <View style={styles.SwipeContainer}>
      <Animated.View style={[styles.DeleteBtn, DeleteBtnStyle]}>
        <TouchableOpacity style={styles.DeleteBtnInner} onPress={CloseAndDelete} activeOpacity={0.85}>
          <Text style={styles.DeleteText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>

      <GestureDetector gesture={PanGesture}>
        <Animated.View style={[styles.ItemRow, Freq && styles.ItemRowFreq, RowStyle]}>

          {/* Scan count badge */}
          <View style={[styles.ScanBadge, Freq && styles.ScanBadgeFreq]}>
            <Text style={[styles.ScanBadgeNum, Freq && styles.ScanBadgeNumFreq]}>
              {Item.ScanCount}x
            </Text>
          </View>

          <View style={styles.ItemInfo}>
            <Text style={styles.ItemName} numberOfLines={1}>{Item.Name}</Text>
            <Text style={styles.ItemMeta}>Last: {Item.LastScan} · {Item.PriceRange}</Text>
          </View>

          {/* Star = manually promote/demote from Frequented */}
          <TouchableOpacity onPress={() => OnToggleStar(Item.Id)} activeOpacity={0.7} style={styles.StarBtn}>
            <Text style={[styles.StarIcon, Item.Starred && styles.StarIconActive]}>★</Text>
          </TouchableOpacity>

        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function CatalogScreen() {
  const { Items, DeleteItem, ToggleStar } = useCatalog();
  const [ActiveTab, SetActiveTab]         = useState<'all' | 'frequented' | 'purchased'>('all');

  const Frequented = Items.filter(IsFrequented);
  const Purchased  = Items.filter(I => !IsFrequented(I));

  function GetDisplayItems(): CatalogItem[] {
    const Base =
      ActiveTab === 'frequented' ? Frequented :
      ActiveTab === 'purchased'  ? Purchased  :
      // In "all" tab — frequented first, then purchased
      [...Frequented, ...Purchased];
    return Base;
  }

  function HandleDelete(Id: string) {
    Alert.alert('Delete Item', 'Remove this item from your catalog?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        DeleteItem(Id);
      }},
    ]);
  }

  const DisplayItems = GetDisplayItems();

  return (
    <View style={styles.Container}>
      <StatusBar style="dark" />

      <View style={styles.TabRow}>
        {(['all', 'frequented', 'purchased'] as const).map(Tab => (
          <TouchableOpacity
            key={Tab}
            style={[styles.TabBtn, ActiveTab === Tab && styles.TabBtnActive]}
            onPress={() => SetActiveTab(Tab)}
            activeOpacity={0.8}
          >
            <Text style={[styles.TabBtnText, ActiveTab === Tab && styles.TabBtnTextActive]}>
              {Tab === 'all' ? 'All' : Tab === 'frequented' ? 'Frequent' : 'Purchased'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {DisplayItems.length === 0 ? (
        <View style={styles.EmptyState}>
          <Text style={styles.EmptyTitle}>Nothing here yet</Text>
          <Text style={styles.EmptySub}>
            Scan a receipt to get started!
          </Text>
        </View>
      ) : (
        <FlatList
          data={DisplayItems}
          keyExtractor={I => I.Id}
          contentContainerStyle={styles.ListContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: Item, index: Index }) => {
            const FreqItems  = DisplayItems.filter(IsFrequented);
            const ShowFreqHeader  = ActiveTab === 'all' && Index === 0 && IsFrequented(Item);
            const ShowPurchHeader = ActiveTab === 'all' && (
              (Index === 0 && !IsFrequented(Item)) ||
              (Index > 0 && IsFrequented(DisplayItems[Index - 1]) && !IsFrequented(Item))
            );
            return (
              <>
                {ShowFreqHeader  && (
                  <View style={styles.SectionLabelWrap}>
                    <Text style={styles.SectionLabel}>FREQUENTED</Text>
                  </View>
                )}
                {ShowPurchHeader && (
                  <View style={styles.SectionLabelWrap}>
                    <Text style={styles.SectionLabel}>PURCHASED</Text>
                  </View>
                )}
                <SwipeRow
                  Item={Item}
                  OnDelete={HandleDelete}
                  OnToggleStar={ToggleStar}
                />
              </>
            );
          }}
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  Container:   { flex: 1, backgroundColor: '#ffffff' },
    TabRow:           { flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: BrandColors.mintTeal, paddingTop: 52 },
  TabBtn:           { flex: 1, paddingVertical: 12, alignItems: 'center' },
  TabBtnActive:     { borderBottomWidth: 2, borderBottomColor: BrandColors.deepTeal },
  TabBtnText:       { fontSize: 13, fontWeight: '600', color: BrandColors.muted },
  TabBtnTextActive: { color: BrandColors.deepTeal },

  SectionLabelWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 6, backgroundColor: BrandColors.offWhite, marginBottom: 2 },
  SectionLabel:     { fontSize: 11, fontWeight: '800', color: BrandColors.deepTeal, letterSpacing: 0.8 },
  SectionHint:      { fontSize: 10, color: BrandColors.muted, fontStyle: 'italic' },
  ListContent:      { paddingBottom: 100 },

  SwipeContainer: { position: 'relative', marginHorizontal: 16, marginBottom: 8 },
  DeleteBtn:      { position: 'absolute', right: 0, top: 0, bottom: 0, width: DELETE_BTN_W, borderRadius: 14, overflow: 'hidden' },
  DeleteBtnInner: { flex: 1, backgroundColor: '#ef5350', alignItems: 'center', justifyContent: 'center' },
  DeleteText:     { color: BrandColors.white, fontSize: 12, fontWeight: '700' },

  ItemRow:          { flexDirection: 'row', alignItems: 'center', backgroundColor: BrandColors.white, borderRadius: 14, padding: 12, borderWidth: 1.5, borderColor: BrandColors.mintTeal, gap: 10 },
  ItemRowFreq:      { borderColor: BrandColors.lightGold, backgroundColor: BrandColors.paleGold },

  ScanBadge:        { width: 34, height: 34, borderRadius: 9, backgroundColor: BrandColors.paleGreen, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ScanBadgeFreq:    { backgroundColor: BrandColors.deepTeal },
  ScanBadgeNum:     { fontSize: 11, fontWeight: '800', color: BrandColors.muted },
  ScanBadgeNumFreq: { color: BrandColors.white },

  ItemInfo:         { flex: 1, gap: 3 },
  ItemName:         { fontSize: 14, fontWeight: '600', color: BrandColors.darkText },
  ItemMeta:         { fontSize: 11, color: BrandColors.muted },

  StarBtn:          { padding: 4, flexShrink: 0 },
  StarIcon:         { fontSize: 22, color: BrandColors.mintTeal },
  StarIconActive:   { color: BrandColors.gold },

  EmptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 60 },
  EmptyTitle: { fontSize: 18, fontWeight: '800', color: BrandColors.deepTeal },
  EmptySub:   { fontSize: 14, color: BrandColors.muted, textAlign: 'center', paddingHorizontal: 40 },

});
