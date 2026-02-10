import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../src/constants/colors';
import { useLanguage } from '../src/hooks/useLanguage';
import { analyticsService, profileService, vitalsService } from '../src/database/services';
import { getDateString, getDisplayDate, getPreviousDay, getNextDay, isToday } from '../src/utils/date';

type Period = 'today' | 'month' | 'all';

export default function DashboardScreen() {
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('today');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [calorieModalVisible, setCalorieModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [vitalsData, setVitalsData] = useState<any>(null);

  const dateString = getDateString(selectedDate);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [prof, vit] = await Promise.all([
        profileService.get(),
        selectedPeriod === 'today' ? vitalsService.getByDate(dateString) : null,
      ]);
      setProfile(prof);
      setVitalsData(vit);

      if (selectedPeriod === 'today') {
        const data = await analyticsService.getToday(dateString);
        setAnalytics(data);
      } else {
        const data = await analyticsService.getPeriod(selectedPeriod);
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dateString, selectedPeriod]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const goToPreviousDay = () => setSelectedDate(getPreviousDay(selectedDate));
  const goToNextDay = () => {
    if (!isToday(selectedDate)) {
      setSelectedDate(getNextDay(selectedDate));
    }
  };

  const trackingSettings = profile?.tracking_settings || {};
  const nutrientGoals = profile?.nutrient_goals || {};
  const sportGoals = profile?.sport_goals || {};

  // Calculate BMR (Mifflin-St Jeor)
  const calculateBMR = (): number | null => {
    const weight = vitalsData?.weight;
    const height = profile?.height;
    const birthDate = profile?.birth_date;
    const gender = profile?.gender;
    if (!weight || !height || !birthDate || !gender) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    const genderOffset = gender === 'female' ? -161 : 5;
    return Math.round(10 * weight + 6.25 * height - 5 * age + genderOffset);
  };

  const bmr = calculateBMR();
  const neat = bmr ? Math.round(bmr * 0.375) : null;

  const renderProgressBar = (current: number, goal: number, color: string, label: string, unit: string, showIfZeroGoal = false) => {
    if (!goal && !showIfZeroGoal) return null;
    const percentage = goal ? Math.min((current / goal) * 100, 100) : 0;
    return (
      <View style={styles.progressItem}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>{label}</Text>
          <Text style={styles.progressValue}>{Math.round(current)} / {goal} {unit}</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: color }]} />
        </View>
      </View>
    );
  };

  const renderChangeIndicator = (change: number | null, unit: string, inverse: boolean = false) => {
    if (change === null || change === undefined) return null;
    const isPositive = inverse ? change < 0 : change > 0;
    const color = isPositive ? COLORS.success : change === 0 ? COLORS.textSecondary : COLORS.error;
    const icon = change > 0 ? 'arrow-up' : change < 0 ? 'arrow-down' : 'remove';
    return (
      <View style={[styles.changeBadge, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={14} color={color} />
        <Text style={[styles.changeText, { color }]}>{change > 0 ? '+' : ''}{change} {unit}</Text>
      </View>
    );
  };

  const renderTodayView = () => {
    const nutritionData = analytics?.nutrition?.consumed || {};
    const sportData = analytics?.sport?.data || {};
    const vitals = analytics?.vitals || {};
    const summary = analytics?.summary || {};

    return (
      <>
        {trackingSettings.track_calories !== false && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('calorieBalance')}</Text>
            <View style={styles.calorieRow}>
              <View style={styles.calorieItem}>
                <Ionicons name="restaurant" size={24} color={COLORS.calories} />
                <Text style={styles.calorieValue}>{nutritionData.total_calories || 0}</Text>
                <Text style={styles.calorieLabel}>{t('consumed')}</Text>
              </View>
              <View style={styles.calorieDivider}>
                <Text style={[styles.calorieBalance, {
                  color: (nutritionData.total_calories || 0) - (summary.calories_burned || 0) > 0
                    ? COLORS.error : COLORS.success
                }]}>
                  {(nutritionData.total_calories || 0) - (summary.calories_burned || 0) > 0 ? '+' : ''}
                  {(nutritionData.total_calories || 0) - (summary.calories_burned || 0)}
                </Text>
                <Text style={styles.calorieBalanceLabel}>{t('kcal')}</Text>
              </View>
              <TouchableOpacity
                style={styles.calorieItem}
                onPress={() => trackingSettings.show_calorie_breakdown !== false && setCalorieModalVisible(true)}
                activeOpacity={trackingSettings.show_calorie_breakdown !== false ? 0.7 : 1}
              >
                <Ionicons name="flame" size={24} color={COLORS.accent} />
                <Text style={styles.calorieValue}>{summary.calories_burned || 0}</Text>
                <Text style={styles.calorieLabel}>{t('burned')}</Text>
                {trackingSettings.show_calorie_breakdown !== false && (
                  <Ionicons name="information-circle-outline" size={14} color={COLORS.textSecondary} style={{ marginTop: 4 }} />
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, {
                width: `${Math.min(((nutritionData.total_calories || 0) / (nutrientGoals.calories || 2000)) * 100, 100)}%`,
                backgroundColor: COLORS.calories
              }]} />
            </View>
            <Text style={styles.goalText}>{t('goal')}: {nutrientGoals.calories || 2000} {t('kcal')}</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('nutrition')}</Text>
          {trackingSettings.track_protein !== false &&
            renderProgressBar(nutritionData.total_protein || 0, nutrientGoals.protein || 50, COLORS.protein, t('protein'), t('g'))}
          {trackingSettings.track_carbs !== false &&
            renderProgressBar(nutritionData.total_carbs || 0, nutrientGoals.carbs || 250, COLORS.carbs, t('carbs'), t('g'))}
          {trackingSettings.track_fat !== false &&
            renderProgressBar(nutritionData.total_fat || 0, nutrientGoals.fat || 65, COLORS.fat, t('fat'), t('g'))}
          {trackingSettings.track_water !== false &&
            renderProgressBar(nutritionData.total_water || 0, nutrientGoals.water || 2000, COLORS.water, t('water'), t('ml'))}
          {trackingSettings.track_fiber &&
            renderProgressBar(nutritionData.total_fiber || 0, nutrientGoals.fiber || 25, COLORS.fiber, t('fiber'), t('g'))}
          {trackingSettings.track_sugar &&
            renderProgressBar(nutritionData.total_sugar || 0, nutrientGoals.sugar || 50, COLORS.sugar, t('sugar'), t('g'))}
        </View>

        {trackingSettings.track_steps !== false && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('steps')}</Text>
            <View style={styles.stepsContainer}>
              <Ionicons name="footsteps" size={48} color={COLORS.primary} />
              <View style={styles.stepsInfo}>
                <Text style={styles.stepsValue}>{sportData.steps || 0}</Text>
                <Text style={styles.stepsGoal}>/ {sportGoals.daily_steps || 10000}</Text>
              </View>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, {
                width: `${Math.min(((sportData.steps || 0) / (sportGoals.daily_steps || 10000)) * 100, 100)}%`,
                backgroundColor: COLORS.primary
              }]} />
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('vitals')}</Text>
          <View style={styles.vitalsGrid}>
            {trackingSettings.track_weight !== false && vitals.weight && (
              <View style={styles.vitalItem}>
                <Ionicons name="scale" size={24} color={COLORS.info} />
                <Text style={styles.vitalValue}>{vitals.weight} {t('kg')}</Text>
                <Text style={styles.vitalLabel}>{t('weight')}</Text>
              </View>
            )}
            {trackingSettings.track_sleep !== false && vitals.sleep_duration && (
              <View style={styles.vitalItem}>
                <Ionicons name="moon" size={24} color={COLORS.secondary} />
                <Text style={styles.vitalValue}>{vitals.sleep_duration}h</Text>
                <Text style={styles.vitalLabel}>{t('sleepDuration')}</Text>
              </View>
            )}
            {trackingSettings.track_resting_heart_rate && vitals.resting_heart_rate && (
              <View style={styles.vitalItem}>
                <Ionicons name="heart" size={24} color={COLORS.error} />
                <Text style={styles.vitalValue}>{vitals.resting_heart_rate}</Text>
                <Text style={styles.vitalLabel}>{t('restingHeartRate')}</Text>
              </View>
            )}
          </View>
          {Object.keys(vitals).length === 0 && (
            <Text style={styles.emptyText}>{t('noVitalsData')}</Text>
          )}
        </View>
      </>
    );
  };

  const renderPeriodView = () => {
    if (!analytics) return null;
    const nutritionAvg = analytics.nutrition?.averages || {};
    const sportAvg = analytics.sport?.averages || {};
    const sportTotals = analytics.sport?.totals || {};
    const weightData = analytics.vitals?.weight || {};
    const bodyFatData = analytics.vitals?.body_fat || {};
    const sleepData = analytics.vitals?.sleep || {};
    const daysWithData = analytics.days_with_data || {};

    return (
      <>
        <View style={styles.periodInfo}>
          <Text style={styles.periodText}>{analytics.start_date} -> {analytics.end_date}</Text>
          <Text style={styles.periodDays}>{daysWithData.nutrition || 0} Tage mit Daten</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ø Ernahrung pro Tag</Text>
          {trackingSettings.track_calories !== false && (
            <View style={styles.avgRow}>
              <Ionicons name="flame" size={20} color={COLORS.calories} />
              <Text style={styles.avgLabel}>{t('calories')}</Text>
              <Text style={styles.avgValue}>{Math.round(nutritionAvg.calories || 0)} {t('kcal')}</Text>
            </View>
          )}
          {trackingSettings.track_protein !== false && (
            <View style={styles.avgRow}>
              <Ionicons name="nutrition" size={20} color={COLORS.protein} />
              <Text style={styles.avgLabel}>{t('protein')}</Text>
              <Text style={styles.avgValue}>{Math.round(nutritionAvg.protein || 0)} {t('g')}</Text>
            </View>
          )}
          {trackingSettings.track_carbs !== false && (
            <View style={styles.avgRow}>
              <Ionicons name="leaf" size={20} color={COLORS.carbs} />
              <Text style={styles.avgLabel}>{t('carbs')}</Text>
              <Text style={styles.avgValue}>{Math.round(nutritionAvg.carbs || 0)} {t('g')}</Text>
            </View>
          )}
          {trackingSettings.track_fat !== false && (
            <View style={styles.avgRow}>
              <Ionicons name="water" size={20} color={COLORS.fat} />
              <Text style={styles.avgLabel}>{t('fat')}</Text>
              <Text style={styles.avgValue}>{Math.round(nutritionAvg.fat || 0)} {t('g')}</Text>
            </View>
          )}
          {trackingSettings.track_water !== false && (
            <View style={styles.avgRow}>
              <Ionicons name="water-outline" size={20} color={COLORS.water} />
              <Text style={styles.avgLabel}>{t('water')}</Text>
              <Text style={styles.avgValue}>{Math.round(nutritionAvg.water || 0)} {t('ml')}</Text>
            </View>
          )}
        </View>

        {trackingSettings.track_weight !== false && (weightData.start || weightData.end) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('weight')} Entwicklung</Text>
            <View style={styles.changeRow}>
              <View style={styles.changeItem}>
                <Text style={styles.changeLabel}>Start</Text>
                <Text style={styles.changeValue}>{weightData.start || '-'} {t('kg')}</Text>
              </View>
              <View style={styles.changeArrow}>
                <Ionicons name="arrow-forward" size={24} color={COLORS.textSecondary} />
              </View>
              <View style={styles.changeItem}>
                <Text style={styles.changeLabel}>Aktuell</Text>
                <Text style={styles.changeValue}>{weightData.end || '-'} {t('kg')}</Text>
              </View>
            </View>
            {weightData.change !== null && (
              <View style={styles.changeResult}>
                {renderChangeIndicator(weightData.change, t('kg'), true)}
              </View>
            )}
          </View>
        )}

        {trackingSettings.track_body_fat && (bodyFatData.start || bodyFatData.end) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('bodyFat')} Entwicklung</Text>
            <View style={styles.changeRow}>
              <View style={styles.changeItem}>
                <Text style={styles.changeLabel}>Start</Text>
                <Text style={styles.changeValue}>{bodyFatData.start || '-'}%</Text>
              </View>
              <View style={styles.changeArrow}>
                <Ionicons name="arrow-forward" size={24} color={COLORS.textSecondary} />
              </View>
              <View style={styles.changeItem}>
                <Text style={styles.changeLabel}>Aktuell</Text>
                <Text style={styles.changeValue}>{bodyFatData.end || '-'}%</Text>
              </View>
            </View>
            {bodyFatData.change !== null && (
              <View style={styles.changeResult}>
                {renderChangeIndicator(bodyFatData.change, '%', true)}
              </View>
            )}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('sport')} Ubersicht</Text>
          {trackingSettings.track_steps !== false && (
            <View style={styles.avgRow}>
              <Ionicons name="footsteps" size={20} color={COLORS.primary} />
              <Text style={styles.avgLabel}>Ø Schritte/Tag</Text>
              <Text style={styles.avgValue}>{Math.round(sportAvg.steps_per_day || 0)}</Text>
            </View>
          )}
          {trackingSettings.track_workouts !== false && (
            <>
              <View style={styles.avgRow}>
                <Ionicons name="fitness" size={20} color={COLORS.secondary} />
                <Text style={styles.avgLabel}>Trainings gesamt</Text>
                <Text style={styles.avgValue}>{sportTotals.workouts || 0}</Text>
              </View>
              <View style={styles.avgRow}>
                <Ionicons name="time" size={20} color={COLORS.info} />
                <Text style={styles.avgLabel}>Trainingsminuten</Text>
                <Text style={styles.avgValue}>{sportTotals.workout_minutes || 0} {t('min')}</Text>
              </View>
            </>
          )}
          {trackingSettings.track_calories_burned !== false && (
            <View style={styles.avgRow}>
              <Ionicons name="flame" size={20} color={COLORS.accent} />
              <Text style={styles.avgLabel}>Ø Kalorienverbrauch</Text>
              <Text style={styles.avgValue}>{Math.round(sportAvg.workout_calories_per_day || 0)} {t('kcal')}</Text>
            </View>
          )}
        </View>

        {trackingSettings.track_sleep !== false && sleepData.average_hours && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ø {t('sleepDuration')}</Text>
            <View style={styles.sleepAvg}>
              <Ionicons name="moon" size={32} color={COLORS.secondary} />
              <Text style={styles.sleepAvgValue}>{sleepData.average_hours}h</Text>
              <Text style={styles.sleepAvgLabel}>pro Nacht</Text>
            </View>
          </View>
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        <View style={styles.periodSelector}>
          {[
            { key: 'today' as Period, label: t('today') },
            { key: 'month' as Period, label: t('thirtyDays') },
            { key: 'all' as Period, label: t('allTime') },
          ].map((period) => (
            <TouchableOpacity
              key={period.key}
              style={[styles.periodButton, selectedPeriod === period.key && styles.periodButtonActive]}
              onPress={() => setSelectedPeriod(period.key)}
            >
              <Text style={[styles.periodButtonText, selectedPeriod === period.key && styles.periodButtonTextActive]}>
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedPeriod === 'today' && (
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
        )}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          selectedPeriod === 'today' ? renderTodayView() : renderPeriodView()
        )}
      </ScrollView>

      {/* Calorie Breakdown Modal */}
      <Modal
        visible={calorieModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCalorieModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Kalorienverbrauch Aufschlüsselung</Text>
              <TouchableOpacity onPress={() => setCalorieModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <View style={styles.totalBurnedCard}>
                <Ionicons name="flame" size={32} color={COLORS.accent} />
                <Text style={styles.totalBurnedValue}>
                  {(neat || 0) + (analytics?.sport?.data?.calories_burned || 0)} kcal
                </Text>
                <Text style={styles.totalBurnedLabel}>Verbrannte Kalorien heute</Text>
              </View>
              <View style={styles.breakdownSection}>
                <View style={styles.breakdownItem}>
                  <View style={styles.breakdownLeft}>
                    <View style={[styles.breakdownIcon, { backgroundColor: COLORS.primary + '20' }]}>
                      <Ionicons name="body" size={20} color={COLORS.primary} />
                    </View>
                    <View>
                      <Text style={styles.breakdownTitle}>NEAT</Text>
                      <Text style={styles.breakdownSubtitle}>Alltagsaktivitat (ohne Sport)</Text>
                    </View>
                  </View>
                  <Text style={styles.breakdownValue}>{neat !== null ? `${neat} kcal` : '---'}</Text>
                </View>
                <View style={styles.breakdownItem}>
                  <View style={styles.breakdownLeft}>
                    <View style={[styles.breakdownIcon, { backgroundColor: COLORS.calories + '20' }]}>
                      <Ionicons name="fitness" size={20} color={COLORS.calories} />
                    </View>
                    <View>
                      <Text style={styles.breakdownTitle}>Sport & Training</Text>
                      <Text style={styles.breakdownSubtitle}>Aufgezeichnete Workouts</Text>
                    </View>
                  </View>
                  <Text style={styles.breakdownValue}>{analytics?.sport?.data?.calories_burned || 0} kcal</Text>
                </View>
              </View>
              {!bmr && (
                <View style={styles.missingDataWarning}>
                  <Ionicons name="alert-circle" size={20} color={COLORS.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.missingDataTitle}>Fehlende Daten für BMR-Berechnung:</Text>
                    <Text style={styles.missingDataList}>
                      {!vitalsData?.weight && '- Gewicht (heute in Vitaldaten)\n'}
                      {!profile?.height && '- Grosse (im Profil)\n'}
                      {!profile?.birth_date && '- Geburtsdatum (im Profil)\n'}
                      {!profile?.gender && '- Geschlecht (im Profil)'}
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  scrollView: { flex: 1 },
  periodSelector: { flexDirection: 'row', marginHorizontal: 16, marginTop: 8, marginBottom: 8, backgroundColor: COLORS.surface, borderRadius: 12, padding: 4 },
  periodButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  periodButtonActive: { backgroundColor: COLORS.primary },
  periodButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  periodButtonTextActive: { color: COLORS.text },
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  dateNavButton: { padding: 8 },
  dateNavButtonDisabled: { opacity: 0.5 },
  dateText: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  periodInfo: { alignItems: 'center', paddingVertical: 12 },
  periodText: { fontSize: 14, color: COLORS.textSecondary },
  periodDays: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  card: { backgroundColor: COLORS.surface, marginHorizontal: 16, marginBottom: 16, borderRadius: 16, padding: 16 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  calorieRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 16 },
  calorieItem: { alignItems: 'center' },
  calorieValue: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginTop: 8 },
  calorieLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  calorieDivider: { alignItems: 'center' },
  calorieBalance: { fontSize: 28, fontWeight: '700' },
  calorieBalanceLabel: { fontSize: 12, color: COLORS.textSecondary },
  progressItem: { marginBottom: 12 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 14, color: COLORS.text },
  progressValue: { fontSize: 14, color: COLORS.textSecondary },
  progressBarBg: { height: 8, backgroundColor: COLORS.surfaceLight, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  goalText: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8 },
  stepsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  stepsInfo: { marginLeft: 16, flexDirection: 'row', alignItems: 'baseline' },
  stepsValue: { fontSize: 32, fontWeight: '700', color: COLORS.text },
  stepsGoal: { fontSize: 16, color: COLORS.textSecondary, marginLeft: 4 },
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around' },
  vitalItem: { alignItems: 'center', width: '45%', marginBottom: 16 },
  vitalValue: { fontSize: 20, fontWeight: '600', color: COLORS.text, marginTop: 8 },
  vitalLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 14 },
  avgRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceLight },
  avgLabel: { flex: 1, fontSize: 15, color: COLORS.text, marginLeft: 12 },
  avgValue: { fontSize: 16, fontWeight: '600', color: COLORS.primary },
  changeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 16 },
  changeItem: { alignItems: 'center' },
  changeLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  changeValue: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  changeArrow: { paddingHorizontal: 16 },
  changeResult: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  changeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, gap: 4 },
  changeText: { fontSize: 14, fontWeight: '600' },
  sleepAvg: { alignItems: 'center' },
  sleepAvgValue: { fontSize: 36, fontWeight: '700', color: COLORS.text, marginTop: 8 },
  sleepAvgLabel: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceLight },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  modalScroll: { padding: 16 },
  totalBurnedCard: { backgroundColor: COLORS.accent + '15', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 20 },
  totalBurnedValue: { fontSize: 36, fontWeight: '700', color: COLORS.accent, marginTop: 8 },
  totalBurnedLabel: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  breakdownSection: { backgroundColor: COLORS.surfaceLight, borderRadius: 12, marginBottom: 16 },
  breakdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.surface },
  breakdownLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  breakdownIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  breakdownTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  breakdownSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  breakdownValue: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  missingDataWarning: { flexDirection: 'row', backgroundColor: COLORS.accent + '15', padding: 12, borderRadius: 8, marginBottom: 16, gap: 10 },
  missingDataTitle: { fontSize: 14, fontWeight: '600', color: COLORS.accent, marginBottom: 4 },
  missingDataList: { fontSize: 13, color: COLORS.accent, lineHeight: 18 },
});
