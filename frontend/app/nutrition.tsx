import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../src/constants/colors';
import { useLanguage } from '../src/hooks/useLanguage';
import { nutritionService, nutritionSummaryService, profileService } from '../src/database/services';
import { getDateString, getDisplayDate, getPreviousDay, getNextDay, isToday, getCurrentTime } from '../src/utils/date';
import { estimateNutrition } from '../src/services/aiService';

export default function NutritionScreen() {
  const { t, language } = useLanguage();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [entries, setEntries] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    description: '', calories: '', protein: '', carbs: '', fat: '',
    fiber: '', sugar: '', salt: '', water: '',
  });
  const [isEstimating, setIsEstimating] = useState(false);

  const dateString = getDateString(selectedDate);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ent, sum, prof] = await Promise.all([
        nutritionService.getByDate(dateString),
        nutritionSummaryService.getByDate(dateString),
        profileService.get(),
      ]);
      setEntries(ent);
      setSummary(sum);
      setProfile(prof);
    } catch (error) {
      console.error('Error loading nutrition data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dateString]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const goToPreviousDay = () => setSelectedDate(getPreviousDay(selectedDate));
  const goToNextDay = () => { if (!isToday(selectedDate)) setSelectedDate(getNextDay(selectedDate)); };

  const openAddModal = () => {
    setEditingEntry(null);
    setFormData({ description: '', calories: '', protein: '', carbs: '', fat: '', fiber: '', sugar: '', salt: '', water: '' });
    setSelectedImage(null);
    setModalVisible(true);
  };

  const openEditModal = (entry: any) => {
    setEditingEntry(entry);
    setFormData({
      description: entry.description, calories: entry.calories?.toString() || '',
      protein: entry.protein?.toString() || '', carbs: entry.carbs?.toString() || '',
      fat: entry.fat?.toString() || '', fiber: entry.fiber?.toString() || '',
      sugar: entry.sugar?.toString() || '', salt: entry.salt?.toString() || '',
      water: entry.water?.toString() || '',
    });
    setSelectedImage(null);
    setModalVisible(true);
  };

  const closeModal = () => { setModalVisible(false); setEditingEntry(null); setSelectedImage(null); };

  const handleSave = async () => {
    if (!formData.description.trim()) { Alert.alert('Fehler', 'Bitte gib eine Beschreibung ein'); return; }
    const data = {
      date: dateString, time: getCurrentTime(), description: formData.description,
      calories: parseInt(formData.calories) || 0, protein: parseFloat(formData.protein) || 0,
      carbs: parseFloat(formData.carbs) || 0, fat: parseFloat(formData.fat) || 0,
      fiber: parseFloat(formData.fiber) || 0, sugar: parseFloat(formData.sugar) || 0,
      salt: parseFloat(formData.salt) || 0, water: parseInt(formData.water) || 0,
    };
    try {
      if (editingEntry) {
        await nutritionService.update(editingEntry.id, data);
      } else {
        await nutritionService.create(data);
      }
      closeModal();
      loadData();
    } catch (error) {
      Alert.alert('Fehler', 'Speichern fehlgeschlagen');
    }
  };

  const handleDelete = (entry: any) => {
    Alert.alert(t('delete'), 'Möchtest du diesen Eintrag wirklich löschen?', [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: async () => {
        await nutritionService.delete(entry.id);
        loadData();
      }},
    ]);
  };

  const handleTakePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) { Alert.alert('Berechtigung erforderlich', 'Bitte erlaube den Kamerazugriff'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.5, base64: true });
    if (!result.canceled && result.assets[0].base64) setSelectedImage(result.assets[0].base64);
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) { Alert.alert('Berechtigung erforderlich', 'Bitte erlaube den Zugriff auf die Galerie'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.5, base64: true });
    if (!result.canceled && result.assets[0].base64) setSelectedImage(result.assets[0].base64);
  };

  const handleAiEstimate = async () => {
    if (!formData.description.trim()) {
      Alert.alert('Beschreibung fehlt', 'Bitte gib zuerst eine Beschreibung der Mahlzeit ein.');
      return;
    }
    
    setIsEstimating(true);
    try {
      const estimate = await estimateNutrition(formData.description);
      setFormData(prev => ({
        ...prev,
        calories: estimate.calories.toString(),
        protein: estimate.protein.toString(),
        carbs: estimate.carbs.toString(),
        fat: estimate.fat.toString(),
        fiber: estimate.fiber.toString(),
        sugar: estimate.sugar.toString(),
        salt: estimate.salt.toString(),
        water: estimate.water.toString(),
      }));
      
      const confidenceText = {
        high: 'hoch',
        medium: 'mittel', 
        low: 'niedrig'
      }[estimate.confidence];
      
      Alert.alert(
        'Schätzung abgeschlossen', 
        `Die Nährwerte wurden geschätzt.\nKonfidenz: ${confidenceText}\n\nDu kannst die Werte noch anpassen.`
      );
    } catch (error) {
      Alert.alert('Fehler', 'KI-Schätzung fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setIsEstimating(false);
    }
  };

  const nutrientGoals = profile?.nutrient_goals || {};

  const renderProgressBar = (current: number, goal: number, color: string) => {
    const percentage = goal ? Math.min((current / goal) * 100, 100) : 0;
    return (
      <View style={styles.miniProgressBg}>
        <View style={[styles.miniProgressFill, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.dateNav}>
          <TouchableOpacity onPress={goToPreviousDay} style={styles.dateNavButton}>
            <Ionicons name="chevron-back" size={28} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.dateText}>{getDisplayDate(selectedDate, language)}</Text>
          <TouchableOpacity onPress={goToNextDay} style={[styles.dateNavButton, isToday(selectedDate) && styles.dateNavButtonDisabled]} disabled={isToday(selectedDate)}>
            <Ionicons name="chevron-forward" size={28} color={isToday(selectedDate) ? COLORS.textSecondary : COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('calories')}</Text>
              <Text style={styles.summaryValue}>{summary?.total_calories || 0}</Text>
              {renderProgressBar(summary?.total_calories || 0, nutrientGoals.calories || 2000, COLORS.calories)}
              <Text style={styles.summaryGoal}>/ {nutrientGoals.calories || 2000}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('protein')}</Text>
              <Text style={styles.summaryValue}>{Math.round(summary?.total_protein || 0)}g</Text>
              {renderProgressBar(summary?.total_protein || 0, nutrientGoals.protein || 50, COLORS.protein)}
              <Text style={styles.summaryGoal}>/ {nutrientGoals.protein || 50}g</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('water')}</Text>
              <Text style={styles.summaryValue}>{summary?.total_water || 0}ml</Text>
              {renderProgressBar(summary?.total_water || 0, nutrientGoals.water || 2000, COLORS.water)}
              <Text style={styles.summaryGoal}>/ {nutrientGoals.water || 2000}ml</Text>
            </View>
          </View>
        </View>

        <ScrollView style={styles.entriesList}>
          {isLoading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : entries.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={64} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>Noch keine Eintrage für diesen Tag</Text>
            </View>
          ) : (
            entries.map((entry: any) => (
              <TouchableOpacity key={entry.id} style={styles.entryCard} onPress={() => openEditModal(entry)} onLongPress={() => handleDelete(entry)}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTime}>{entry.time}</Text>
                </View>
                <Text style={styles.entryDescription}>{entry.description}</Text>
                <View style={styles.entryNutrients}>
                  <Text style={[styles.nutrientBadge, { backgroundColor: COLORS.calories + '30' }]}>{entry.calories} kcal</Text>
                  <Text style={[styles.nutrientBadge, { backgroundColor: COLORS.protein + '30' }]}>{entry.protein}g P</Text>
                  <Text style={[styles.nutrientBadge, { backgroundColor: COLORS.carbs + '30' }]}>{entry.carbs}g K</Text>
                  <Text style={[styles.nutrientBadge, { backgroundColor: COLORS.fat + '30' }]}>{entry.fat}g F</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>

        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Ionicons name="add" size={32} color={COLORS.text} />
        </TouchableOpacity>

        <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={closeModal}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingEntry ? t('edit') : t('addEntry')}</Text>
                <TouchableOpacity onPress={closeModal}><Ionicons name="close" size={28} color={COLORS.text} /></TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll}>
                {selectedImage && (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: `data:image/jpeg;base64,${selectedImage}` }} style={styles.imagePreview} />
                    <TouchableOpacity style={styles.removeImageButton} onPress={() => setSelectedImage(null)}>
                      <Ionicons name="close-circle" size={24} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                )}
                <View style={styles.photoButtons}>
                  <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
                    <Ionicons name="camera" size={24} color={COLORS.primary} />
                    <Text style={styles.photoButtonText}>{t('takePhoto')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoButton} onPress={handlePickImage}>
                    <Ionicons name="images" size={24} color={COLORS.primary} />
                    <Text style={styles.photoButtonText}>Galerie</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.inputLabel}>{t('mealDescription')}</Text>
                <TextInput style={[styles.textInput, { minHeight: 50 }]} value={formData.description} onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))} placeholder={language === 'de' ? "z.B. Haferflocken mit Banane" : "e.g. Oatmeal with banana"} placeholderTextColor={COLORS.textSecondary} multiline />
                <TouchableOpacity style={[styles.aiButton, isEstimating && { opacity: 0.7 }]} onPress={handleAiEstimate} disabled={isEstimating}>
                  {isEstimating ? (
                    <ActivityIndicator size="small" color={COLORS.text} />
                  ) : (
                    <Ionicons name="sparkles" size={20} color={COLORS.text} />
                  )}
                  <Text style={styles.aiButtonText}>{isEstimating ? 'Schätze...' : t('aiEstimate')}</Text>
                </TouchableOpacity>
                <View style={styles.nutrientInputs}>
                  <View style={styles.inputRow}>
                    <View style={styles.inputGroup}><Text style={styles.inputLabel}>{t('calories')}</Text><TextInput style={styles.numberInput} value={formData.calories} onChangeText={(text) => setFormData(prev => ({ ...prev, calories: text }))} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textSecondary} /></View>
                    <View style={styles.inputGroup}><Text style={styles.inputLabel}>{t('protein')} (g)</Text><TextInput style={styles.numberInput} value={formData.protein} onChangeText={(text) => setFormData(prev => ({ ...prev, protein: text }))} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={COLORS.textSecondary} /></View>
                  </View>
                  <View style={styles.inputRow}>
                    <View style={styles.inputGroup}><Text style={styles.inputLabel}>{t('carbs')} (g)</Text><TextInput style={styles.numberInput} value={formData.carbs} onChangeText={(text) => setFormData(prev => ({ ...prev, carbs: text }))} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={COLORS.textSecondary} /></View>
                    <View style={styles.inputGroup}><Text style={styles.inputLabel}>{t('fat')} (g)</Text><TextInput style={styles.numberInput} value={formData.fat} onChangeText={(text) => setFormData(prev => ({ ...prev, fat: text }))} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={COLORS.textSecondary} /></View>
                  </View>
                  <View style={styles.inputRow}>
                    <View style={styles.inputGroup}><Text style={styles.inputLabel}>{t('fiber')} (g)</Text><TextInput style={styles.numberInput} value={formData.fiber} onChangeText={(text) => setFormData(prev => ({ ...prev, fiber: text }))} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={COLORS.textSecondary} /></View>
                    <View style={styles.inputGroup}><Text style={styles.inputLabel}>{t('sugar')} (g)</Text><TextInput style={styles.numberInput} value={formData.sugar} onChangeText={(text) => setFormData(prev => ({ ...prev, sugar: text }))} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={COLORS.textSecondary} /></View>
                  </View>
                  <View style={styles.inputRow}>
                    <View style={styles.inputGroup}><Text style={styles.inputLabel}>{t('salt')} (g)</Text><TextInput style={styles.numberInput} value={formData.salt} onChangeText={(text) => setFormData(prev => ({ ...prev, salt: text }))} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={COLORS.textSecondary} /></View>
                    <View style={styles.inputGroup}><Text style={styles.inputLabel}>{t('water')} (ml)</Text><TextInput style={styles.numberInput} value={formData.water} onChangeText={(text) => setFormData(prev => ({ ...prev, water: text }))} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textSecondary} /></View>
                  </View>
                </View>
              </ScrollView>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
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
  container: { flex: 1, backgroundColor: COLORS.background },
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  dateNavButton: { padding: 8 }, dateNavButtonDisabled: { opacity: 0.5 },
  dateText: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  summaryCard: { backgroundColor: COLORS.surface, marginHorizontal: 16, marginBottom: 16, borderRadius: 16, padding: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  summaryGoal: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  miniProgressBg: { width: 60, height: 4, backgroundColor: COLORS.surfaceLight, borderRadius: 2, marginTop: 4, overflow: 'hidden' },
  miniProgressFill: { height: '100%', borderRadius: 2 },
  entriesList: { flex: 1, paddingHorizontal: 16 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 16 },
  entryCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 12 },
  entryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  entryTime: { fontSize: 14, color: COLORS.textSecondary },
  entryDescription: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  entryNutrients: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  nutrientBadge: { fontSize: 12, color: COLORS.text, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  addButton: { position: 'absolute', right: 20, bottom: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceLight },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  modalScroll: { padding: 16 },
  imagePreviewContainer: { position: 'relative', marginBottom: 16 },
  imagePreview: { width: '100%', height: 200, borderRadius: 12 },
  removeImageButton: { position: 'absolute', top: 8, right: 8 },
  photoButtons: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  photoButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceLight, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  photoButtonText: { color: COLORS.text, marginLeft: 8, fontWeight: '500' },
  inputLabel: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 6 },
  textInput: { backgroundColor: COLORS.surfaceLight, borderRadius: 12, padding: 14, color: COLORS.text, fontSize: 16, marginBottom: 16 },
  aiButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accent, borderRadius: 12, padding: 14, marginBottom: 20 },
  aiButtonText: { color: COLORS.text, fontSize: 16, fontWeight: '600', marginLeft: 8 },
  nutrientInputs: { gap: 12 },
  inputRow: { flexDirection: 'row', gap: 12 },
  inputGroup: { flex: 1 },
  numberInput: { backgroundColor: COLORS.surfaceLight, borderRadius: 12, padding: 14, color: COLORS.text, fontSize: 16, textAlign: 'center' },
  saveButton: { backgroundColor: COLORS.primary, marginHorizontal: 16, borderRadius: 12, padding: 16, alignItems: 'center' },
  saveButtonText: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
});
