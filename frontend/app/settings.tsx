import React, { useState, useEffect } from 'react';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { COLORS } from '../src/constants/colors';
import { useLanguage } from '../src/hooks/useLanguage';
import { profileApi } from '../src/services/api';

interface TrackingSettings {
  track_calories: boolean;
  track_protein: boolean;
  track_carbs: boolean;
  track_fat: boolean;
  track_fiber: boolean;
  track_sugar: boolean;
  track_salt: boolean;
  track_water: boolean;
  track_weight: boolean;
  track_body_fat: boolean;
  track_sleep: boolean;
  track_sleep_quality: boolean;
  track_morning_energy: boolean;
  track_resting_heart_rate: boolean;
  track_steps: boolean;
  track_workouts: boolean;
  track_calories_burned: boolean;
}

const DEFAULT_SETTINGS: TrackingSettings = {
  track_calories: true,
  track_protein: true,
  track_carbs: true,
  track_fat: true,
  track_fiber: false,
  track_sugar: false,
  track_salt: false,
  track_water: true,
  track_weight: true,
  track_body_fat: false,
  track_sleep: true,
  track_sleep_quality: false,
  track_morning_energy: false,
  track_resting_heart_rate: false,
  track_steps: true,
  track_workouts: true,
  track_calories_burned: true,
};

export default function SettingsScreen() {
  const { t, language, switchLanguage } = useLanguage();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const router = useRouter();
  
  const [settings, setSettings] = useState<TrackingSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.get().then(res => res.data),
  });

  useEffect(() => {
    if (profile?.tracking_settings) {
      setSettings({
        ...DEFAULT_SETTINGS,
        ...profile.tracking_settings,
      });
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => profileApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setHasChanges(false);
      Alert.alert('Erfolg', 'Einstellungen gespeichert');
    },
    onError: () => {
      Alert.alert('Fehler', 'Einstellungen konnten nicht gespeichert werden');
    },
  });

  const handleToggle = (key: keyof TrackingSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateMutation.mutate({
      tracking_settings: settings,
    });
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
        <Text style={styles.description}>
          Wähle aus, welche Daten du tracken möchtest. Nicht aktivierte Kategorien werden 
          im Dashboard und in der Auswertung ausgeblendet.
        </Text>

        {/* Nutrition Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ernährung</Text>
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
          <Text style={styles.sectionTitle}>Vitaldaten</Text>
          <View style={styles.sectionCard}>
            {renderToggle('track_weight', t('weight'), 'scale', COLORS.info)}
            {renderToggle('track_body_fat', t('bodyFat'), 'body', COLORS.secondary)}
            {renderToggle('track_sleep', t('sleepDuration'), 'moon', COLORS.secondary)}
            {renderToggle('track_sleep_quality', t('sleepQuality'), 'star', COLORS.accent)}
            {renderToggle('track_morning_energy', t('morningEnergy'), 'sunny', COLORS.accent)}
            {renderToggle('track_resting_heart_rate', t('restingHeartRate'), 'heart', COLORS.error)}
          </View>
        </View>

        {/* Sport Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('sport')}</Text>
          <View style={styles.sectionCard}>
            {renderToggle('track_steps', t('steps'), 'footsteps', COLORS.primary)}
            {renderToggle('track_workouts', t('workouts'), 'fitness', COLORS.primary)}
            {renderToggle('track_calories_burned', t('caloriesBurned'), 'flame', COLORS.accent)}
          </View>
        </View>

        {/* Quick Presets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schnellauswahl</Text>
          <View style={styles.presetsRow}>
            <TouchableOpacity 
              style={styles.presetButton}
              onPress={() => {
                setSettings({
                  ...DEFAULT_SETTINGS,
                  track_calories: true,
                  track_protein: false,
                  track_carbs: false,
                  track_fat: false,
                  track_weight: true,
                });
                setHasChanges(true);
              }}
            >
              <Ionicons name="trending-down" size={20} color={COLORS.primary} />
              <Text style={styles.presetText}>Nur Abnehmen</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.presetButton}
              onPress={() => {
                setSettings({
                  ...DEFAULT_SETTINGS,
                  track_calories: true,
                  track_protein: true,
                  track_weight: true,
                  track_workouts: true,
                });
                setHasChanges(true);
              }}
            >
              <Ionicons name="barbell" size={20} color={COLORS.primary} />
              <Text style={styles.presetText}>Muskelaufbau</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.presetsRow}>
            <TouchableOpacity 
              style={styles.presetButton}
              onPress={() => {
                setSettings({
                  ...DEFAULT_SETTINGS,
                  track_water: true,
                  track_calories: false,
                  track_protein: false,
                  track_carbs: false,
                  track_fat: false,
                });
                setHasChanges(true);
              }}
            >
              <Ionicons name="water" size={20} color={COLORS.water} />
              <Text style={styles.presetText}>Nur Trinken</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.presetButton}
              onPress={() => {
                setSettings({
                  track_calories: true,
                  track_protein: true,
                  track_carbs: true,
                  track_fat: true,
                  track_fiber: true,
                  track_sugar: true,
                  track_salt: true,
                  track_water: true,
                  track_weight: true,
                  track_body_fat: true,
                  track_sleep: true,
                  track_sleep_quality: true,
                  track_morning_energy: true,
                  track_resting_heart_rate: true,
                  track_steps: true,
                  track_workouts: true,
                  track_calories_burned: true,
                });
                setHasChanges(true);
              }}
            >
              <Ionicons name="checkmark-done" size={20} color={COLORS.success} />
              <Text style={styles.presetText}>Alles tracken</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      {hasChanges && (
        <View style={[styles.saveContainer, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
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
    marginTop: 16,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
  presetsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  presetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  presetText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
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
