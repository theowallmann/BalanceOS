import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { COLORS } from '../src/constants/colors';
import { useLanguage } from '../src/hooks/useLanguage';
import { sportApi, fitbitApi, profileApi } from '../src/services/api';
import { getDateString, getDisplayDate, getPreviousDay, getNextDay, isToday } from '../src/utils/date';

const WORKOUT_TYPES = [
  { key: 'running', icon: 'walk' },
  { key: 'cycling', icon: 'bicycle' },
  { key: 'swimming', icon: 'water' },
  { key: 'gym', icon: 'barbell' },
  { key: 'yoga', icon: 'body' },
  { key: 'hiking', icon: 'trail-sign' },
  { key: 'other', icon: 'fitness' },
];

export default function SportScreen() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [workoutModalVisible, setWorkoutModalVisible] = useState(false);
  const [stepsModalVisible, setStepsModalVisible] = useState(false);
  const [customMetricsModalVisible, setCustomMetricsModalVisible] = useState(false);
  const [goalsModalVisible, setGoalsModalVisible] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isGoalsAiLoading, setIsGoalsAiLoading] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [aiGeneratedGoals, setAiGeneratedGoals] = useState<any[]>([]);
  
  const [workoutForm, setWorkoutForm] = useState({
    type: 'running',
    duration: '',
    calories_burned: '',
    distance: '',
    notes: '',
  });
  
  const [stepsValue, setStepsValue] = useState('');
  const [customMetricName, setCustomMetricName] = useState('');
  const [customMetricValue, setCustomMetricValue] = useState('');
  const [customMetricUnit, setCustomMetricUnit] = useState('');

  const dateString = getDateString(selectedDate);

  const { data: sportData, isLoading, refetch } = useQuery({
    queryKey: ['sport', dateString],
    queryFn: () => sportApi.getByDate(dateString).then(res => res.data),
  });

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.get().then(res => res.data),
  });

  const { data: fitbitStatus } = useQuery({
    queryKey: ['fitbitStatus'],
    queryFn: () => fitbitApi.getStatus().then(res => res.data),
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [dateString])
  );

  const updateSportMutation = useMutation({
    mutationFn: (data: any) => sportApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sport', dateString] });
    },
  });

  const addWorkoutMutation = useMutation({
    mutationFn: (workout: any) => sportApi.addWorkout(dateString, workout),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sport', dateString] });
      setWorkoutModalVisible(false);
      resetWorkoutForm();
    },
  });

  const deleteWorkoutMutation = useMutation({
    mutationFn: (workoutId: string) => sportApi.deleteWorkout(dateString, workoutId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sport', dateString] });
    },
  });

  const updateCustomMetricsMutation = useMutation({
    mutationFn: (metrics: any) => sportApi.updateCustomMetrics(dateString, metrics),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sport', dateString] });
      setCustomMetricsModalVisible(false);
      setCustomMetricName('');
      setCustomMetricValue('');
      setCustomMetricUnit('');
    },
  });

  const syncFitbitMutation = useMutation({
    mutationFn: () => fitbitApi.sync(dateString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sport', dateString] });
      Alert.alert('Erfolg', 'Fitbit-Daten synchronisiert');
    },
    onError: () => {
      Alert.alert('Fehler', 'Synchronisierung fehlgeschlagen');
    },
  });

  // AI Calorie Estimation
  const handleAiCalorieEstimate = async () => {
    if (!workoutForm.duration) {
      Alert.alert('Hinweis', 'Bitte gib zuerst die Dauer ein.');
      return;
    }

    setIsAiLoading(true);
    try {
      const response = await sportApi.estimateCalories({
        type: WORKOUT_TYPES.find(w => w.key === workoutForm.type)?.key || workoutForm.type,
        duration: parseInt(workoutForm.duration),
        notes: workoutForm.notes,
      });
      
      if (response.data?.calories) {
        setWorkoutForm(prev => ({
          ...prev,
          calories_burned: response.data.calories.toString(),
        }));
      }
    } catch (error) {
      Alert.alert('Fehler', 'KI-Schätzung fehlgeschlagen');
    } finally {
      setIsAiLoading(false);
    }
  };

  // AI Training Goals Generation
  const handleGenerateGoals = async () => {
    if (!goalInput.trim()) {
      Alert.alert('Hinweis', 'Bitte beschreibe dein Ziel.');
      return;
    }

    setIsGoalsAiLoading(true);
    try {
      const response = await sportApi.generateTrainingGoals(goalInput);
      
      if (response.data?.goals && response.data.goals.length > 0) {
        setAiGeneratedGoals(response.data.goals);
      } else {
        Alert.alert('Hinweis', 'Keine Ziele generiert. Versuche eine andere Beschreibung.');
      }
    } catch (error) {
      Alert.alert('Fehler', 'Ziel-Generierung fehlgeschlagen');
    } finally {
      setIsGoalsAiLoading(false);
    }
  };

  // Save AI generated goal to custom metrics
  const handleSaveGoal = async (goal: any) => {
    try {
      const currentMetrics = sportData?.custom_metrics || [];
      const newMetric = {
        id: Date.now().toString(),
        name: goal.name,
        value: goal.target_value,
        unit: goal.timeframe,
        description: goal.description,
      };
      
      await sportApi.updateCustomMetrics(dateString, {
        custom_metrics: [...currentMetrics, newMetric],
      });
      
      queryClient.invalidateQueries({ queryKey: ['sport', dateString] });
      Alert.alert('Erfolg', `Ziel "${goal.name}" gespeichert!`);
    } catch (error) {
      Alert.alert('Fehler', 'Ziel konnte nicht gespeichert werden');
    }
  };

  const goToPreviousDay = () => setSelectedDate(getPreviousDay(selectedDate));
  const goToNextDay = () => {
    if (!isToday(selectedDate)) {
      setSelectedDate(getNextDay(selectedDate));
    }
  };

  const resetWorkoutForm = () => {
    setWorkoutForm({
      type: 'running',
      duration: '',
      calories_burned: '',
      distance: '',
      notes: '',
    });
  };

  const handleAddWorkout = () => {
    if (!workoutForm.duration) {
      Alert.alert('Fehler', 'Bitte gib die Dauer ein');
      return;
    }

    addWorkoutMutation.mutate({
      date: dateString,
      type: workoutForm.type,
      duration: parseInt(workoutForm.duration),
      calories_burned: parseInt(workoutForm.calories_burned) || 0,
      distance: parseFloat(workoutForm.distance) || null,
      notes: workoutForm.notes || null,
    });
  };

  const handleUpdateSteps = () => {
    if (!stepsValue) {
      Alert.alert('Fehler', 'Bitte gib die Schritte ein');
      return;
    }

    updateSportMutation.mutate({
      date: dateString,
      steps: parseInt(stepsValue),
      manual_override: true,
    });
    setStepsModalVisible(false);
    setStepsValue('');
  };

  const handleAddCustomMetric = () => {
    if (!customMetricName || !customMetricValue) {
      Alert.alert('Fehler', 'Bitte fülle alle Felder aus');
      return;
    }

    const metrics = {
      ...(sportData?.custom_metrics || {}),
      [customMetricName]: {
        value: customMetricValue,
        unit: customMetricUnit,
      },
    };

    updateCustomMetricsMutation.mutate(metrics);
  };

  const handleDeleteWorkout = (workout: any) => {
    Alert.alert(
      t('delete'),
      'Möchtest du dieses Training wirklich löschen?',
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete'), style: 'destructive', onPress: () => deleteWorkoutMutation.mutate(workout.id) },
      ]
    );
  };

  const stepsGoal = profile?.sport_goals?.daily_steps || 10000;
  const stepsPercentage = Math.min(((sportData?.steps || 0) / stepsGoal) * 100, 100);

  const totalWorkoutCalories = (sportData?.workouts || []).reduce(
    (sum: number, w: any) => sum + (w.calories_burned || 0), 0
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Date Navigation */}
        <View style={styles.dateNav}>
          <TouchableOpacity onPress={goToPreviousDay} style={styles.dateNavButton}>
            <Ionicons name="chevron-back" size={28} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.dateText}>{getDisplayDate(selectedDate, language)}</Text>
          <TouchableOpacity 
            onPress={goToNextDay} 
            style={[styles.dateNavButton, isToday(selectedDate) && styles.dateNavButtonDisabled]}
            disabled={isToday(selectedDate)}
          >
            <Ionicons name="chevron-forward" size={28} color={isToday(selectedDate) ? COLORS.textSecondary : COLORS.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView}>
          {isLoading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* Fitbit Sync */}
              {fitbitStatus?.connected && (
                <TouchableOpacity 
                  style={styles.syncButton}
                  onPress={() => syncFitbitMutation.mutate()}
                  disabled={syncFitbitMutation.isPending}
                >
                  {syncFitbitMutation.isPending ? (
                    <ActivityIndicator color={COLORS.text} />
                  ) : (
                    <>
                      <Ionicons name="sync" size={20} color={COLORS.text} />
                      <Text style={styles.syncButtonText}>{t('syncData')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Steps Card */}
              <TouchableOpacity 
                style={styles.card}
                onPress={() => {
                  setStepsValue(sportData?.steps?.toString() || '');
                  setStepsModalVisible(true);
                }}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{t('steps')}</Text>
                  <Ionicons name="pencil" size={18} color={COLORS.textSecondary} />
                </View>
                <View style={styles.stepsContainer}>
                  <Ionicons name="footsteps" size={48} color={COLORS.primary} />
                  <View style={styles.stepsInfo}>
                    <Text style={styles.stepsValue}>{sportData?.steps || 0}</Text>
                    <Text style={styles.stepsGoal}>/ {stepsGoal}</Text>
                  </View>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${stepsPercentage}%` }]} />
                </View>
                {sportData?.source === 'fitbit' && (
                  <View style={styles.sourceBadge}>
                    <Text style={styles.sourceText}>Fitbit</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Workouts Card */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{t('workouts')}</Text>
                  <TouchableOpacity 
                    style={styles.addIconButton}
                    onPress={() => setWorkoutModalVisible(true)}
                  >
                    <Ionicons name="add" size={24} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>

                {totalWorkoutCalories > 0 && (
                  <View style={styles.workoutSummary}>
                    <Ionicons name="flame" size={20} color={COLORS.accent} />
                    <Text style={styles.workoutSummaryText}>
                      {totalWorkoutCalories} {t('kcal')} {t('burned').toLowerCase()}
                    </Text>
                  </View>
                )}

                {(!sportData?.workouts || sportData.workouts.length === 0) ? (
                  <View style={styles.emptyWorkouts}>
                    <Ionicons name="fitness-outline" size={48} color={COLORS.textSecondary} />
                    <Text style={styles.emptyText}>Noch kein Training eingetragen</Text>
                  </View>
                ) : (
                  sportData.workouts.map((workout: any, index: number) => (
                    <TouchableOpacity 
                      key={workout.id || index}
                      style={styles.workoutItem}
                      onLongPress={() => handleDeleteWorkout(workout)}
                    >
                      <View style={styles.workoutIcon}>
                        <Ionicons 
                          name={(WORKOUT_TYPES.find(w => w.key === workout.type)?.icon || 'fitness') as any} 
                          size={24} 
                          color={COLORS.primary} 
                        />
                      </View>
                      <View style={styles.workoutInfo}>
                        <Text style={styles.workoutType}>{t(workout.type as any) || workout.type}</Text>
                        <Text style={styles.workoutDetails}>
                          {workout.duration} {t('min')}
                          {workout.distance ? ` • ${workout.distance} km` : ''}
                          {workout.calories_burned ? ` • ${workout.calories_burned} kcal` : ''}
                        </Text>
                        {workout.notes && (
                          <Text style={styles.workoutNotes}>{workout.notes}</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>

              {/* Custom Metrics Card */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{t('customGoals')}</Text>
                  <TouchableOpacity 
                    style={styles.addIconButton}
                    onPress={() => setCustomMetricsModalVisible(true)}
                  >
                    <Ionicons name="add" size={24} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>

                {(!sportData?.custom_metrics || Object.keys(sportData.custom_metrics).length === 0) ? (
                  <View style={styles.emptyWorkouts}>
                    <Ionicons name="trophy-outline" size={48} color={COLORS.textSecondary} />
                    <Text style={styles.emptyText}>Keine eigenen Ziele eingetragen</Text>
                    <Text style={styles.emptySubtext}>z.B. Pace, Gewichte, persönliche Bestzeiten</Text>
                  </View>
                ) : (
                  Object.entries(sportData.custom_metrics).map(([name, data]: [string, any]) => (
                    <View key={name} style={styles.customMetricItem}>
                      <Text style={styles.customMetricName}>{name}</Text>
                      <Text style={styles.customMetricValue}>
                        {data.value} {data.unit}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Add Workout Modal */}
        <Modal
          visible={workoutModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setWorkoutModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('addWorkout')}</Text>
                <TouchableOpacity onPress={() => setWorkoutModalVisible(false)}>
                  <Ionicons name="close" size={28} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                {/* Workout Type Selection */}
                <Text style={styles.inputLabel}>Art des Trainings</Text>
                <View style={styles.workoutTypeGrid}>
                  {WORKOUT_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.key}
                      style={[
                        styles.workoutTypeButton,
                        workoutForm.type === type.key && styles.workoutTypeButtonActive,
                      ]}
                      onPress={() => setWorkoutForm(prev => ({ ...prev, type: type.key }))}
                    >
                      <Ionicons 
                        name={type.icon as any} 
                        size={24} 
                        color={workoutForm.type === type.key ? COLORS.text : COLORS.textSecondary} 
                      />
                      <Text style={[
                        styles.workoutTypeText,
                        workoutForm.type === type.key && styles.workoutTypeTextActive,
                      ]}>
                        {t(type.key as any)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Duration */}
                <Text style={styles.inputLabel}>{t('duration')} ({t('min')})</Text>
                <TextInput
                  style={styles.textInput}
                  value={workoutForm.duration}
                  onChangeText={(text) => setWorkoutForm(prev => ({ ...prev, duration: text }))}
                  keyboardType="numeric"
                  placeholder="z.B. 45"
                  placeholderTextColor={COLORS.textSecondary}
                />

                {/* Calories */}
                <Text style={styles.inputLabel}>{t('caloriesBurned')}</Text>
                <TextInput
                  style={styles.textInput}
                  value={workoutForm.calories_burned}
                  onChangeText={(text) => setWorkoutForm(prev => ({ ...prev, calories_burned: text }))}
                  keyboardType="numeric"
                  placeholder="z.B. 350"
                  placeholderTextColor={COLORS.textSecondary}
                />

                {/* Distance */}
                <Text style={styles.inputLabel}>{t('distance')} (km)</Text>
                <TextInput
                  style={styles.textInput}
                  value={workoutForm.distance}
                  onChangeText={(text) => setWorkoutForm(prev => ({ ...prev, distance: text }))}
                  keyboardType="decimal-pad"
                  placeholder="z.B. 5.5"
                  placeholderTextColor={COLORS.textSecondary}
                />

                {/* Notes */}
                <Text style={styles.inputLabel}>Notizen</Text>
                <TextInput
                  style={[styles.textInput, { minHeight: 80 }]}
                  value={workoutForm.notes}
                  onChangeText={(text) => setWorkoutForm(prev => ({ ...prev, notes: text }))}
                  placeholder="Optionale Notizen..."
                  placeholderTextColor={COLORS.textSecondary}
                  multiline
                />
              </ScrollView>

              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={handleAddWorkout}
                disabled={addWorkoutMutation.isPending}
              >
                {addWorkoutMutation.isPending ? (
                  <ActivityIndicator color={COLORS.text} />
                ) : (
                  <Text style={styles.saveButtonText}>{t('save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Steps Modal */}
        <Modal
          visible={stepsModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setStepsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '40%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('steps')}</Text>
                <TouchableOpacity onPress={() => setStepsModalVisible(false)}>
                  <Ionicons name="close" size={28} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalScroll}>
                <Text style={styles.inputLabel}>Anzahl Schritte</Text>
                <TextInput
                  style={styles.textInput}
                  value={stepsValue}
                  onChangeText={setStepsValue}
                  keyboardType="numeric"
                  placeholder="z.B. 8500"
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleUpdateSteps}>
                <Text style={styles.saveButtonText}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Custom Metrics Modal */}
        <Modal
          visible={customMetricsModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setCustomMetricsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '50%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Eigenes Ziel hinzufügen</Text>
                <TouchableOpacity onPress={() => setCustomMetricsModalVisible(false)}>
                  <Ionicons name="close" size={28} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalScroll}>
                <Text style={styles.inputLabel}>Name (z.B. "5km Pace")</Text>
                <TextInput
                  style={styles.textInput}
                  value={customMetricName}
                  onChangeText={setCustomMetricName}
                  placeholder="Name des Ziels"
                  placeholderTextColor={COLORS.textSecondary}
                />

                <Text style={styles.inputLabel}>Wert</Text>
                <TextInput
                  style={styles.textInput}
                  value={customMetricValue}
                  onChangeText={setCustomMetricValue}
                  placeholder="z.B. 5:30"
                  placeholderTextColor={COLORS.textSecondary}
                />

                <Text style={styles.inputLabel}>Einheit (optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={customMetricUnit}
                  onChangeText={setCustomMetricUnit}
                  placeholder="z.B. min/km"
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleAddCustomMetric}>
                <Text style={styles.saveButtonText}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateNavButton: {
    padding: 8,
  },
  dateNavButtonDisabled: {
    opacity: 0.5,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.info,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  syncButtonText: {
    color: COLORS.text,
    fontWeight: '600',
    marginLeft: 8,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  addIconButton: {
    padding: 4,
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stepsInfo: {
    marginLeft: 16,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  stepsValue: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
  },
  stepsGoal: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  sourceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.info + '30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  sourceText: {
    fontSize: 12,
    color: COLORS.info,
    fontWeight: '500',
  },
  workoutSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent + '20',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  workoutSummaryText: {
    color: COLORS.accent,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyWorkouts: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  workoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  workoutIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutInfo: {
    flex: 1,
    marginLeft: 12,
  },
  workoutType: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  workoutDetails: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  workoutNotes: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  customMetricItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  customMetricName: {
    fontSize: 16,
    color: COLORS.text,
  },
  customMetricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalScroll: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 14,
    color: COLORS.text,
    fontSize: 16,
  },
  workoutTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  workoutTypeButton: {
    width: '30%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
  },
  workoutTypeButtonActive: {
    backgroundColor: COLORS.primary,
  },
  workoutTypeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  workoutTypeTextActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
});
