import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { COLORS } from '../src/constants/colors';
import { useLanguage } from '../src/hooks/useLanguage';
import { profileApi, fitbitApi } from '../src/services/api';

export default function ProfileScreen() {
  const { t, language, switchLanguage } = useLanguage();
  const queryClient = useQueryClient();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isEditing, setIsEditing] = useState(false);
  const [aiGoalText, setAiGoalText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    birth_date: '',
    height: '',
    gender: 'male',
    // Nutrient Goals
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    fiber: '',
    sugar: '',
    salt: '',
    water: '',
    // Vital Goals
    target_weight: '',
    target_body_fat: '',
    sleep_hours: '',
    resting_heart_rate_goal: '',
    // Sport Goals
    daily_steps: '',
    weekly_workouts: '',
    overall_goal: '',
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.get().then(res => res.data),
  });

  const { data: fitbitStatus } = useQuery({
    queryKey: ['fitbitStatus'],
    queryFn: () => fitbitApi.getStatus().then(res => res.data),
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        birth_date: profile.birth_date || '',
        height: profile.height?.toString() || '',
        gender: profile.gender || 'male',
        calories: profile.nutrient_goals?.calories?.toString() || '',
        protein: profile.nutrient_goals?.protein?.toString() || '',
        carbs: profile.nutrient_goals?.carbs?.toString() || '',
        fat: profile.nutrient_goals?.fat?.toString() || '',
        fiber: profile.nutrient_goals?.fiber?.toString() || '',
        sugar: profile.nutrient_goals?.sugar?.toString() || '',
        salt: profile.nutrient_goals?.salt?.toString() || '',
        water: profile.nutrient_goals?.water?.toString() || '',
        target_weight: profile.vital_goals?.target_weight?.toString() || '',
        target_body_fat: profile.vital_goals?.target_body_fat?.toString() || '',
        sleep_hours: profile.vital_goals?.sleep_hours?.toString() || '',
        resting_heart_rate_goal: profile.vital_goals?.resting_heart_rate?.toString() || '',
        daily_steps: profile.sport_goals?.daily_steps?.toString() || '',
        weekly_workouts: profile.sport_goals?.weekly_workouts?.toString() || '',
        overall_goal: profile.overall_goal || '',
      });
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => profileApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setIsEditing(false);
      Alert.alert('Erfolg', 'Profil gespeichert');
    },
    onError: () => {
      Alert.alert('Fehler', 'Profil konnte nicht gespeichert werden');
    },
  });

  const handleSave = () => {
    const data = {
      birth_date: formData.birth_date || null,
      height: parseFloat(formData.height) || null,
      gender: formData.gender,
      nutrient_goals: {
        calories: parseInt(formData.calories) || 2000,
        protein: parseInt(formData.protein) || 50,
        carbs: parseInt(formData.carbs) || 250,
        fat: parseInt(formData.fat) || 65,
        fiber: parseInt(formData.fiber) || 25,
        sugar: parseInt(formData.sugar) || 50,
        salt: parseFloat(formData.salt) || 6,
        water: parseInt(formData.water) || 2000,
      },
      vital_goals: {
        target_weight: parseFloat(formData.target_weight) || null,
        target_body_fat: parseFloat(formData.target_body_fat) || null,
        sleep_hours: parseFloat(formData.sleep_hours) || 8,
        resting_heart_rate: parseInt(formData.resting_heart_rate_goal) || 60,
      },
      sport_goals: {
        daily_steps: parseInt(formData.daily_steps) || 10000,
        weekly_workouts: parseInt(formData.weekly_workouts) || 3,
      },
      overall_goal: formData.overall_goal,
    };

    updateProfileMutation.mutate(data);
  };

  const handleAiSuggestions = async () => {
    if (!aiGoalText.trim()) {
      Alert.alert('Fehler', 'Bitte gib ein Ziel ein');
      return;
    }

    setIsAiLoading(true);
    try {
      const response = await profileApi.getAiSuggestions(aiGoalText);
      const suggestions = response.data;

      if (suggestions.error) {
        Alert.alert('Fehler', suggestions.error);
        return;
      }

      // Show suggestions and ask if user wants to apply them
      Alert.alert(
        'KI-Vorschläge',
        suggestions.explanation || 'Möchtest du diese Vorschläge übernehmen?',
        [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: 'Übernehmen',
            onPress: () => {
              setFormData(prev => ({
                ...prev,
                calories: suggestions.nutrient_goals?.calories?.toString() || prev.calories,
                protein: suggestions.nutrient_goals?.protein?.toString() || prev.protein,
                carbs: suggestions.nutrient_goals?.carbs?.toString() || prev.carbs,
                fat: suggestions.nutrient_goals?.fat?.toString() || prev.fat,
                fiber: suggestions.nutrient_goals?.fiber?.toString() || prev.fiber,
                sugar: suggestions.nutrient_goals?.sugar?.toString() || prev.sugar,
                salt: suggestions.nutrient_goals?.salt?.toString() || prev.salt,
                water: suggestions.nutrient_goals?.water?.toString() || prev.water,
                target_weight: suggestions.vital_goals?.target_weight?.toString() || prev.target_weight,
                target_body_fat: suggestions.vital_goals?.target_body_fat?.toString() || prev.target_body_fat,
                sleep_hours: suggestions.vital_goals?.sleep_hours?.toString() || prev.sleep_hours,
                daily_steps: suggestions.sport_goals?.daily_steps?.toString() || prev.daily_steps,
                weekly_workouts: suggestions.sport_goals?.weekly_workouts?.toString() || prev.weekly_workouts,
              }));
              setIsEditing(true);
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Fehler', 'KI-Vorschläge konnten nicht abgerufen werden');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleConnectFitbit = async () => {
    try {
      const response = await fitbitApi.getAuthUrl();
      const authUrl = response.data.auth_url;
      await Linking.openURL(authUrl);
    } catch (error) {
      Alert.alert('Fehler', 'Fitbit-Verbindung konnte nicht gestartet werden');
    }
  };

  const handleDisconnectFitbit = () => {
    Alert.alert(
      'Fitbit trennen',
      'Möchtest du die Fitbit-Verbindung wirklich trennen?',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: 'Trennen',
          style: 'destructive',
          onPress: async () => {
            try {
              await fitbitApi.disconnect();
              queryClient.invalidateQueries({ queryKey: ['fitbitStatus'] });
              Alert.alert('Erfolg', 'Fitbit getrennt');
            } catch (error) {
              Alert.alert('Fehler', 'Konnte Fitbit nicht trennen');
            }
          },
        },
      ]
    );
  };

  const renderGenderSelector = () => (
    <View style={styles.genderSelector}>
      {['male', 'female', 'diverse'].map((gender) => (
        <TouchableOpacity
          key={gender}
          style={[
            styles.genderOption,
            formData.gender === gender && styles.genderOptionActive,
          ]}
          onPress={() => setFormData(prev => ({ ...prev, gender }))}
          disabled={!isEditing}
        >
          <Ionicons
            name={gender === 'male' ? 'male' : gender === 'female' ? 'female' : 'male-female'}
            size={20}
            color={formData.gender === gender ? COLORS.text : COLORS.textSecondary}
          />
          <Text style={[
            styles.genderText,
            formData.gender === gender && styles.genderTextActive,
          ]}>
            {t(gender as any)}
          </Text>
        </TouchableOpacity>
      ))}
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
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('profile')}</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.langButton} onPress={switchLanguage}>
              <Text style={styles.langText}>{language.toUpperCase()}</Text>
            </TouchableOpacity>
            {!isEditing ? (
              <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
                <Ionicons name="pencil" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.saveHeaderButton} 
                onPress={handleSave}
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Text style={styles.saveHeaderText}>{t('save')}</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView style={styles.scrollView}>
          {/* Personal Data */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Persönliche Daten</Text>
            <View style={styles.card}>
              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('birthDate')}</Text>
                  <TextInput
                    style={[styles.textInput, !isEditing && styles.textInputDisabled]}
                    value={formData.birth_date}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, birth_date: text }))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={COLORS.textSecondary}
                    editable={isEditing}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('height')} ({t('cm')})</Text>
                  <TextInput
                    style={[styles.textInput, !isEditing && styles.textInputDisabled]}
                    value={formData.height}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, height: text }))}
                    keyboardType="numeric"
                    placeholder="z.B. 175"
                    placeholderTextColor={COLORS.textSecondary}
                    editable={isEditing}
                  />
                </View>
              </View>
              <Text style={styles.inputLabel}>{t('gender')}</Text>
              {renderGenderSelector()}
            </View>
          </View>

          {/* Nutrient Goals */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('nutrientGoals')}</Text>
            <View style={styles.card}>
              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('calories')}</Text>
                  <TextInput
                    style={[styles.textInput, !isEditing && styles.textInputDisabled]}
                    value={formData.calories}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, calories: text }))}
                    keyboardType="numeric"
                    placeholder="2000"
                    placeholderTextColor={COLORS.textSecondary}
                    editable={isEditing}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('protein')} (g)</Text>
                  <TextInput
                    style={[styles.textInput, !isEditing && styles.textInputDisabled]}
                    value={formData.protein}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, protein: text }))}
                    keyboardType="numeric"
                    placeholder="50"
                    placeholderTextColor={COLORS.textSecondary}
                    editable={isEditing}
                  />
                </View>
              </View>
              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('carbs')} (g)</Text>
                  <TextInput
                    style={[styles.textInput, !isEditing && styles.textInputDisabled]}
                    value={formData.carbs}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, carbs: text }))}
                    keyboardType="numeric"
                    placeholder="250"
                    placeholderTextColor={COLORS.textSecondary}
                    editable={isEditing}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('fat')} (g)</Text>
                  <TextInput
                    style={[styles.textInput, !isEditing && styles.textInputDisabled]}
                    value={formData.fat}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, fat: text }))}
                    keyboardType="numeric"
                    placeholder="65"
                    placeholderTextColor={COLORS.textSecondary}
                    editable={isEditing}
                  />
                </View>
              </View>
              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('water')} (ml)</Text>
                  <TextInput
                    style={[styles.textInput, !isEditing && styles.textInputDisabled]}
                    value={formData.water}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, water: text }))}
                    keyboardType="numeric"
                    placeholder="2000"
                    placeholderTextColor={COLORS.textSecondary}
                    editable={isEditing}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('fiber')} (g)</Text>
                  <TextInput
                    style={[styles.textInput, !isEditing && styles.textInputDisabled]}
                    value={formData.fiber}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, fiber: text }))}
                    keyboardType="numeric"
                    placeholder="25"
                    placeholderTextColor={COLORS.textSecondary}
                    editable={isEditing}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Vital Goals */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('vitalGoals')}</Text>
            <View style={styles.card}>
              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Zielgewicht ({t('kg')})</Text>
                  <TextInput
                    style={[styles.textInput, !isEditing && styles.textInputDisabled]}
                    value={formData.target_weight}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, target_weight: text }))}
                    keyboardType="decimal-pad"
                    placeholder="Optional"
                    placeholderTextColor={COLORS.textSecondary}
                    editable={isEditing}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Ziel Körperfett (%)</Text>
                  <TextInput
                    style={[styles.textInput, !isEditing && styles.textInputDisabled]}
                    value={formData.target_body_fat}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, target_body_fat: text }))}
                    keyboardType="decimal-pad"
                    placeholder="Optional"
                    placeholderTextColor={COLORS.textSecondary}
                    editable={isEditing}
                  />
                </View>
              </View>
              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Schlafziel (h)</Text>
                  <TextInput
                    style={[styles.textInput, !isEditing && styles.textInputDisabled]}
                    value={formData.sleep_hours}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, sleep_hours: text }))}
                    keyboardType="decimal-pad"
                    placeholder="8"
                    placeholderTextColor={COLORS.textSecondary}
                    editable={isEditing}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Ruhepuls ({t('bpm')})</Text>
                  <TextInput
                    style={[styles.textInput, !isEditing && styles.textInputDisabled]}
                    value={formData.resting_heart_rate_goal}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, resting_heart_rate_goal: text }))}
                    keyboardType="numeric"
                    placeholder="60"
                    placeholderTextColor={COLORS.textSecondary}
                    editable={isEditing}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Sport Goals */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('sportGoals')}</Text>
            <View style={styles.card}>
              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Tägliche Schritte</Text>
                  <TextInput
                    style={[styles.textInput, !isEditing && styles.textInputDisabled]}
                    value={formData.daily_steps}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, daily_steps: text }))}
                    keyboardType="numeric"
                    placeholder="10000"
                    placeholderTextColor={COLORS.textSecondary}
                    editable={isEditing}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Trainings/Woche</Text>
                  <TextInput
                    style={[styles.textInput, !isEditing && styles.textInputDisabled]}
                    value={formData.weekly_workouts}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, weekly_workouts: text }))}
                    keyboardType="numeric"
                    placeholder="3"
                    placeholderTextColor={COLORS.textSecondary}
                    editable={isEditing}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* AI Goal Suggestions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>KI-Zielvorschläge</Text>
            <View style={styles.card}>
              <Text style={styles.aiDescription}>
                Beschreibe dein Ziel und erhalte personalisierte Vorschläge für alle Bereiche.
              </Text>
              <TextInput
                style={[styles.textInput, styles.aiInput]}
                value={aiGoalText}
                onChangeText={setAiGoalText}
                placeholder="z.B. Ich möchte 10kg abnehmen und fitter werden"
                placeholderTextColor={COLORS.textSecondary}
                multiline
              />
              <TouchableOpacity 
                style={styles.aiButton} 
                onPress={handleAiSuggestions}
                disabled={isAiLoading}
              >
                {isAiLoading ? (
                  <ActivityIndicator color={COLORS.text} />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={20} color={COLORS.text} />
                    <Text style={styles.aiButtonText}>{t('getAiSuggestions')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Fitbit Connection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fitbit-Verbindung</Text>
            <View style={styles.card}>
              {fitbitStatus?.connected ? (
                <View style={styles.fitbitConnected}>
                  <View style={styles.fitbitStatus}>
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                    <Text style={styles.fitbitStatusText}>{t('fitbitConnected')}</Text>
                  </View>
                  <TouchableOpacity style={styles.fitbitDisconnect} onPress={handleDisconnectFitbit}>
                    <Text style={styles.fitbitDisconnectText}>{t('disconnectFitbit')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.fitbitConnect} onPress={handleConnectFitbit}>
                  <Ionicons name="fitness" size={24} color={COLORS.text} />
                  <Text style={styles.fitbitConnectText}>{t('connectFitbit')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Tracking Settings Link */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Einstellungen</Text>
            <TouchableOpacity 
              style={styles.settingsLink}
              onPress={() => router.push('/settings')}
            >
              <View style={styles.settingsLinkLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: COLORS.primary + '20' }]}>
                  <Ionicons name="options" size={24} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.settingsLinkTitle}>Tracking-Einstellungen</Text>
                  <Text style={styles.settingsLinkSubtitle}>Was möchtest du tracken?</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  langButton: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  langText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 14,
  },
  editButton: {
    padding: 8,
  },
  saveHeaderButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveHeaderText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
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
  card: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 14,
    color: COLORS.text,
    fontSize: 16,
  },
  textInputDisabled: {
    opacity: 0.7,
  },
  genderSelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  genderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceLight,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  genderOptionActive: {
    backgroundColor: COLORS.primary,
  },
  genderText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  genderTextActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
  aiDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  aiInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  aiButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  fitbitConnected: {
    gap: 12,
  },
  fitbitStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fitbitStatusText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '500',
  },
  fitbitDisconnect: {
    padding: 12,
    backgroundColor: COLORS.error + '20',
    borderRadius: 12,
    alignItems: 'center',
  },
  fitbitDisconnectText: {
    color: COLORS.error,
    fontWeight: '600',
  },
  fitbitConnect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.info,
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  fitbitConnectText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
