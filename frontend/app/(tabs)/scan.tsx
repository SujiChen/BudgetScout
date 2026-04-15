import { BrandColors } from '@/constants/theme';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useCatalog } from './CatalogContext';

const { width } = Dimensions.get('window');

// ─── UPDATE this every time ngrok restarts — run: ngrok http 5001 ─────────────
const NGROK_URL   = process.env.EXPO_PUBLIC_API_URL!;
const SCAN_API_URL = `${NGROK_URL}/api/scan`;
const RETICLE = {
  receipt: { w: width * 0.78, h: 200 },
  barcode: { w: width * 0.78, h: 110 },
};

type ScanMode   = 'receipt' | 'barcode';
type ScanStatus = 'idle' | 'scanning' | 'success' | 'error';

// ─── Call the scan server with a base64 image ─────────────────────────────────
async function CallScanAPI(base64Image: string): Promise<string[]> {
  console.log('Calling scan API:', SCAN_API_URL);
  
  let res: Response;
  try {
    res = await fetch(SCAN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'BudgetScoutApp',
      },
      body: JSON.stringify({ image: base64Image }),
    });
  } catch (fetchErr: any) {
    console.error('Fetch threw:', fetchErr.message, fetchErr.cause);
    throw fetchErr;
  }

  console.log('Response status:', res.status);
  if (!res.ok) throw new Error(`Server error: ${res.status}`);

  const json = await res.json();
  console.log('Response JSON:', JSON.stringify(json).slice(0, 200));
  if (!json.items || json.items.length === 0) throw new Error('No items found');

  return json.items.map((item: { name: string; price: string }) =>
    `${item.name} — ${item.price}`
  );
}

export default function ScanScreen() {
  const { AddItems } = useCatalog();

  const [Permission, RequestPermission] = useCameraPermissions();
  const [Mode, SetMode]                 = useState<ScanMode>('receipt');
  const [Status, SetStatus]             = useState<ScanStatus>('idle');
  const [Results, SetResults]           = useState<string[]>([]);
  const [ShowSheet, SetShowSheet]       = useState(false);
  const CameraRef                       = useRef<CameraView>(null);

  const ReticlePulse  = useSharedValue(1);
  const ReticleColor  = useSharedValue(0);
  const ScanLine      = useSharedValue(0);
  const SheetY        = useSharedValue(400);
  const ModeToggle    = useSharedValue(0);

  useEffect(() => {
    StartIdlePulse();
  }, []);

  function StartIdlePulse() {
    ReticlePulse.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }

  function StopPulse() {
    cancelAnimation(ReticlePulse);
    ReticlePulse.value = withTiming(1, { duration: 200 });
  }

  function StartScanLine() {
    ScanLine.value = 0;
    ScanLine.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }

  function StopScanLine() {
    cancelAnimation(ScanLine);
    ScanLine.value = withTiming(0, { duration: 200 });
  }

  function SwitchMode(NewMode: ScanMode) {
    if (Status === 'scanning') return;
    SetMode(NewMode);
    ModeToggle.value = withTiming(NewMode === 'receipt' ? 0 : 1, {
      duration: 300,
      easing: Easing.inOut(Easing.quad),
    });
    ResetScan();
  }

  function ResetScan() {
    SetStatus('idle');
    SetResults([]);
    SetShowSheet(false);
    SheetY.value       = withTiming(400, { duration: 250 });
    ReticleColor.value = withTiming(0, { duration: 300 });
    StopScanLine();
    StartIdlePulse();
  }

  async function HandleScan() {
    if (Status === 'scanning') return;
    if (!CameraRef.current) return;

    SetStatus('scanning');
    StopPulse();
    StartScanLine();
    ReticleColor.value = withTiming(0, { duration: 200 });

    try {
      // Take a photo and get base64
      const Photo = await CameraRef.current.takePictureAsync({
        base64:  true,
        quality: 0.3,
        exif:    false,
      });

      if (!Photo?.base64) throw new Error('Could not capture image');

      // Send to scan server
      const Items = await CallScanAPI(Photo.base64);

      StopScanLine();
      ReticleColor.value = withTiming(1, { duration: 300 });
      SetResults(Items);
      SetStatus('success');
      setTimeout(() => {
        SetShowSheet(true);
        SheetY.value = withSpring(0, { damping: 18, stiffness: 120 });
      }, 400);
    } catch (err: any) {
      StopScanLine();
      ReticleColor.value = withTiming(2, { duration: 300 });
      SetStatus('error');
      console.error('Scan error:', err.message);
      setTimeout(() => ResetScan(), 1800);
    }
  }

  function HandleAddToCatalog() {
    AddItems(Results);
    ResetScan();
    Alert.alert('Added!', `${Results.length} item${Results.length !== 1 ? 's' : ''} saved to your Catalog.`);
  }

  const CurrentReticle = RETICLE[Mode];

  const ReticleStyle = useAnimatedStyle(() => ({
    width:       CurrentReticle.w,
    height:      CurrentReticle.h,
    borderColor: interpolateColor(ReticleColor.value, [0, 1, 2], ['#f9a825', BrandColors.mintGreen, '#ef5350']),
    opacity:     ReticlePulse.value,
  }));

  const CornerColor = useAnimatedStyle(() => ({
    borderColor: interpolateColor(ReticleColor.value, [0, 1, 2], ['#ffffff', BrandColors.mintGreen, '#ef5350']),
  }));

  const ScanLineStyle = useAnimatedStyle(() => ({
    opacity:   Status === 'scanning' ? 0.9 : 0,
    transform: [{ translateY: interpolate(ScanLine.value, [0, 1], [0, CurrentReticle.h - 2], Extrapolation.CLAMP) }],
  }));

  const StatusBadgeStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(ReticleColor.value, [0, 1, 2],
      ['rgba(249,168,37,0.85)', 'rgba(46,204,113,0.85)', 'rgba(239,83,80,0.85)']),
  }));

  const ToggleIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(ModeToggle.value, [0, 1], [0, 130], Extrapolation.CLAMP) }],
  }));

  const SheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: SheetY.value }],
  }));

  if (!Permission) return <View style={styles.Container} />;

  if (!Permission.granted) {
    return (
      <View style={[styles.Container, styles.PermissionScreen]}>
        <Text style={styles.PermissionTitle}>Camera Access Needed</Text>
        <Text style={styles.PermissionSub}>BudgetScout needs camera access to scan receipts and barcodes.</Text>
        <TouchableOpacity style={styles.PermissionBtn} onPress={RequestPermission}>
          <Text style={styles.PermissionBtnText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const StatusLabel =
    Status === 'idle'     ? 'Align receipt within frame' :
    Status === 'scanning' ? 'Scanning…'                  :
    Status === 'success'  ? '✓ Scan successful'          :
                            '✗ Try again';

  return (
    <View style={styles.Container}>
      <StatusBar style="light" />
      <CameraView ref={CameraRef} style={StyleSheet.absoluteFill} facing="back" />
      <View style={styles.Overlay} />

      <Animated.View style={[styles.Header]}>
        <Text style={styles.HeaderTitle}>Scan</Text>
        <View style={styles.ModeToggle}>
          <Animated.View style={[styles.ModeIndicator, ToggleIndicatorStyle]} />
          <TouchableOpacity style={styles.ModeBtn} onPress={() => SwitchMode('receipt')} activeOpacity={0.8}>
            <Text style={[styles.ModeBtnText, Mode === 'receipt' && styles.ModeBtnActive]}>Receipt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ModeBtn} onPress={() => SwitchMode('barcode')} activeOpacity={0.8}>
            <Text style={[styles.ModeBtnText, Mode === 'barcode' && styles.ModeBtnActive]}>Barcode</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <View style={styles.ReticleArea}>
        <Animated.View style={[styles.Reticle, ReticleStyle]}>
          <Animated.View style={[styles.Corner, styles.CornerTL, CornerColor]} />
          <Animated.View style={[styles.Corner, styles.CornerTR, CornerColor]} />
          <Animated.View style={[styles.Corner, styles.CornerBL, CornerColor]} />
          <Animated.View style={[styles.Corner, styles.CornerBR, CornerColor]} />
          <Animated.View style={[styles.ScanLine, ScanLineStyle]} />
        </Animated.View>
        <Animated.View style={[styles.StatusBadge, StatusBadgeStyle]}>
          <Text style={styles.StatusText}>{StatusLabel}</Text>
        </Animated.View>
      </View>

      <View style={styles.ShutterArea}>
        <TouchableOpacity
          style={[styles.ShutterBtn, Status === 'scanning' && styles.ShutterBtnDisabled]}
          onPress={HandleScan}
          disabled={Status === 'scanning'}
          activeOpacity={0.85}
        >
          <View style={styles.ShutterInner} />
        </TouchableOpacity>
        <Text style={styles.ShutterHint}>
          {Status === 'scanning' ? 'Processing…' : 'Tap to scan'}
        </Text>
      </View>

      {ShowSheet && (
        <Animated.View style={[styles.Sheet, SheetStyle]}>
          <View style={styles.SheetHandle} />
          <Text style={styles.SheetTitle}>
            {Results.length > 0 ? `${Results.length} Items Found` : 'No Items Found'}
          </Text>
          <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
            <View style={styles.ResultsList}>
              {Results.map((Item, Index) => (
                <View key={Index} style={styles.ResultRow}>
                  <Text style={styles.ResultDot}>●</Text>
                  <Text style={styles.ResultText}>{Item}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
          <View style={styles.SheetBtns}>
            <TouchableOpacity style={styles.SheetBtnSecondary} onPress={ResetScan} activeOpacity={0.85}>
              <Text style={styles.SheetBtnSecondaryText}>Scan Again</Text>
            </TouchableOpacity>
            {Results.length > 0 && (
              <TouchableOpacity style={styles.SheetBtnPrimary} onPress={HandleAddToCatalog} activeOpacity={0.85}>
                <Text style={styles.SheetBtnPrimaryText}>Add to Catalog</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  Container: { flex: 1, backgroundColor: '#000' },
  Overlay:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },

  PermissionScreen:  { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 14 },
  PermissionTitle:   { fontSize: 22, fontWeight: '800', color: BrandColors.white, textAlign: 'center' },
  PermissionSub:     { fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 20 },
  PermissionBtn:     { backgroundColor: BrandColors.midGreen, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, marginTop: 8 },
  PermissionBtnText: { color: BrandColors.white, fontWeight: '700', fontSize: 15 },

  Header:      { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16, alignItems: 'center', gap: 16, zIndex: 10 },
  HeaderTitle: { fontSize: 28, fontWeight: '800', color: BrandColors.white, letterSpacing: 0.3 },

  ModeToggle:    { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 3, position: 'relative', width: 266 },
  ModeIndicator: { position: 'absolute', top: 3, left: 3, width: 130, bottom: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  ModeBtn:       { width: 130, paddingVertical: 9, alignItems: 'center', zIndex: 1 },
  ModeBtnText:   { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  ModeBtnActive: { color: BrandColors.white, fontWeight: '800' },

  ReticleArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  Reticle:     { borderWidth: 1.5, borderRadius: 12, position: 'relative', overflow: 'hidden' },

  Corner:   { position: 'absolute', width: 22, height: 22, borderWidth: 3 },
  CornerTL: { top: -1, left: -1, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 10 },
  CornerTR: { top: -1, right: -1, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 10 },
  CornerBL: { bottom: -1, left: -1, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 10 },
  CornerBR: { bottom: -1, right: -1, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 10 },

  ScanLine: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: BrandColors.mintGreen, shadowColor: BrandColors.mintGreen, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6 },

  StatusBadge: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  StatusText:  { color: BrandColors.white, fontSize: 13, fontWeight: '700' },

  ShutterArea:        { alignItems: 'center', paddingBottom: 52, gap: 10 },
  ShutterBtn:         { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: BrandColors.white, alignItems: 'center', justifyContent: 'center' },
  ShutterBtnDisabled: { borderColor: 'rgba(255,255,255,0.3)' },
  ShutterInner:       { width: 54, height: 54, borderRadius: 27, backgroundColor: BrandColors.white },
  ShutterHint:        { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '500' },

  Sheet:       { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: BrandColors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 44, shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 20 },
  SheetHandle: { width: 40, height: 4, backgroundColor: '#d4ead6', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  SheetTitle:  { fontSize: 18, fontWeight: '800', color: BrandColors.deepGreen, marginBottom: 16 },
  ResultsList: { gap: 10, marginBottom: 24 },
  ResultRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f7fbf7', borderRadius: 12, padding: 12 },
  ResultDot:   { color: BrandColors.midGreen, fontSize: 8 },
  ResultText:  { fontSize: 14, color: BrandColors.darkText, fontWeight: '500', flex: 1 },

  SheetBtns:             { flexDirection: 'row', gap: 12 },
  SheetBtnSecondary:     { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#d4ead6', backgroundColor: '#f7fbf7' },
  SheetBtnSecondaryText: { color: BrandColors.deepGreen, fontWeight: '700', fontSize: 14 },
  SheetBtnPrimary:       { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: BrandColors.midGreen, shadowColor: BrandColors.midGreen, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  SheetBtnPrimaryText:   { color: BrandColors.white, fontWeight: '700', fontSize: 14 },
});
