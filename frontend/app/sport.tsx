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
import { sportService, profileService, vitalsService, nutritionSummaryService } from '../src/database/services';
import { getDateString, getDisplayDate, getPreviousDay, getNextDay, isToday } from '../src/utils/date';
import { getWorkoutSuggestions } from '../src/services/aiService';

const WORKOUT_TYPES = [
  { key: 'running', icon: 'walk' }, { key: 'cycling', icon: 'bicycle' },
  { key: 'swimming', icon: 'water' }, { key: 'gym', icon: 'barbell' },
  { key: 'yoga', icon: 'body' }, { key: 'hiking', icon: 'trail-sign' },
  { key: 'other', icon: 'fitness' },
];

export default function SportScreen() {
  const { t, language } = useLanguage();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [workoutModalVisible, setWorkoutModalVisible] = useState(false);
  const [stepsModalVisible, setStepsModalVisible] = useState(false);
  const [customMetricsModalVisible, setCustomMetricsModalVisible] = useState(false);
  const [goalsModalVisible, setGoalsModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sportData, setSportData] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const [workoutForm, setWorkoutForm] = useState({ type: 'running', duration: '', calories_burned: '', distance: '', notes: '' });
  const [stepsValue, setStepsValue] = useState('');
  const [customMetricName, setCustomMetricName] = useState('');
  const [customMetricValue, setCustomMetricValue] = useState('');
  const [customMetricUnit, setCustomMetricUnit] = useState('');

  const dateString = getDateString(selectedDate);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sport, prof] = await Promise.all([sportService.getByDate(dateString), profileService.get()]);
      setSportData(sport);
      setProfile(prof);
    } catch (error) { console.error('Error loading sport data:', error); }
    finally { setIsLoading(false); }
  }, [dateString]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const goToPreviousDay = () => setSelectedDate(getPreviousDay(selectedDate));
  const goToNextDay = () => { if (!isToday(selectedDate)) setSelectedDate(getNextDay(selectedDate)); };

  const resetWorkoutForm = () => setWorkoutForm({ type: 'running', duration: '', calories_burned: '', distance: '', notes: '' });

  const handleAddWorkout = async () => {
    if (!workoutForm.duration) { Alert.alert('Fehler', 'Bitte gib die Dauer ein'); return; }
    try {
      await sportService.addWorkout(dateString, {
        date: dateString, type: workoutForm.type,
        duration: parseInt(workoutForm.duration),
        calories_burned: parseInt(workoutForm.calories_burned) || 0,
        distance: parseFloat(workoutForm.distance) || null,
        notes: workoutForm.notes || null,
      });
      setWorkoutModalVisible(false);
      resetWorkoutForm();
      loadData();
    } catch (error) { Alert.alert('Fehler', 'Speichern fehlgeschlagen'); }
  };

  const handleUpdateSteps = async () => {
    if (!stepsValue) { Alert.alert('Fehler', 'Bitte gib die Schritte ein'); return; }
    try {
      await sportService.createOrUpdate(dateString, { steps: parseInt(stepsValue) });
      setStepsModalVisible(false);
      setStepsValue('');
      loadData();
    } catch (error) { Alert.alert('Fehler', 'Speichern fehlgeschlagen'); }
  };

  const handleAddCustomMetric = async () => {
    if (!customMetricName || !customMetricValue) { Alert.alert('Fehler', 'Bitte fülle alle Felder aus'); return; }
    try {
      const metrics = { ...(sportData?.custom_metrics || {}), [customMetricName]: { value: customMetricValue, unit: customMetricUnit } };
      await sportService.createOrUpdate(dateString, { custom_metrics: metrics });
      setCustomMetricsModalVisible(false);
      setCustomMetricName(''); setCustomMetricValue(''); setCustomMetricUnit('');
      loadData();
    } catch (error) { Alert.alert('Fehler', 'Speichern fehlgeschlagen'); }
  };

  const handleDeleteWorkout = (workout: any) => {
    Alert.alert(t('delete'), 'Möchtest du dieses Training wirklich löschen?', [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: async () => {
        await sportService.deleteWorkout(dateString, workout.id);
        loadData();
      }},
    ]);
  };

  const handleAiCalorieEstimate = () => {
    Alert.alert('KI-Feature', 'Bitte konfiguriere deinen ChatGPT API Key, um die KI-Kalorienschatzung zu nutzen.');
  };

  const handleGenerateGoals = () => {
    Alert.alert('KI-Feature', 'Bitte konfiguriere deinen ChatGPT API Key, um KI-Trainingsziele zu generieren.');
  };

  const stepsGoal = profile?.sport_goals?.daily_steps || 10000;
  const stepsPercentage = Math.min(((sportData?.steps || 0) / stepsGoal) * 100, 100);
  const totalWorkoutCalories = (sportData?.workouts || []).reduce((sum: number, w: any) => sum + (w.calories_burned || 0), 0);

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
              <TouchableOpacity style={styles.card} onPress={() => { setStepsValue(sportData?.steps?.toString() || ''); setStepsModalVisible(true); }}>
                <View style={styles.cardHeader}><Text style={styles.cardTitle}>{t('steps')}</Text><Ionicons name="pencil" size={18} color={COLORS.textSecondary} /></View>
                <View style={styles.stepsContainer}>
                  <Ionicons name="footsteps" size={48} color={COLORS.primary} />
                  <View style={styles.stepsInfo}><Text style={styles.stepsValue}>{sportData?.steps || 0}</Text><Text style={styles.stepsGoalText}>/ {stepsGoal}</Text></View>
                </View>
                <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: `${stepsPercentage}%` }]} /></View>
              </TouchableOpacity>

              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{t('workouts')}</Text>
                  <TouchableOpacity style={styles.addIconButton} onPress={() => setWorkoutModalVisible(true)}><Ionicons name="add" size={24} color={COLORS.primary} /></TouchableOpacity>
                </View>
                {totalWorkoutCalories > 0 && (
                  <View style={styles.workoutSummary}><Ionicons name="flame" size={20} color={COLORS.accent} /><Text style={styles.workoutSummaryText}>{totalWorkoutCalories} {t('kcal')} {t('burned').toLowerCase()}</Text></View>
                )}
                {(!sportData?.workouts || sportData.workouts.length === 0) ? (
                  <View style={styles.emptyWorkouts}><Ionicons name="fitness-outline" size={48} color={COLORS.textSecondary} /><Text style={styles.emptyText}>Noch kein Training eingetragen</Text></View>
                ) : (
                  sportData.workouts.map((workout: any, index: number) => (
                    <TouchableOpacity key={workout.id || index} style={styles.workoutItem} onLongPress={() => handleDeleteWorkout(workout)}>
                      <View style={styles.workoutIcon}><Ionicons name={(WORKOUT_TYPES.find(w => w.key === workout.type)?.icon || 'fitness') as any} size={24} color={COLORS.primary} /></View>
                      <View style={styles.workoutInfo}>
                        <Text style={styles.workoutType}>{t(workout.type as any) || workout.type}</Text>
                        <Text style={styles.workoutDetails}>{workout.duration} {t('min')}{workout.distance ? ` - ${workout.distance} km` : ''}{workout.calories_burned ? ` - ${workout.calories_burned} kcal` : ''}</Text>
                        {workout.notes && <Text style={styles.workoutNotes}>{workout.notes}</Text>}
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>

              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{t('customGoals')}</Text>
                  <View style={styles.cardHeaderButtons}>
                    <TouchableOpacity style={styles.aiGoalsButton} onPress={() => setGoalsModalVisible(true)}>
                      <Ionicons name="sparkles" size={18} color={COLORS.accent} /><Text style={styles.aiGoalsButtonText}>KI</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addIconButton} onPress={() => setCustomMetricsModalVisible(true)}><Ionicons name="add" size={24} color={COLORS.primary} /></TouchableOpacity>
                  </View>
                </View>
                {(!sportData?.custom_metrics || Object.keys(sportData.custom_metrics).length === 0) ? (
                  <View style={styles.emptyWorkouts}>
                    <Ionicons name="trophy-outline" size={48} color={COLORS.textSecondary} />
                    <Text style={styles.emptyText}>Keine eigenen Ziele eingetragen</Text>
                    <Text style={styles.emptySubtext}>z.B. Pace, Gewichte, personliche Bestzeiten</Text>
                  </View>
                ) : (
                  Object.entries(sportData.custom_metrics).map(([name, data]: [string, any]) => (
                    <View key={name} style={styles.customMetricItem}><Text style={styles.customMetricName}>{name}</Text><Text style={styles.customMetricVal}>{data.value} {data.unit}</Text></View>
                  ))
                )}
              </View>
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Add Workout Modal */}
        <Modal visible={workoutModalVisible} animationType="slide" transparent={true} onRequestClose={() => setWorkoutModalVisible(false)}>
          <View style={styles.modalOverlay}><View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>{t('addWorkout')}</Text><TouchableOpacity onPress={() => setWorkoutModalVisible(false)}><Ionicons name="close" size={28} color={COLORS.text} /></TouchableOpacity></View>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Art des Trainings</Text>
              <View style={styles.workoutTypeGrid}>
                {WORKOUT_TYPES.map((type) => (
                  <TouchableOpacity key={type.key} style={[styles.workoutTypeButton, workoutForm.type === type.key && styles.workoutTypeButtonActive]} onPress={() => setWorkoutForm(prev => ({ ...prev, type: type.key }))}>
                    <Ionicons name={type.icon as any} size={24} color={workoutForm.type === type.key ? COLORS.text : COLORS.textSecondary} />
                    <Text style={[styles.workoutTypeText, workoutForm.type === type.key && styles.workoutTypeTextActive]}>{t(type.key as any)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.inputLabel}>{t('duration')} ({t('min')})</Text>
              <TextInput style={styles.textInput} value={workoutForm.duration} onChangeText={(text) => setWorkoutForm(prev => ({ ...prev, duration: text }))} keyboardType="numeric" placeholder="z.B. 45" placeholderTextColor={COLORS.textSecondary} />
              <Text style={styles.inputLabel}>{t('caloriesBurned')}</Text>
              <View style={styles.calorieInputRow}>
                <TextInput style={[styles.textInput, styles.calorieInput]} value={workoutForm.calories_burned} onChangeText={(text) => setWorkoutForm(prev => ({ ...prev, calories_burned: text }))} keyboardType="numeric" placeholder="z.B. 350" placeholderTextColor={COLORS.textSecondary} />
                <TouchableOpacity style={styles.aiCalorieButton} onPress={handleAiCalorieEstimate}>
                  <Ionicons name="sparkles" size={18} color={COLORS.text} /><Text style={styles.aiCalorieButtonText}>KI</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.inputLabel}>{t('distance')} (km)</Text>
              <TextInput style={styles.textInput} value={workoutForm.distance} onChangeText={(text) => setWorkoutForm(prev => ({ ...prev, distance: text }))} keyboardType="decimal-pad" placeholder="z.B. 5.5" placeholderTextColor={COLORS.textSecondary} />
              <Text style={styles.inputLabel}>Notizen</Text>
              <TextInput style={[styles.textInput, { minHeight: 80 }]} value={workoutForm.notes} onChangeText={(text) => setWorkoutForm(prev => ({ ...prev, notes: text }))} placeholder="Optionale Notizen..." placeholderTextColor={COLORS.textSecondary} multiline />
            </ScrollView>
            <TouchableOpacity style={styles.saveButton} onPress={handleAddWorkout}><Text style={styles.saveButtonText}>{t('save')}</Text></TouchableOpacity>
          </View></View>
        </Modal>

        {/* Steps Modal */}
        <Modal visible={stepsModalVisible} animationType="slide" transparent={true} onRequestClose={() => setStepsModalVisible(false)}>
          <View style={styles.modalOverlay}><View style={[styles.modalContent, { maxHeight: '40%' }]}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>{t('steps')}</Text><TouchableOpacity onPress={() => setStepsModalVisible(false)}><Ionicons name="close" size={28} color={COLORS.text} /></TouchableOpacity></View>
            <View style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Anzahl Schritte</Text>
              <TextInput style={styles.textInput} value={stepsValue} onChangeText={setStepsValue} keyboardType="numeric" placeholder="z.B. 8500" placeholderTextColor={COLORS.textSecondary} />
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={handleUpdateSteps}><Text style={styles.saveButtonText}>{t('save')}</Text></TouchableOpacity>
          </View></View>
        </Modal>

        {/* Custom Metrics Modal */}
        <Modal visible={customMetricsModalVisible} animationType="slide" transparent={true} onRequestClose={() => setCustomMetricsModalVisible(false)}>
          <View style={styles.modalOverlay}><View style={[styles.modalContent, { maxHeight: '50%' }]}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Eigenes Ziel hinzufügen</Text><TouchableOpacity onPress={() => setCustomMetricsModalVisible(false)}><Ionicons name="close" size={28} color={COLORS.text} /></TouchableOpacity></View>
            <View style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Name (z.B. "5km Pace")</Text>
              <TextInput style={styles.textInput} value={customMetricName} onChangeText={setCustomMetricName} placeholder="Name des Ziels" placeholderTextColor={COLORS.textSecondary} />
              <Text style={styles.inputLabel}>Wert</Text>
              <TextInput style={styles.textInput} value={customMetricValue} onChangeText={setCustomMetricValue} placeholder="z.B. 5:30" placeholderTextColor={COLORS.textSecondary} />
              <Text style={styles.inputLabel}>Einheit (optional)</Text>
              <TextInput style={styles.textInput} value={customMetricUnit} onChangeText={setCustomMetricUnit} placeholder="z.B. min/km" placeholderTextColor={COLORS.textSecondary} />
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={handleAddCustomMetric}><Text style={styles.saveButtonText}>{t('save')}</Text></TouchableOpacity>
          </View></View>
        </Modal>

        {/* AI Goals Modal */}
        <Modal visible={goalsModalVisible} animationType="slide" transparent={true} onRequestClose={() => setGoalsModalVisible(false)}>
          <View style={styles.modalOverlay}><View style={[styles.modalContent, { maxHeight: '60%' }]}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>KI-Trainingsziele</Text><TouchableOpacity onPress={() => setGoalsModalVisible(false)}><Ionicons name="close" size={28} color={COLORS.text} /></TouchableOpacity></View>
            <View style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Was möchtest du erreichen?</Text>
              <TextInput style={[styles.textInput, { minHeight: 80, textAlignVertical: 'top' }]} placeholder="z.B. Grosse Oberarme bekommen, muskulose Brust aufbauen..." placeholderTextColor={COLORS.textSecondary} multiline />
              <TouchableOpacity style={styles.aiGenerateButton} onPress={handleGenerateGoals}>
                <Ionicons name="sparkles" size={20} color={COLORS.text} /><Text style={styles.aiGenerateButtonText}>Ziele generieren</Text>
              </TouchableOpacity>
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color={COLORS.info} />
                <Text style={styles.infoText}>ChatGPT API Key wird benotigt um KI-Ziele zu generieren.</Text>
              </View>
            </View>
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
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  addIconButton: { padding: 4 },
  stepsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  stepsInfo: { marginLeft: 16, flexDirection: 'row', alignItems: 'baseline' },
  stepsValue: { fontSize: 32, fontWeight: '700', color: COLORS.text },
  stepsGoalText: { fontSize: 16, color: COLORS.textSecondary, marginLeft: 4 },
  progressBarBg: { height: 8, backgroundColor: COLORS.surfaceLight, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  workoutSummary: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.accent + '20', padding: 10, borderRadius: 8, marginBottom: 12 },
  workoutSummaryText: { color: COLORS.accent, fontWeight: '600', marginLeft: 8 },
  emptyWorkouts: { alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
  emptySubtext: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  workoutItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceLight },
  workoutIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary + '20', alignItems: 'center', justifyContent: 'center' },
  workoutInfo: { flex: 1, marginLeft: 12 },
  workoutType: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  workoutDetails: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  workoutNotes: { fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 4 },
  customMetricItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceLight },
  customMetricName: { fontSize: 16, color: COLORS.text },
  customMetricVal: { fontSize: 16, fontWeight: '600', color: COLORS.primary },
  cardHeaderButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiGoalsButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.accent + '30', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4 },
  aiGoalsButtonText: { color: COLORS.accent, fontWeight: '600', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceLight },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  modalScroll: { padding: 16 },
  inputLabel: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 6, marginTop: 12 },
  textInput: { backgroundColor: COLORS.surfaceLight, borderRadius: 12, padding: 14, color: COLORS.text, fontSize: 16 },
  workoutTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  workoutTypeButton: { width: '30%', alignItems: 'center', padding: 12, backgroundColor: COLORS.surfaceLight, borderRadius: 12 },
  workoutTypeButtonActive: { backgroundColor: COLORS.primary },
  workoutTypeText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  workoutTypeTextActive: { color: COLORS.text, fontWeight: '600' },
  calorieInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  calorieInput: { flex: 1, marginBottom: 0 },
  aiCalorieButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.accent, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 12, gap: 4 },
  aiCalorieButtonText: { color: COLORS.text, fontWeight: '600', fontSize: 12 },
  aiGenerateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accent, padding: 14, borderRadius: 12, gap: 8, marginBottom: 20 },
  aiGenerateButtonText: { color: COLORS.text, fontWeight: '700', fontSize: 16 },
  saveButton: { backgroundColor: COLORS.primary, marginHorizontal: 16, borderRadius: 12, padding: 16, alignItems: 'center' },
  saveButtonText: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  infoBox: { flexDirection: 'row', backgroundColor: COLORS.info + '20', padding: 12, borderRadius: 12, gap: 10 },
  infoText: { flex: 1, fontSize: 13, color: COLORS.info, lineHeight: 18 },
});
