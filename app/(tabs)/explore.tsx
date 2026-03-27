import { BrandColors } from '@/constants/theme';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
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

// ─── Swipeable row ────────────────────────────────────────────────────────────
function SwipeRow({
  Item,
  OnDelete,
  OnToggleStar,
}: {
  Item:         CatalogItem;
  OnDelete:     (Id: string) => void;
  OnToggleStar: (Id: string) => void;
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

  return (
    <View style={styles.SwipeContainer}>
      <Animated.View style={[styles.DeleteBtn, DeleteBtnStyle]}>
        <TouchableOpacity style={styles.DeleteBtnInner} onPress={CloseAndDelete} activeOpacity={0.85}>
          <Text style={styles.DeleteText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>

      <GestureDetector gesture={PanGesture}>
        <Animated.View style={[styles.ItemRow, RowStyle]}>
          <View style={[styles.ScanBadge, Item.ScanCount >= 3 && styles.ScanBadgeFreq]}>
            <Text style={[styles.ScanBadgeNum, Item.ScanCount >= 3 && styles.ScanBadgeNumFreq]}>
              {Item.ScanCount}x
            </Text>
          </View>
          <View style={styles.ItemInfo}>
            <Text style={styles.ItemName} numberOfLines={1}>{Item.Name}</Text>
            <Text style={styles.ItemMeta}>Last: {Item.LastScan} · {Item.PriceRange}</Text>
          </View>
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
  const [Search, SetSearch]               = useState('');
  const [ActiveTab, SetActiveTab]         = useState<'all' | 'frequented' | 'purchased'>('all');

  const Frequented = Items.filter(I => I.ScanCount >= 3);
  const Purchased  = Items.filter(I => I.ScanCount < 3);

  function GetDisplayItems(): CatalogItem[] {
    const Base =
      ActiveTab === 'frequented' ? Frequented :
      ActiveTab === 'purchased'  ? Purchased  :
      Items;
    if (!Search.trim()) return Base;
    return Base.filter(I => I.Name.toLowerCase().includes(Search.toLowerCase()));
  }

  function HandleDelete(Id: string) {
    Alert.alert('Delete Item', 'Remove this item from your catalog?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => DeleteItem(Id) },
    ]);
  }

  const DisplayItems = GetDisplayItems();

  return (
    <View style={styles.Container}>
      <StatusBar style="dark" />

      <View style={styles.Header}>
        <Text style={styles.HeaderTitle}>Catalog</Text>
        <Text style={styles.HeaderSub}>{Items.length} item{Items.length !== 1 ? 's' : ''} tracked</Text>
      </View>

      <View style={styles.SearchBar}>
        <TextInput
          style={styles.SearchInput}
          placeholder="Search items…"
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

      <View style={styles.TabRow}>
        {(['all', 'frequented', 'purchased'] as const).map(Tab => (
          <TouchableOpacity
            key={Tab}
            style={[styles.TabBtn, ActiveTab === Tab && styles.TabBtnActive]}
            onPress={() => SetActiveTab(Tab)}
            activeOpacity={0.8}
          >
            <Text style={[styles.TabBtnText, ActiveTab === Tab && styles.TabBtnTextActive]}>
              {Tab === 'all'        ? `All (${Items.length})`        :
               Tab === 'frequented' ? `Freq. (${Frequented.length})` :
                                      `Bought (${Purchased.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {DisplayItems.length === 0 ? (
        <View style={styles.EmptyState}>
          <Text style={styles.EmptyTitle}>Nothing here yet</Text>
          <Text style={styles.EmptySub}>
            {Search ? 'No items match your search.' : 'Scan a receipt to get started!'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={DisplayItems}
          keyExtractor={I => I.Id}
          contentContainerStyle={styles.ListContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: Item, index: Index }) => {
            const ShowFreqHeader  = ActiveTab === 'all' && Index === 0 && Item.ScanCount >= 3;
            const ShowPurchHeader = ActiveTab === 'all' && (
              (Index === 0 && Item.ScanCount < 3) ||
              (Index > 0 && DisplayItems[Index - 1].ScanCount >= 3 && Item.ScanCount < 3)
            );
            return (
              <>
                {ShowFreqHeader  && <Text style={styles.SectionLabel}>FREQUENTED</Text>}
                {ShowPurchHeader && <Text style={styles.SectionLabel}>PURCHASED</Text>}
                <SwipeRow Item={Item} OnDelete={HandleDelete} OnToggleStar={ToggleStar} />
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
  Header:      { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 12 },
  HeaderTitle: { fontSize: 30, fontWeight: '800', color: BrandColors.deepGreen, letterSpacing: 0.3 },
  HeaderSub:   { fontSize: 13, color: BrandColors.muted, marginTop: 2 },

  SearchBar:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f7fbf7', borderWidth: 1.5, borderColor: '#d4ead6', borderRadius: 14, marginHorizontal: 24, marginBottom: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  SearchInput: { flex: 1, fontSize: 15, color: BrandColors.darkText },
  SearchClear: { fontSize: 13, color: BrandColors.muted, fontWeight: '700' },

  TabRow:          { flexDirection: 'row', paddingHorizontal: 24, gap: 8, marginBottom: 12 },
  TabBtn:          { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: '#f0f7f0' },
  TabBtnActive:    { backgroundColor: BrandColors.deepGreen },
  TabBtnText:      { fontSize: 11, fontWeight: '700', color: BrandColors.muted },
  TabBtnTextActive:{ color: BrandColors.white },

  SectionLabel: { fontSize: 11, fontWeight: '700', color: BrandColors.muted, letterSpacing: 0.8, paddingHorizontal: 24, paddingVertical: 8, backgroundColor: '#f7fbf7', marginBottom: 2 },
  ListContent:  { paddingBottom: 32 },

  SwipeContainer: { position: 'relative', marginHorizontal: 16, marginBottom: 8 },
  DeleteBtn:      { position: 'absolute', right: 0, top: 0, bottom: 0, width: DELETE_BTN_W, borderRadius: 14, overflow: 'hidden' },
  DeleteBtnInner: { flex: 1, backgroundColor: '#ef5350', alignItems: 'center', justifyContent: 'center' },
  DeleteText:     { color: BrandColors.white, fontSize: 12, fontWeight: '700' },

  ItemRow:         { flexDirection: 'row', alignItems: 'center', backgroundColor: BrandColors.white, borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#e8f5e9', gap: 12, shadowColor: BrandColors.deepGreen, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  ScanBadge:       { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f0f7f0', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ScanBadgeFreq:   { backgroundColor: BrandColors.deepGreen },
  ScanBadgeNum:    { fontSize: 12, fontWeight: '800', color: BrandColors.muted },
  ScanBadgeNumFreq:{ color: BrandColors.white },
  ItemInfo:        { flex: 1, gap: 3 },
  ItemName:        { fontSize: 15, fontWeight: '600', color: BrandColors.darkText },
  ItemMeta:        { fontSize: 11, color: BrandColors.muted },
  StarBtn:         { padding: 4, flexShrink: 0 },
  StarIcon:        { fontSize: 22, color: '#d4ead6' },
  StarIconActive:  { color: '#f9a825' },

  EmptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 60 },
  EmptyTitle: { fontSize: 18, fontWeight: '800', color: BrandColors.deepGreen },
  EmptySub:   { fontSize: 14, color: BrandColors.muted, textAlign: 'center', paddingHorizontal: 40 },
});
