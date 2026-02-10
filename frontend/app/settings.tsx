import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { COLORS } from '../src/constants/colors';
import { useLanguage } from '../src/hooks/useLanguage';
import { profileService } from '../src/database/services';
import { fitbitService } from '../src/services/fitbitService';

interface TrackingSettings {
  // Nutrition
  track_calories: boolean;
  track_protein: boolean;
  track_carbs: boolean;
  track_fat: boolean;
  track_fiber: boolean;
  track_sugar: boolean;
  track_salt: boolean;
  track_water: boolean;
  // Vitals
  track_weight: boolean;
  track_body_fat: boolean;
  track_bmr_neat: boolean;
  track_sleep: boolean;
  track_sleep_quality: boolean;
  track_morning_energy: boolean;
  track_resting_heart_rate: boolean;
  // Sport
  track_steps: boolean;
  track_workouts: boolean;
  track_calories_burned: boolean;
  // Calculations
  show_calorie_breakdown: boolean;
  // Tab Visibility
  show_dashboard_tab: boolean;
  show_nutrition_tab: boolean;
  show_sport_tab: boolean;
  show_vitals_tab: boolean;
  show_finance_tab: boolean;
  show_blocker_tab: boolean;
}

const DEFAULT_SETTINGS: TrackingSettings = {
  // Nutrition - all on by default
  track_calories: true,
  track_protein: true,
  track_carbs: true,
  track_fat: true,
  track_fiber: true,
  track_sugar: true,
  track_salt: true,
  track_water: true,
  // Vitals - all on by default
  track_weight: true,
  track_body_fat: true,
  track_bmr_neat: true,
  track_sleep: true,
  track_sleep_quality: true,
  track_morning_energy: true,
  track_resting_heart_rate: true,
  // Sport - all on by default
  track_steps: true,
  track_workouts: true,
  track_calories_burned: true,
  // Calculations
  show_calorie_breakdown: true,
  // Tab Visibility - all on by default
  show_dashboard_tab: true,
  show_nutrition_tab: true,
  show_sport_tab: true,
  show_vitals_tab: true,
  show_finance_tab: true,
  show_blocker_tab: true,
};

// Presets are now defined inside the component to use translations

export default function SettingsScreen() {
  const { t, language, switchLanguage } = useLanguage();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [settings, setSettings] = useState<TrackingSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  // Presets defined inside component to use translations
  const PRESETS = [
    {
      key: 'weight_loss',
      label: t('weightLoss'),
      description: t('caloriesWeightFocus'),
      icon: 'trending-down',
      color: '#FF6B6B',
      settings: {
        track_calories: true, track_protein: false, track_carbs: false, track_fat: false,
        track_fiber: false, track_sugar: false, track_salt: false, track_water: true,
        track_weight: true, track_body_fat: false, track_sleep: false, track_sleep_quality: false,
        track_morning_energy: false, track_resting_heart_rate: false, track_steps: true,
        track_workouts: false, track_calories_burned: true,
      },
    },
    {
      key: 'muscle_building',
      label: t('muscleBuilding'),
      description: t('proteinTrainingFocus'),
      icon: 'barbell',
      color: COLORS.primary,
      settings: {
        track_calories: true, track_protein: true, track_carbs: true, track_fat: false,
        track_fiber: false, track_sugar: false, track_salt: false, track_water: true,
        track_weight: true, track_body_fat: true, track_sleep: true, track_sleep_quality: false,
        track_morning_energy: false, track_resting_heart_rate: false, track_steps: false,
        track_workouts: true, track_calories_burned: true,
      },
    },
    {
      key: 'healthy_lifestyle',
      label: t('healthyLifestyle'),
      description: t('sleepWaterMovement'),
      icon: 'leaf',
      color: '#2ECC71',
      settings: {
        track_calories: false, track_protein: false, track_carbs: false, track_fat: false,
        track_fiber: false, track_sugar: false, track_salt: false, track_water: true,
        track_weight: false, track_body_fat: false, track_sleep: true, track_sleep_quality: true,
        track_morning_energy: true, track_resting_heart_rate: false, track_steps: true,
        track_workouts: false, track_calories_burned: false,
      },
    },
    {
      key: 'all',
      label: t('trackEverything'),
      description: t('forDetailLovers'),
      icon: 'checkmark-done',
      color: COLORS.accent,
      settings: {
        track_calories: true, track_protein: true, track_carbs: true, track_fat: true,
        track_fiber: true, track_sugar: true, track_salt: true, track_water: true,
        track_weight: true, track_body_fat: true, track_sleep: true, track_sleep_quality: true,
        track_morning_energy: true, track_resting_heart_rate: true, track_steps: true,
        track_workouts: true, track_calories_burned: true,
      },
    },
  ];

  // Load profile data on mount
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const prof = await profileService.get();
      setProfile(prof);
      if (prof?.tracking_settings) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...prof.tracking_settings,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await profileService.update({
        tracking_settings: settings,
      });
      setHasChanges(false);
      Alert.alert('Erfolg', 'Einstellungen gespeichert');
    } catch (error) {
      Alert.alert('Fehler', 'Einstellungen konnten nicht gespeichert werden');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = (key: keyof TrackingSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
    setHasChanges(true);
    setActivePreset(null);
  };

  const handlePresetSelect = (preset: typeof PRESETS[0]) => {
    setSettings(prev => ({
      ...prev,
      ...preset.settings,
    }));
    setHasChanges(true);
    setActivePreset(preset.key);
  };

  const renderToggle = (
    key: keyof TrackingSettings,
    label: string,
    icon: string,
    color: string
  ) => (
    <View style={styles.toggleRow}>
      <View style={styles.toggleLeft}>
        <View style={[styles.toggleIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        <Text style={styles.toggleLabel}>{label}</Text>
      </View>
      <Switch
        value={settings[key]}
        onValueChange={() => handleToggle(key)}
        trackColor={{ false: COLORS.surfaceLight, true: COLORS.primary + '60' }}
        thumbColor={settings[key] ? COLORS.primary : COLORS.textSecondary}
      />
    </View>
  );

  const renderTabToggle = (
    key: keyof TrackingSettings,
    label: string,
    icon: string,
    color: string
  ) => (
    <View style={styles.tabToggleRow}>
      <View style={styles.toggleLeft}>
        <View style={[styles.toggleIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        <View>
          <Text style={styles.toggleLabel}>{label}</Text>
          <Text style={styles.tabToggleHint}>
            {settings[key] ? t('visibleInNavigation') : t('hidden')}
          </Text>
        </View>
      </View>
      <Switch
        value={settings[key]}
        onValueChange={() => handleToggle(key)}
        trackColor={{ false: COLORS.surfaceLight, true: COLORS.primary + '60' }}
        thumbColor={settings[key] ? COLORS.primary : COLORS.textSecondary}
      />
    </View>
  );

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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tracking-Einstellungen</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* Quick Presets - NOW AT THE TOP */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ {t('quickSelect')}</Text>
          <Text style={styles.sectionHint}>
            {t('selectPreset')}
          </Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.presetsScroll}
            contentContainerStyle={styles.presetsScrollContent}
          >
            {PRESETS.map((preset) => (
              <TouchableOpacity 
                key={preset.key}
                style={[
                  styles.presetCard,
                  activePreset === preset.key && styles.presetCardActive,
                ]}
                onPress={() => handlePresetSelect(preset)}
              >
                <View style={[styles.presetIcon, { backgroundColor: preset.color + '20' }]}>
                  <Ionicons name={preset.icon as any} size={24} color={preset.color} />
                </View>
                <Text style={[
                  styles.presetLabel,
                  activePreset === preset.key && styles.presetLabelActive,
                ]}>
                  {preset.label}
                </Text>
                <Text style={styles.presetDescription}>{preset.description}</Text>
                {activePreset === preset.key && (
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} style={styles.presetCheck} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <Text style={styles.description}>
          {t('trackingDescription')}
        </Text>

        {/* Nutrition Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🍎 Ernährung</Text>
          <View style={styles.sectionCard}>
            {renderToggle('track_calories', t('calories'), 'flame', COLORS.calories)}
            {renderToggle('track_protein', t('protein'), 'nutrition', COLORS.protein)}
            {renderToggle('track_carbs', t('carbs'), 'leaf', COLORS.carbs)}
            {renderToggle('track_fat', t('fat'), 'water', COLORS.fat)}
            {renderToggle('track_fiber', t('fiber'), 'pulse', COLORS.fiber)}
            {renderToggle('track_sugar', t('sugar'), 'cafe', COLORS.sugar)}
            {renderToggle('track_salt', t('salt'), 'snow', COLORS.textSecondary)}
            {renderToggle('track_water', t('water'), 'water-outline', COLORS.water)}
          </View>
        </View>

        {/* Vitals Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>❤️ Vitaldaten</Text>
          <View style={styles.sectionCard}>
            {renderToggle('track_weight', t('weight'), 'scale', COLORS.info)}
            {renderToggle('track_body_fat', t('bodyFat'), 'body', COLORS.secondary)}
            {renderToggle('track_bmr_neat', 'BMR & NEAT', 'flash', COLORS.accent)}
            {renderToggle('track_sleep', t('sleepDuration'), 'moon', COLORS.secondary)}
            {renderToggle('track_sleep_quality', t('sleepQuality'), 'star', COLORS.accent)}
            {renderToggle('track_morning_energy', t('morningEnergy'), 'sunny', COLORS.accent)}
            {renderToggle('track_resting_heart_rate', t('restingHeartRate'), 'heart', COLORS.error)}
          </View>
        </View>

        {/* Sport Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏃 {t('sport')}</Text>
          <View style={styles.sectionCard}>
            {renderToggle('track_steps', t('steps'), 'footsteps', COLORS.primary)}
            {renderToggle('track_workouts', t('workouts'), 'fitness', COLORS.primary)}
            {renderToggle('track_calories_burned', t('caloriesBurned'), 'flame', COLORS.accent)}
          </View>
        </View>

        {/* Calculations Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧮 {t('calculations')}</Text>
          <Text style={styles.sectionHint}>
            {t('calculationsDescription')}
          </Text>
          <View style={styles.sectionCard}>
            {renderToggle('show_calorie_breakdown', t('calorieBreakdownSetting'), 'calculator', COLORS.calories)}
          </View>
        </View>

        {/* Tab Visibility Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 {t('categoriesShowHide')}</Text>
          <Text style={styles.sectionHint}>
            {t('categoriesDescription')}
          </Text>
          <View style={styles.sectionCard}>
            {renderTabToggle('show_dashboard_tab', t('analytics'), 'analytics', COLORS.info)}
            {renderTabToggle('show_nutrition_tab', t('nutrition'), 'restaurant', COLORS.calories)}
            {renderTabToggle('show_sport_tab', t('sport'), 'fitness', COLORS.primary)}
            {renderTabToggle('show_vitals_tab', t('vitals'), 'heart', COLORS.error)}
            {renderTabToggle('show_finance_tab', t('finance'), 'wallet', COLORS.accent)}
            {renderTabToggle('show_blocker_tab', t('blocker'), 'lock-closed', COLORS.secondary)}
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      {hasChanges && (
        <View style={[styles.saveContainer, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={COLORS.text} />
            ) : (
              <Text style={styles.saveButtonText}>{t('save')}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 16,
    color: COLORS.text,
  },
  tabToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  tabToggleHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  // Presets Styles
  presetsScroll: {
    marginHorizontal: -16,
  },
  presetsScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  presetCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: 110,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  presetIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  presetLabelActive: {
    color: COLORS.primary,
  },
  presetDescription: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  presetCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  saveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
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
