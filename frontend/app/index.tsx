import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../src/constants/colors';
import { useLanguage } from '../src/hooks/useLanguage';
import { analyticsApi, profileApi } from '../src/services/api';
import { getDateString, getDisplayDate, getPreviousDay, getNextDay, isToday } from '../src/utils/date';

export default function DashboardScreen() {
  const { t, language } = useLanguage();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const dateString = getDateString(selectedDate);

  const { data: analytics, isLoading, refetch } = useQuery({
    queryKey: ['analytics', dateString],
    queryFn: () => analyticsApi.getDaily(dateString).then(res => res.data),
  });

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.get().then(res => res.data),
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [dateString])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const goToPreviousDay = () => setSelectedDate(getPreviousDay(selectedDate));
  const goToNextDay = () => {
    if (!isToday(selectedDate)) {
      setSelectedDate(getNextDay(selectedDate));
    }
  };

  const nutrientGoals = profile?.nutrient_goals || {};
  const nutritionData = analytics?.nutrition?.consumed || {};
  const sportData = analytics?.sport?.data || {};
  const vitalsData = analytics?.vitals || {};
  const summary = analytics?.summary || {};

  const caloriePercentage = nutrientGoals.calories 
    ? Math.min((nutritionData.total_calories || 0) / nutrientGoals.calories * 100, 100) 
    : 0;

  const stepsPercentage = (profile?.sport_goals?.daily_steps || 10000)
    ? Math.min((sportData.steps || 0) / (profile?.sport_goals?.daily_steps || 10000) * 100, 100)
    : 0;

  const renderProgressBar = (current: number, goal: number, color: string, label: string, unit: string) => {
    const percentage = goal ? Math.min((current / goal) * 100, 100) : 0;
    return (
      <View style={styles.progressItem}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>{label}</Text>
          <Text style={styles.progressValue}>
            {Math.round(current)} / {goal} {unit}
          </Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: color }]} />
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
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

        {/* Calorie Summary Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('calorieBalance')}</Text>
          <View style={styles.calorieRow}>
            <View style={styles.calorieItem}>
              <Ionicons name="restaurant" size={24} color={COLORS.calories} />
              <Text style={styles.calorieValue}>{nutritionData.total_calories || 0}</Text>
              <Text style={styles.calorieLabel}>{t('consumed')}</Text>
            </View>
            <View style={styles.calorieDivider}>
              <Text style={styles.calorieBalance}>
                {(nutritionData.total_calories || 0) - (summary.calories_burned || 0) > 0 ? '+' : ''}
                {(nutritionData.total_calories || 0) - (summary.calories_burned || 0)}
              </Text>
              <Text style={styles.calorieBalanceLabel}>{t('kcal')}</Text>
            </View>
            <View style={styles.calorieItem}>
              <Ionicons name="flame" size={24} color={COLORS.accent} />
              <Text style={styles.calorieValue}>{summary.calories_burned || 0}</Text>
              <Text style={styles.calorieLabel}>{t('burned')}</Text>
            </View>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${caloriePercentage}%`, backgroundColor: COLORS.calories }]} />
          </View>
          <Text style={styles.goalText}>
            {t('goal')}: {nutrientGoals.calories || 0} {t('kcal')}
          </Text>
        </View>

        {/* Nutrition Progress */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('nutrition')}</Text>
          {renderProgressBar(nutritionData.total_protein || 0, nutrientGoals.protein || 50, COLORS.protein, t('protein'), t('g'))}
          {renderProgressBar(nutritionData.total_carbs || 0, nutrientGoals.carbs || 250, COLORS.carbs, t('carbs'), t('g'))}
          {renderProgressBar(nutritionData.total_fat || 0, nutrientGoals.fat || 65, COLORS.fat, t('fat'), t('g'))}
          {renderProgressBar(nutritionData.total_water || 0, nutrientGoals.water || 2000, COLORS.water, t('water'), t('ml'))}
        </View>

        {/* Steps Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('steps')}</Text>
          <View style={styles.stepsContainer}>
            <Ionicons name="footsteps" size={48} color={COLORS.primary} />
            <View style={styles.stepsInfo}>
              <Text style={styles.stepsValue}>{sportData.steps || 0}</Text>
              <Text style={styles.stepsGoal}>/ {profile?.sport_goals?.daily_steps || 10000}</Text>
            </View>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${stepsPercentage}%`, backgroundColor: COLORS.primary }]} />
          </View>
        </View>

        {/* Vitals Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('vitals')}</Text>
          <View style={styles.vitalsGrid}>
            {vitalsData.weight && (
              <View style={styles.vitalItem}>
                <Ionicons name="scale" size={24} color={COLORS.info} />
                <Text style={styles.vitalValue}>{vitalsData.weight} {t('kg')}</Text>
                <Text style={styles.vitalLabel}>{t('weight')}</Text>
              </View>
            )}
            {vitalsData.sleep_duration && (
              <View style={styles.vitalItem}>
                <Ionicons name="moon" size={24} color={COLORS.secondary} />
                <Text style={styles.vitalValue}>{vitalsData.sleep_duration}h</Text>
                <Text style={styles.vitalLabel}>{t('sleepDuration')}</Text>
              </View>
            )}
            {vitalsData.resting_heart_rate && (
              <View style={styles.vitalItem}>
                <Ionicons name="heart" size={24} color={COLORS.error} />
                <Text style={styles.vitalValue}>{vitalsData.resting_heart_rate}</Text>
                <Text style={styles.vitalLabel}>{t('restingHeartRate')}</Text>
              </View>
            )}
            {vitalsData.basal_metabolic_rate && (
              <View style={styles.vitalItem}>
                <Ionicons name="flash" size={24} color={COLORS.accent} />
                <Text style={styles.vitalValue}>{vitalsData.basal_metabolic_rate}</Text>
                <Text style={styles.vitalLabel}>{t('bmr')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Workouts */}
        {sportData.workouts && sportData.workouts.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('workouts')}</Text>
            {sportData.workouts.map((workout: any, index: number) => (
              <View key={index} style={styles.workoutItem}>
                <Ionicons name="fitness" size={20} color={COLORS.primary} />
                <View style={styles.workoutInfo}>
                  <Text style={styles.workoutType}>{workout.type}</Text>
                  <Text style={styles.workoutDetails}>
                    {workout.duration} {t('min')} • {workout.calories_burned || 0} {t('kcal')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
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
  card: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  calorieRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 16,
  },
  calorieItem: {
    alignItems: 'center',
  },
  calorieValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 8,
  },
  calorieLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  calorieDivider: {
    alignItems: 'center',
  },
  calorieBalance: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  calorieBalanceLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  progressItem: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 14,
    color: COLORS.text,
  },
  progressValue: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  goalText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
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
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  vitalItem: {
    alignItems: 'center',
    width: '45%',
    marginBottom: 16,
  },
  vitalValue: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 8,
  },
  vitalLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  workoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  workoutInfo: {
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
  },
  bottomPadding: {
    height: 20,
  },
});
