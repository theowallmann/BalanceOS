import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../src/constants/colors';
import { useLanguage } from '../src/hooks/useLanguage';
import { vitalsService, profileService } from '../src/database/services';
import { getDateString, getDisplayDate, getPreviousDay, getNextDay, isToday } from '../src/utils/date';

export default function VitalsScreen() {
  const { t, language } = useLanguage();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);
  const [bmrModalVisible, setBmrModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [vitals, setVitals] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const [formData, setFormData] = useState({
    weight: '', body_fat: '', sleep_start: '', sleep_end: '',
    sleep_quality: '', morning_energy: '', resting_heart_rate: '',
  });

  const dateString = getDateString(selectedDate);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [vit, prof] = await Promise.all([vitalsService.getByDate(dateString), profileService.get()]);
      setVitals(vit);
      setProfile(prof);
    } catch (error) { console.error('Error loading vitals:', error); }
    finally { setIsLoading(false); }
  }, [dateString]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const goToPreviousDay = () => setSelectedDate(getPreviousDay(selectedDate));
  const goToNextDay = () => { if (!isToday(selectedDate)) setSelectedDate(getNextDay(selectedDate)); };

  const calculateAge = (birthDate: string | null): number | null => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const calculateBMR_MifflinStJeor = () => {
    const weight = vitals?.weight; const height = profile?.height;
    const age = calculateAge(profile?.birth_date); const gender = profile?.gender;
    const missingData: string[] = [];
    if (!weight) missingData.push('Gewicht'); if (!height) missingData.push('Grosse (Profil)');
    if (!age) missingData.push('Geburtsdatum (Profil)'); if (!gender) missingData.push('Geschlecht (Profil)');
    if (missingData.length > 0) return { value: null, formula: '', missingData };
    const genderOffset = gender === 'female' ? -161 : 5;
    const bmr = Math.round(10 * weight! + 6.25 * height! - 5 * age! + genderOffset);
    const formula = `10 x ${weight}kg + 6,25 x ${height}cm - 5 x ${age}J ${gender === 'female' ? '- 161' : '+ 5'} = ${bmr} kcal`;
    return { value: bmr, formula, missingData: [] };
  };

  const calculateBMR_KatchMcArdle = () => {
    const weight = vitals?.weight; const bodyFat = vitals?.body_fat;
    const missingData: string[] = [];
    if (!weight) missingData.push('Gewicht'); if (!bodyFat) missingData.push('Korperfett');
    if (missingData.length > 0) return { value: null, formula: '', missingData };
    const lbm = weight! * (1 - bodyFat! / 100);
    const bmr = Math.round(370 + 21.6 * lbm);
    const formula = `LBM = ${weight}kg x (1 - ${bodyFat}%/100) = ${lbm.toFixed(1)}kg\nBMR = 370 + 21,6 x ${lbm.toFixed(1)} = ${bmr} kcal`;
    return { value: bmr, formula, missingData: [] };
  };

  const calculateNEAT = (bmr: number | null): number | null => {
    if (!bmr) return null;
    return Math.round(bmr * 1.375 - bmr);
  };

  const bmrMifflin = calculateBMR_MifflinStJeor();
  const bmrKatch = calculateBMR_KatchMcArdle();
  const bestBMR = bmrKatch.value || bmrMifflin.value;
  const neat = calculateNEAT(bestBMR);

  const openEditModal = () => {
    setFormData({
      weight: vitals?.weight?.toString() || '', body_fat: vitals?.body_fat?.toString() || '',
      sleep_start: vitals?.sleep_start || '', sleep_end: vitals?.sleep_end || '',
      sleep_quality: vitals?.sleep_quality?.toString() || '', morning_energy: vitals?.morning_energy?.toString() || '',
      resting_heart_rate: vitals?.resting_heart_rate?.toString() || '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    const data: any = {};
    if (formData.weight) data.weight = parseFloat(formData.weight);
    if (formData.body_fat) data.body_fat = parseFloat(formData.body_fat);
    if (formData.sleep_start) data.sleep_start = formData.sleep_start;
    if (formData.sleep_end) data.sleep_end = formData.sleep_end;
    if (formData.sleep_quality) data.sleep_quality = parseInt(formData.sleep_quality);
    if (formData.morning_energy) data.morning_energy = parseInt(formData.morning_energy);
    if (formData.resting_heart_rate) data.resting_heart_rate = parseInt(formData.resting_heart_rate);

    // Calculate sleep duration
    if (data.sleep_start && data.sleep_end) {
      const [sh, sm] = data.sleep_start.split(':').map(Number);
      const [eh, em] = data.sleep_end.split(':').map(Number);
      let dur = (eh * 60 + em) - (sh * 60 + sm);
      if (dur < 0) dur += 24 * 60;
      data.sleep_duration = Math.round(dur / 60 * 10) / 10;
    }

    try {
      await vitalsService.createOrUpdate(dateString, data);
      setModalVisible(false);
      loadData();
    } catch (error) { Alert.alert('Fehler', 'Speichern fehlgeschlagen'); }
  };

  const renderVitalCard = (icon: string, label: string, value: any, unit: string, color: string) => (
    <TouchableOpacity style={styles.vitalCard} onPress={openEditModal}>
      <View style={[styles.vitalIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <View style={styles.vitalInfo}>
        <Text style={styles.vitalLabel}>{label}</Text>
        <Text style={styles.vitalValue}>{value !== null && value !== undefined ? `${value} ${unit}` : '-'}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );

  const renderRatingBar = (label: string, value: number | null, max: number = 10) => {
    const displayValue = value || 0;
    const percentage = (displayValue / max) * 100;
    return (
      <View style={styles.ratingContainer}>
        <Text style={styles.ratingLabel}>{label}</Text>
        <View style={styles.ratingBarBg}><View style={[styles.ratingBarFill, { width: `${percentage}%` }]} /></View>
        <Text style={styles.ratingValue}>{displayValue}/{max}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.dateNav}>
          <TouchableOpacity onPress={goToPreviousDay} style={styles.dateNavButton}><Ionicons name="chevron-back" size={28} color={COLORS.text} /></TouchableOpacity>
          <Text style={styles.dateText}>{getDisplayDate(selectedDate, language)}</Text>
          <TouchableOpacity onPress={goToNextDay} style={[styles.dateNavButton, isToday(selectedDate) && styles.dateNavButtonDisabled]} disabled={isToday(selectedDate)}>
            <Ionicons name="chevron-forward" size={28} color={isToday(selectedDate) ? COLORS.textSecondary : COLORS.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView}>
          {isLoading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} /> : (
            <>
              {(profile?.tracking_settings?.track_weight !== false || profile?.tracking_settings?.track_body_fat !== false) && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Korperdaten</Text>
                  {profile?.tracking_settings?.track_weight !== false && renderVitalCard('scale', t('weight'), vitals?.weight, t('kg'), COLORS.info)}
                  {profile?.tracking_settings?.track_body_fat !== false && renderVitalCard('body', t('bodyFat'), vitals?.body_fat, '%', COLORS.secondary)}
                </View>
              )}

              {profile?.tracking_settings?.track_bmr_neat !== false && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Stoffwechsel</Text>
                  <TouchableOpacity style={styles.metabolicCard} onPress={() => setBmrModalVisible(true)} activeOpacity={0.7}>
                    <View style={styles.metabolicItem}><Ionicons name="flash" size={28} color={COLORS.accent} /><Text style={styles.metabolicValue}>{bestBMR || '-'}</Text><Text style={styles.metabolicLabel}>BMR (kcal)</Text></View>
                    <View style={styles.metabolicItem}><Ionicons name="flame" size={28} color={COLORS.calories} /><Text style={styles.metabolicValue}>{neat || '-'}</Text><Text style={styles.metabolicLabel}>NEAT (kcal)</Text></View>
                    <View style={styles.metabolicInfoIcon}><Ionicons name="information-circle-outline" size={20} color={COLORS.textSecondary} /></View>
                  </TouchableOpacity>
                  {!bestBMR && (
                    <View style={styles.missingDataBanner}><Ionicons name="alert-circle-outline" size={16} color={COLORS.accent} /><Text style={styles.missingDataText}>Fehlende Daten: {[...new Set([...bmrMifflin.missingData, ...bmrKatch.missingData])].join(', ')}</Text></View>
                  )}
                </View>
              )}

              {profile?.tracking_settings?.track_sleep !== false && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Schlaf</Text>
                  <View style={styles.sleepCard}>
                    <View style={styles.sleepTimeRow}>
                      <TouchableOpacity style={styles.sleepTimeItem} onPress={openEditModal}><Ionicons name="moon" size={20} color={COLORS.secondary} /><Text style={styles.sleepTimeLabel}>{t('sleepStart')}</Text><Text style={styles.sleepTimeValue}>{vitals?.sleep_start || '--:--'}</Text></TouchableOpacity>
                      <View style={styles.sleepArrow}><Ionicons name="arrow-forward" size={20} color={COLORS.textSecondary} /></View>
                      <TouchableOpacity style={styles.sleepTimeItem} onPress={openEditModal}><Ionicons name="sunny" size={20} color={COLORS.accent} /><Text style={styles.sleepTimeLabel}>{t('sleepEnd')}</Text><Text style={styles.sleepTimeValue}>{vitals?.sleep_end || '--:--'}</Text></TouchableOpacity>
                    </View>
                    {vitals?.sleep_duration && (
                      <View style={styles.sleepDuration}><Ionicons name="time" size={24} color={COLORS.primary} /><Text style={styles.sleepDurationText}>{vitals.sleep_duration} {t('hours')} {t('sleepDuration')}</Text></View>
                    )}
                  </View>
                  {(profile?.tracking_settings?.track_sleep_quality !== false || profile?.tracking_settings?.track_morning_energy !== false) && (
                    <View style={styles.ratingsCard}>
                      {profile?.tracking_settings?.track_sleep_quality !== false && <TouchableOpacity onPress={openEditModal}>{renderRatingBar(t('sleepQuality'), vitals?.sleep_quality)}</TouchableOpacity>}
                      {profile?.tracking_settings?.track_morning_energy !== false && <TouchableOpacity onPress={openEditModal}>{renderRatingBar(t('morningEnergy'), vitals?.morning_energy)}</TouchableOpacity>}
                    </View>
                  )}
                </View>
              )}

              {profile?.tracking_settings?.track_resting_heart_rate !== false && (
                <View style={styles.section}><Text style={styles.sectionTitle}>Herz</Text>{renderVitalCard('heart', t('restingHeartRate'), vitals?.resting_heart_rate, t('bpm'), COLORS.error)}</View>
              )}
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>

        <TouchableOpacity style={styles.editButton} onPress={openEditModal}><Ionicons name="pencil" size={24} color={COLORS.text} /></TouchableOpacity>

        {/* Edit Modal */}
        <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}><View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Vitaldaten bearbeiten</Text><TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={28} color={COLORS.text} /></TouchableOpacity></View>
            <ScrollView style={styles.modalScroll}>
              <View style={styles.inputRow}>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>{t('weight')} ({t('kg')})</Text><TextInput style={styles.textInput} value={formData.weight} onChangeText={(text) => setFormData(prev => ({ ...prev, weight: text }))} keyboardType="decimal-pad" placeholder="z.B. 75.5" placeholderTextColor={COLORS.textSecondary} /></View>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>{t('bodyFat')} (%)</Text><TextInput style={styles.textInput} value={formData.body_fat} onChangeText={(text) => setFormData(prev => ({ ...prev, body_fat: text }))} keyboardType="decimal-pad" placeholder="z.B. 18.5" placeholderTextColor={COLORS.textSecondary} /></View>
              </View>
              <View style={styles.inputRow}>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>{t('sleepStart')} (HH:MM)</Text><TextInput style={styles.textInput} value={formData.sleep_start} onChangeText={(text) => setFormData(prev => ({ ...prev, sleep_start: text }))} placeholder="z.B. 23:00" placeholderTextColor={COLORS.textSecondary} /></View>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>{t('sleepEnd')} (HH:MM)</Text><TextInput style={styles.textInput} value={formData.sleep_end} onChangeText={(text) => setFormData(prev => ({ ...prev, sleep_end: text }))} placeholder="z.B. 07:00" placeholderTextColor={COLORS.textSecondary} /></View>
              </View>
              <View style={styles.inputRow}>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>{t('sleepQuality')} (1-10)</Text><TextInput style={styles.textInput} value={formData.sleep_quality} onChangeText={(text) => setFormData(prev => ({ ...prev, sleep_quality: text }))} keyboardType="numeric" placeholder="1-10" placeholderTextColor={COLORS.textSecondary} /></View>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>{t('morningEnergy')} (1-10)</Text><TextInput style={styles.textInput} value={formData.morning_energy} onChangeText={(text) => setFormData(prev => ({ ...prev, morning_energy: text }))} keyboardType="numeric" placeholder="1-10" placeholderTextColor={COLORS.textSecondary} /></View>
              </View>
              <Text style={styles.inputLabel}>{t('restingHeartRate')} ({t('bpm')})</Text>
              <TextInput style={styles.textInput} value={formData.resting_heart_rate} onChangeText={(text) => setFormData(prev => ({ ...prev, resting_heart_rate: text }))} keyboardType="numeric" placeholder="z.B. 60" placeholderTextColor={COLORS.textSecondary} />
            </ScrollView>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}><Text style={styles.saveButtonText}>{t('save')}</Text></TouchableOpacity>
          </View></View>
        </Modal>

        {/* BMR/NEAT Modal */}
        <Modal visible={bmrModalVisible} animationType="slide" transparent={true} onRequestClose={() => setBmrModalVisible(false)}>
          <View style={styles.modalOverlay}><View style={styles.bmrModalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>BMR & NEAT Berechnung</Text><TouchableOpacity onPress={() => setBmrModalVisible(false)}><Ionicons name="close" size={24} color={COLORS.text} /></TouchableOpacity></View>
            <ScrollView style={styles.bmrModalScroll}>
              <View style={styles.calculationSection}>
                <View style={styles.calculationHeader}><Ionicons name="calculator" size={20} color={COLORS.primary} /><Text style={styles.calculationTitle}>Mifflin-St Jeor Formel</Text></View>
                {bmrMifflin.value ? (
                  <View style={styles.calculationResult}><Text style={styles.calculationFormula}>{bmrMifflin.formula}</Text><Text style={styles.resultValue}>{bmrMifflin.value} kcal/Tag</Text></View>
                ) : (
                  <View style={styles.missingDataBox}><Ionicons name="alert-circle" size={20} color={COLORS.accent} /><Text style={styles.missingDataBoxText}>Fehlende Daten: {bmrMifflin.missingData.join(', ')}</Text></View>
                )}
              </View>
              <View style={styles.calculationSection}>
                <View style={styles.calculationHeader}><Ionicons name="calculator" size={20} color={COLORS.secondary} /><Text style={styles.calculationTitle}>Katch-McArdle Formel</Text></View>
                {bmrKatch.value ? (
                  <View style={styles.calculationResult}><Text style={styles.calculationFormula}>{bmrKatch.formula}</Text><Text style={styles.resultValue}>{bmrKatch.value} kcal/Tag</Text></View>
                ) : (
                  <View style={styles.missingDataBox}><Ionicons name="alert-circle" size={20} color={COLORS.accent} /><Text style={styles.missingDataBoxText}>Fehlende Daten: {bmrKatch.missingData.join(', ')}</Text></View>
                )}
              </View>
              <View style={styles.calculationSection}>
                <View style={styles.calculationHeader}><Ionicons name="flame" size={20} color={COLORS.calories} /><Text style={styles.calculationTitle}>NEAT</Text></View>
                {neat ? (
                  <View style={styles.calculationResult}><Text style={styles.calculationFormula}>NEAT = {bestBMR} x 1,375 - {bestBMR} = {neat} kcal</Text><Text style={styles.resultValue}>{neat} kcal/Tag</Text></View>
                ) : (
                  <View style={styles.missingDataBox}><Ionicons name="alert-circle" size={20} color={COLORS.accent} /><Text style={styles.missingDataBoxText}>BMR wird benotigt um NEAT zu berechnen</Text></View>
                )}
              </View>
              <View style={styles.infoBox}><Ionicons name="information-circle" size={20} color={COLORS.info} /><Text style={styles.infoBoxText}>BMR (Basal Metabolic Rate) ist dein Grundumsatz. NEAT sind die Kalorien die du durch Alltagsaktivitaten verbrauchst.</Text></View>
            </ScrollView>
          </View></View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  dateNavButton: { padding: 8 }, dateNavButtonDisabled: { opacity: 0.5 },
  dateText: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  scrollView: { flex: 1, paddingHorizontal: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  vitalCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 16, borderRadius: 12, marginBottom: 8 },
  vitalIconContainer: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  vitalInfo: { flex: 1, marginLeft: 12 },
  vitalLabel: { fontSize: 14, color: COLORS.textSecondary },
  vitalValue: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  metabolicCard: { flexDirection: 'row', backgroundColor: COLORS.surface, padding: 20, borderRadius: 12, justifyContent: 'space-around' },
  metabolicItem: { alignItems: 'center' },
  metabolicValue: { fontSize: 28, fontWeight: '700', color: COLORS.text, marginTop: 8 },
  metabolicLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  metabolicInfoIcon: { position: 'absolute', right: 12, top: 12 },
  missingDataBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.accent + '20', padding: 10, borderRadius: 8, marginTop: 8, gap: 8 },
  missingDataText: { fontSize: 12, color: COLORS.accent, flex: 1 },
  sleepCard: { backgroundColor: COLORS.surface, padding: 16, borderRadius: 12, marginBottom: 8 },
  sleepTimeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sleepTimeItem: { flex: 1, alignItems: 'center', padding: 12 },
  sleepTimeLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  sleepTimeValue: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginTop: 4 },
  sleepArrow: { paddingHorizontal: 8 },
  sleepDuration: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.surfaceLight },
  sleepDurationText: { fontSize: 16, color: COLORS.text, marginLeft: 8 },
  ratingsCard: { backgroundColor: COLORS.surface, padding: 16, borderRadius: 12 },
  ratingContainer: { marginBottom: 16 },
  ratingLabel: { fontSize: 14, color: COLORS.text, marginBottom: 8 },
  ratingBarBg: { height: 8, backgroundColor: COLORS.surfaceLight, borderRadius: 4, overflow: 'hidden' },
  ratingBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  ratingValue: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'right', marginTop: 4 },
  editButton: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceLight },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  modalScroll: { padding: 16 },
  inputRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 6 },
  textInput: { backgroundColor: COLORS.surfaceLight, borderRadius: 12, padding: 14, color: COLORS.text, fontSize: 16 },
  saveButton: { backgroundColor: COLORS.primary, marginHorizontal: 16, borderRadius: 12, padding: 16, alignItems: 'center' },
  saveButtonText: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  bmrModalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  bmrModalScroll: { padding: 16 },
  calculationSection: { backgroundColor: COLORS.surfaceLight, borderRadius: 12, padding: 16, marginBottom: 16 },
  calculationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 },
  calculationTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  calculationResult: { borderTopWidth: 1, borderTopColor: COLORS.surface, paddingTop: 12 },
  calculationFormula: { fontSize: 14, color: COLORS.text, marginBottom: 8, lineHeight: 22 },
  resultValue: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  missingDataBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.accent + '15', padding: 12, borderRadius: 8, gap: 8 },
  missingDataBoxText: { fontSize: 13, color: COLORS.accent, flex: 1 },
  infoBox: { flexDirection: 'row', backgroundColor: COLORS.info + '15', padding: 12, borderRadius: 8, marginBottom: 16, gap: 10 },
  infoBoxText: { fontSize: 13, color: COLORS.info, flex: 1, lineHeight: 18 },
});
