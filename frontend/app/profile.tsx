import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Share,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../src/constants/colors';
import { useLanguage } from '../src/hooks/useLanguage';
import { profileService, exportService } from '../src/database/services';

export default function ProfileScreen() {
  const { t, language, switchLanguage } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const [formData, setFormData] = useState({
    birth_date: '', height: '', gender: 'male',
    calories: '', protein: '', carbs: '', fat: '', fiber: '', sugar: '', salt: '', water: '',
    target_weight: '', target_body_fat: '', sleep_hours: '', resting_heart_rate_goal: '',
    daily_steps: '', weekly_workouts: '', overall_goal: '',
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const prof = await profileService.get();
      setProfile(prof);
      if (prof) {
        setFormData({
          birth_date: prof.birth_date || '', height: prof.height?.toString() || '',
          gender: prof.gender || 'male',
          calories: prof.nutrient_goals?.calories?.toString() || '',
          protein: prof.nutrient_goals?.protein?.toString() || '',
          carbs: prof.nutrient_goals?.carbs?.toString() || '',
          fat: prof.nutrient_goals?.fat?.toString() || '',
          fiber: prof.nutrient_goals?.fiber?.toString() || '',
          sugar: prof.nutrient_goals?.sugar?.toString() || '',
          salt: prof.nutrient_goals?.salt?.toString() || '',
          water: prof.nutrient_goals?.water?.toString() || '',
          target_weight: prof.vital_goals?.target_weight?.toString() || '',
          target_body_fat: prof.vital_goals?.target_body_fat?.toString() || '',
          sleep_hours: prof.vital_goals?.sleep_hours?.toString() || '',
          resting_heart_rate_goal: prof.vital_goals?.resting_heart_rate?.toString() || '',
          daily_steps: prof.sport_goals?.daily_steps?.toString() || '',
          weekly_workouts: prof.sport_goals?.weekly_workouts?.toString() || '',
          overall_goal: '',
        });
      }
    } catch (error) { console.error('Error loading profile:', error); }
    finally { setIsLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await profileService.update({
        birth_date: formData.birth_date || null,
        height: parseFloat(formData.height) || null,
        gender: formData.gender,
        nutrient_goals: {
          calories: parseInt(formData.calories) || 2000, protein: parseInt(formData.protein) || 50,
          carbs: parseInt(formData.carbs) || 250, fat: parseInt(formData.fat) || 65,
          fiber: parseInt(formData.fiber) || 25, sugar: parseInt(formData.sugar) || 50,
          salt: parseFloat(formData.salt) || 6, water: parseInt(formData.water) || 2000,
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
      });
      setIsEditing(false);
      Alert.alert('Erfolg', 'Profil gespeichert');
      loadData();
    } catch (error) { Alert.alert('Fehler', 'Profil konnte nicht gespeichert werden'); }
    finally { setIsSaving(false); }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = await exportService.exportToCsv();
      const combinedCsv = `=== ERNAHRUNG (${data.counts.nutrition} Eintrage) ===\n${data.nutrition_csv}\n\n=== VITALDATEN (${data.counts.vitals} Eintrage) ===\n${data.vitals_csv}\n\n=== SPORT (${data.counts.sport} Eintrage) ===\n${data.sport_csv}`;
      await Share.share({ message: combinedCsv, title: `HealthMate Export ${data.start_date} bis ${data.end_date}` });
    } catch (error) { Alert.alert('Fehler', 'Daten konnten nicht exportiert werden'); }
    finally { setIsExporting(false); }
  };

  const renderGenderSelector = () => (
    <View style={styles.genderSelector}>
      {['male', 'female', 'diverse'].map((gender) => (
        <TouchableOpacity key={gender} style={[styles.genderOption, formData.gender === gender && styles.genderOptionActive]} onPress={() => setFormData(prev => ({ ...prev, gender }))} disabled={!isEditing}>
          <Ionicons name={gender === 'male' ? 'male' : gender === 'female' ? 'female' : 'male-female'} size={20} color={formData.gender === gender ? COLORS.text : COLORS.textSecondary} />
          <Text style={[styles.genderText, formData.gender === gender && styles.genderTextActive]}>{t(gender as any)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (isLoading) {
    return <SafeAreaView style={styles.container}><View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('profile')}</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.langButton} onPress={switchLanguage}><Text style={styles.langText}>{language.toUpperCase()}</Text></TouchableOpacity>
            {!isEditing ? (
              <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}><Ionicons name="pencil" size={20} color={COLORS.primary} /></TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.saveHeaderButton} onPress={handleSave} disabled={isSaving}>
                {isSaving ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={styles.saveHeaderText}>{t('save')}</Text>}
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView style={styles.scrollView}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personliche Daten</Text>
            <View style={styles.card}>
              <View style={styles.inputRow}>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>{t('birthDate')}</Text><TextInput style={[styles.textInput, !isEditing && styles.textInputDisabled]} value={formData.birth_date} onChangeText={(text) => setFormData(prev => ({ ...prev, birth_date: text }))} placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.textSecondary} editable={isEditing} /></View>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>{t('height')} ({t('cm')})</Text><TextInput style={[styles.textInput, !isEditing && styles.textInputDisabled]} value={formData.height} onChangeText={(text) => setFormData(prev => ({ ...prev, height: text }))} keyboardType="numeric" placeholder="z.B. 175" placeholderTextColor={COLORS.textSecondary} editable={isEditing} /></View>
              </View>
              <Text style={styles.inputLabel}>{t('gender')}</Text>
              {renderGenderSelector()}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('nutrientGoals')}</Text>
            <View style={styles.card}>
              <View style={styles.inputRow}>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>{t('calories')}</Text><TextInput style={[styles.textInput, !isEditing && styles.textInputDisabled]} value={formData.calories} onChangeText={(text) => setFormData(prev => ({ ...prev, calories: text }))} keyboardType="numeric" placeholder="z.B. 2000" placeholderTextColor={COLORS.textSecondary} editable={isEditing} /></View>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>{t('protein')} (g)</Text><TextInput style={[styles.textInput, !isEditing && styles.textInputDisabled]} value={formData.protein} onChangeText={(text) => setFormData(prev => ({ ...prev, protein: text }))} keyboardType="numeric" placeholder="z.B. 50" placeholderTextColor={COLORS.textSecondary} editable={isEditing} /></View>
              </View>
              <View style={styles.inputRow}>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>{t('carbs')} (g)</Text><TextInput style={[styles.textInput, !isEditing && styles.textInputDisabled]} value={formData.carbs} onChangeText={(text) => setFormData(prev => ({ ...prev, carbs: text }))} keyboardType="numeric" placeholder="z.B. 250" placeholderTextColor={COLORS.textSecondary} editable={isEditing} /></View>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>{t('fat')} (g)</Text><TextInput style={[styles.textInput, !isEditing && styles.textInputDisabled]} value={formData.fat} onChangeText={(text) => setFormData(prev => ({ ...prev, fat: text }))} keyboardType="numeric" placeholder="z.B. 65" placeholderTextColor={COLORS.textSecondary} editable={isEditing} /></View>
              </View>
              <View style={styles.inputRow}>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>{t('water')} (ml)</Text><TextInput style={[styles.textInput, !isEditing && styles.textInputDisabled]} value={formData.water} onChangeText={(text) => setFormData(prev => ({ ...prev, water: text }))} keyboardType="numeric" placeholder="z.B. 2000" placeholderTextColor={COLORS.textSecondary} editable={isEditing} /></View>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>{t('fiber')} (g)</Text><TextInput style={[styles.textInput, !isEditing && styles.textInputDisabled]} value={formData.fiber} onChangeText={(text) => setFormData(prev => ({ ...prev, fiber: text }))} keyboardType="numeric" placeholder="25" placeholderTextColor={COLORS.textSecondary} editable={isEditing} /></View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('vitalGoals')}</Text>
            <View style={styles.card}>
              <View style={styles.inputRow}>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>Zielgewicht ({t('kg')})</Text><TextInput style={[styles.textInput, !isEditing && styles.textInputDisabled]} value={formData.target_weight} onChangeText={(text) => setFormData(prev => ({ ...prev, target_weight: text }))} keyboardType="decimal-pad" placeholder="Optional" placeholderTextColor={COLORS.textSecondary} editable={isEditing} /></View>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>Ziel Korperfett (%)</Text><TextInput style={[styles.textInput, !isEditing && styles.textInputDisabled]} value={formData.target_body_fat} onChangeText={(text) => setFormData(prev => ({ ...prev, target_body_fat: text }))} keyboardType="decimal-pad" placeholder="Optional" placeholderTextColor={COLORS.textSecondary} editable={isEditing} /></View>
              </View>
              <View style={styles.inputRow}>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>Schlafziel (h)</Text><TextInput style={[styles.textInput, !isEditing && styles.textInputDisabled]} value={formData.sleep_hours} onChangeText={(text) => setFormData(prev => ({ ...prev, sleep_hours: text }))} keyboardType="decimal-pad" placeholder="8" placeholderTextColor={COLORS.textSecondary} editable={isEditing} /></View>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>Ruhepuls ({t('bpm')})</Text><TextInput style={[styles.textInput, !isEditing && styles.textInputDisabled]} value={formData.resting_heart_rate_goal} onChangeText={(text) => setFormData(prev => ({ ...prev, resting_heart_rate_goal: text }))} keyboardType="numeric" placeholder="60" placeholderTextColor={COLORS.textSecondary} editable={isEditing} /></View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('sportGoals')}</Text>
            <View style={styles.card}>
              <View style={styles.inputRow}>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>Tagliche Schritte</Text><TextInput style={[styles.textInput, !isEditing && styles.textInputDisabled]} value={formData.daily_steps} onChangeText={(text) => setFormData(prev => ({ ...prev, daily_steps: text }))} keyboardType="numeric" placeholder="10000" placeholderTextColor={COLORS.textSecondary} editable={isEditing} /></View>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>Trainings/Woche</Text><TextInput style={[styles.textInput, !isEditing && styles.textInputDisabled]} value={formData.weekly_workouts} onChangeText={(text) => setFormData(prev => ({ ...prev, weekly_workouts: text }))} keyboardType="numeric" placeholder="3" placeholderTextColor={COLORS.textSecondary} editable={isEditing} /></View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Einstellungen</Text>
            <TouchableOpacity style={styles.settingsLink} onPress={() => router.push('/settings')}>
              <View style={styles.settingsLinkLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: COLORS.primary + '20' }]}><Ionicons name="options" size={24} color={COLORS.primary} /></View>
                <View><Text style={styles.settingsLinkTitle}>Tracking-Einstellungen</Text><Text style={styles.settingsLinkSubtitle}>Was mochtest du tracken?</Text></View>
              </View>
              <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daten</Text>
            <TouchableOpacity style={styles.settingsLink} onPress={handleExportData} disabled={isExporting}>
              <View style={styles.settingsLinkLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: COLORS.info + '20' }]}>
                  {isExporting ? <ActivityIndicator size="small" color={COLORS.info} /> : <Ionicons name="download-outline" size={24} color={COLORS.info} />}
                </View>
                <View><Text style={styles.settingsLinkTitle}>Daten exportieren</Text><Text style={styles.settingsLinkSubtitle}>Alle Daten als CSV (letzte 30 Tage)</Text></View>
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
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceLight },
  headerTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  langButton: { backgroundColor: COLORS.surfaceLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  langText: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
  editButton: { padding: 8 },
  saveHeaderButton: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  saveHeaderText: { color: COLORS.text, fontWeight: '600' },
  scrollView: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  card: { backgroundColor: COLORS.surface, padding: 16, borderRadius: 16 },
  inputRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 6 },
  textInput: { backgroundColor: COLORS.surfaceLight, borderRadius: 12, padding: 14, color: COLORS.text, fontSize: 16 },
  textInputDisabled: { opacity: 0.7 },
  genderSelector: { flexDirection: 'row', gap: 8, marginTop: 8 },
  genderOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceLight, padding: 12, borderRadius: 12, gap: 8 },
  genderOptionActive: { backgroundColor: COLORS.primary },
  genderText: { color: COLORS.textSecondary, fontSize: 14 },
  genderTextActive: { color: COLORS.text, fontWeight: '600' },
  settingsLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, padding: 16, borderRadius: 16 },
  settingsLinkLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingsIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  settingsLinkTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  settingsLinkSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
});
