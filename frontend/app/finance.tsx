import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../src/constants/colors';
import { useLanguage } from '../src/hooks/useLanguage';
import { financeService } from '../src/database/services';
import { getDateString } from '../src/utils/date';

const PERIODS = [
  { key: 'daily', label: 'Taglich', labelEn: 'Daily' },
  { key: 'weekly', label: 'Wochentlich', labelEn: 'Weekly' },
  { key: 'monthly', label: 'Monatlich', labelEn: 'Monthly' },
];

const CATEGORY_COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4', '#FF5722', '#795548', '#607D8B', '#F44336'];
const CATEGORY_ICONS = ['wallet', 'restaurant', 'car', 'film', 'cart', 'home', 'medical', 'school', 'airplane', 'gift'];

export default function FinanceScreen() {
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [summaries, setSummaries] = useState<any[]>([]);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [entryModalVisible, setEntryModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);

  const [categoryForm, setCategoryForm] = useState({ name: '', period: 'monthly', budget: '', icon: 'wallet', color: COLORS.primary });
  const [entryForm, setEntryForm] = useState({ amount: '', description: '', date: getDateString(new Date()) });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await financeService.getAllSummaries();
      setSummaries(data);
    } catch (error) { console.error('Error loading finance data:', error); }
    finally { setIsLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const resetCategoryForm = () => setCategoryForm({ name: '', period: 'monthly', budget: '', icon: 'wallet', color: COLORS.primary });
  const resetEntryForm = () => setEntryForm({ amount: '', description: '', date: getDateString(new Date()) });

  const handleCreateCategory = async () => {
    if (!categoryForm.name.trim()) { Alert.alert('Fehler', 'Bitte gib einen Namen ein'); return; }
    try {
      await financeService.createCategory({
        name: categoryForm.name, budget: categoryForm.budget ? parseFloat(categoryForm.budget) : null,
        rhythm: categoryForm.period, color: categoryForm.color,
      });
      setCategoryModalVisible(false);
      resetCategoryForm();
      loadData();
    } catch (error) { Alert.alert('Fehler', 'Erstellen fehlgeschlagen'); }
  };

  const handleCreateEntry = async () => {
    if (!entryForm.amount || !selectedCategory) { Alert.alert('Fehler', 'Bitte gib einen Betrag ein'); return; }
    try {
      await financeService.createEntry({
        category_id: selectedCategory.category.id,
        amount: parseFloat(entryForm.amount),
        description: entryForm.description || null,
        date: entryForm.date,
      });
      setEntryModalVisible(false);
      resetEntryForm();
      // Refresh selected category detail
      const refreshed = await financeService.getSummary(selectedCategory.category.id);
      setSelectedCategory(refreshed);
      loadData();
    } catch (error) { Alert.alert('Fehler', 'Eintragen fehlgeschlagen'); }
  };

  const handleOpenCategory = async (summary: any) => {
    setSelectedCategory(summary);
    setDetailModalVisible(true);
  };

  const handleDeleteCategory = (category: any) => {
    Alert.alert('Loschen', `Mochtest du "${category.name}" wirklich loschen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Loschen', style: 'destructive', onPress: async () => {
        await financeService.deleteCategory(category.id);
        setDetailModalVisible(false);
        setSelectedCategory(null);
        loadData();
      }},
    ]);
  };

  const handleDeleteEntry = (entryId: string) => {
    Alert.alert('Loschen', 'Eintrag loschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Loschen', style: 'destructive', onPress: async () => {
        await financeService.deleteEntry(entryId);
        if (selectedCategory) {
          const refreshed = await financeService.getSummary(selectedCategory.category.id);
          setSelectedCategory(refreshed);
        }
        loadData();
      }},
    ]);
  };

  const getPeriodLabel = (period: string) => {
    const p = PERIODS.find(p => p.key === period);
    return language === 'de' ? p?.label : p?.labelEn;
  };

  const formatCurrency = (amount: number) => amount.toFixed(2).replace('.', ',') + ' EUR';

  const renderProgressBar = (spent: number, budget: number | null) => {
    if (!budget) return null;
    const percentage = Math.min((spent / budget) * 100, 100);
    const isOver = spent > budget;
    return (
      <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: isOver ? COLORS.error : COLORS.primary }]} /></View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}><Text style={styles.headerTitle}>Finanzen</Text></View>
        <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
          {isLoading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : summaries.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={64} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>Keine Kategorien</Text>
              <Text style={styles.emptySubtext}>Erstelle eine Kategorie, um deine Ausgaben zu tracken</Text>
            </View>
          ) : (
            summaries.map((summary: any) => (
              <TouchableOpacity key={summary.category.id} style={styles.categoryCard} onPress={() => handleOpenCategory(summary)}>
                <View style={styles.categoryHeader}>
                  <View style={[styles.categoryIcon, { backgroundColor: (summary.category.color || COLORS.primary) + '20' }]}>
                    <Ionicons name={(summary.category.icon || 'wallet') as any} size={24} color={summary.category.color || COLORS.primary} />
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{summary.category.name}</Text>
                    <Text style={styles.categoryPeriod}>{getPeriodLabel(summary.category.rhythm || 'monthly')}</Text>
                  </View>
                  <View style={styles.categoryAmount}>
                    <Text style={[styles.amountText, summary.total_spent > (summary.category.budget || Infinity) && { color: COLORS.error }]}>{formatCurrency(summary.total_spent)}</Text>
                    {summary.category.budget && <Text style={styles.budgetText}>von {formatCurrency(summary.category.budget)}</Text>}
                  </View>
                </View>
                {renderProgressBar(summary.total_spent, summary.category.budget)}
                <View style={styles.categoryFooter}>
                  <Text style={styles.entryCount}>{summary.entries.length} Eintrage</Text>
                  {summary.category.budget && (
                    <Text style={[styles.remainingText, summary.budget_remaining < 0 && { color: COLORS.error }]}>
                      {summary.budget_remaining < 0 ? 'Uber Budget: ' : 'Ubrig: '}{formatCurrency(Math.abs(summary.budget_remaining))}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        <TouchableOpacity style={styles.addButton} onPress={() => { resetCategoryForm(); setCategoryModalVisible(true); }}>
          <Ionicons name="add" size={32} color={COLORS.text} />
        </TouchableOpacity>

        {/* Create Category Modal */}
        <Modal visible={categoryModalVisible} animationType="slide" transparent={true} onRequestClose={() => setCategoryModalVisible(false)}>
          <View style={styles.modalOverlay}><View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Neue Kategorie</Text><TouchableOpacity onPress={() => setCategoryModalVisible(false)}><Ionicons name="close" size={28} color={COLORS.text} /></TouchableOpacity></View>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput style={styles.textInput} value={categoryForm.name} onChangeText={(text) => setCategoryForm(prev => ({ ...prev, name: text }))} placeholder="z.B. Mittagessen, Kino, Transport" placeholderTextColor={COLORS.textSecondary} />
              <Text style={styles.inputLabel}>Zeitraum</Text>
              <View style={styles.periodSelector}>
                {PERIODS.map((period) => (
                  <TouchableOpacity key={period.key} style={[styles.periodButton, categoryForm.period === period.key && styles.periodButtonActive]} onPress={() => setCategoryForm(prev => ({ ...prev, period: period.key }))}>
                    <Text style={[styles.periodText, categoryForm.period === period.key && styles.periodTextActive]}>{language === 'de' ? period.label : period.labelEn}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.inputLabel}>Budget (optional)</Text>
              <TextInput style={styles.textInput} value={categoryForm.budget} onChangeText={(text) => setCategoryForm(prev => ({ ...prev, budget: text }))} keyboardType="decimal-pad" placeholder="z.B. 100.00" placeholderTextColor={COLORS.textSecondary} />
              <Text style={styles.inputLabel}>Icon</Text>
              <View style={styles.iconSelector}>
                {CATEGORY_ICONS.map((icon) => (
                  <TouchableOpacity key={icon} style={[styles.iconButton, categoryForm.icon === icon && { backgroundColor: categoryForm.color }]} onPress={() => setCategoryForm(prev => ({ ...prev, icon }))}>
                    <Ionicons name={icon as any} size={20} color={categoryForm.icon === icon ? COLORS.text : COLORS.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.inputLabel}>Farbe</Text>
              <View style={styles.colorSelector}>
                {CATEGORY_COLORS.map((color) => (
                  <TouchableOpacity key={color} style={[styles.colorButton, { backgroundColor: color }, categoryForm.color === color && styles.colorButtonActive]} onPress={() => setCategoryForm(prev => ({ ...prev, color }))} />
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity style={styles.saveButton} onPress={handleCreateCategory}><Text style={styles.saveButtonText}>Erstellen</Text></TouchableOpacity>
          </View></View>
        </Modal>

        {/* Category Detail Modal */}
        <Modal visible={detailModalVisible} animationType="slide" transparent={true} onRequestClose={() => setDetailModalVisible(false)}>
          <View style={styles.modalOverlay}><View style={[styles.modalContent, { maxHeight: '95%' }]}>
            {selectedCategory && (<>
              <View style={styles.modalHeader}>
                <View style={styles.detailHeader}>
                  <View style={[styles.categoryIcon, { backgroundColor: (selectedCategory.category.color || COLORS.primary) + '20' }]}>
                    <Ionicons name={(selectedCategory.category.icon || 'wallet') as any} size={24} color={selectedCategory.category.color || COLORS.primary} />
                  </View>
                  <Text style={styles.modalTitle}>{selectedCategory.category.name}</Text>
                </View>
                <TouchableOpacity onPress={() => setDetailModalVisible(false)}><Ionicons name="close" size={28} color={COLORS.text} /></TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryAmount}>{formatCurrency(selectedCategory.total_spent)}</Text>
                  {selectedCategory.category.budget && (<>
                    {renderProgressBar(selectedCategory.total_spent, selectedCategory.category.budget)}
                    <Text style={[styles.summaryRemaining, selectedCategory.budget_remaining < 0 && { color: COLORS.error }]}>
                      {selectedCategory.budget_remaining < 0 ? `${formatCurrency(Math.abs(selectedCategory.budget_remaining))} uber Budget` : `${formatCurrency(selectedCategory.budget_remaining)} ubrig`}
                    </Text>
                  </>)}
                </View>
                <TouchableOpacity style={styles.addEntryButton} onPress={() => { resetEntryForm(); setEntryModalVisible(true); }}>
                  <Ionicons name="add-circle" size={24} color={COLORS.primary} /><Text style={styles.addEntryText}>Ausgabe eintragen</Text>
                </TouchableOpacity>
                <Text style={styles.entriesTitle}>Eintrage</Text>
                {(selectedCategory.entries || []).length === 0 ? (
                  <Text style={styles.noEntries}>Noch keine Eintrage</Text>
                ) : (
                  (selectedCategory.entries || []).map((entry: any) => (
                    <View key={entry.id} style={styles.entryItem}>
                      <View style={styles.entryInfo}><Text style={styles.entryDate}>{entry.date}</Text>{entry.description && <Text style={styles.entryDescription}>{entry.description}</Text>}</View>
                      <View style={styles.entryRight}>
                        <Text style={styles.entryAmount}>{formatCurrency(entry.amount)}</Text>
                        <TouchableOpacity onPress={() => handleDeleteEntry(entry.id)}><Ionicons name="trash-outline" size={18} color={COLORS.error} /></TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
                <TouchableOpacity style={styles.deleteCategoryButton} onPress={() => handleDeleteCategory(selectedCategory.category)}>
                  <Ionicons name="trash" size={20} color={COLORS.error} /><Text style={styles.deleteCategoryText}>Kategorie loschen</Text>
                </TouchableOpacity>
              </ScrollView>
            </>)}
          </View></View>
        </Modal>

        {/* Add Entry Modal */}
        <Modal visible={entryModalVisible} animationType="slide" transparent={true} onRequestClose={() => setEntryModalVisible(false)}>
          <View style={styles.modalOverlay}><View style={[styles.modalContent, { maxHeight: '50%' }]}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Ausgabe eintragen</Text><TouchableOpacity onPress={() => setEntryModalVisible(false)}><Ionicons name="close" size={28} color={COLORS.text} /></TouchableOpacity></View>
            <View style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Betrag (EUR)</Text>
              <TextInput style={styles.textInput} value={entryForm.amount} onChangeText={(text) => setEntryForm(prev => ({ ...prev, amount: text }))} keyboardType="decimal-pad" placeholder="z.B. 12.50" placeholderTextColor={COLORS.textSecondary} autoFocus />
              <Text style={styles.inputLabel}>Beschreibung (optional)</Text>
              <TextInput style={styles.textInput} value={entryForm.description} onChangeText={(text) => setEntryForm(prev => ({ ...prev, description: text }))} placeholder="z.B. Pizza Margherita" placeholderTextColor={COLORS.textSecondary} />
              <Text style={styles.inputLabel}>Datum</Text>
              <TextInput style={styles.textInput} value={entryForm.date} onChangeText={(text) => setEntryForm(prev => ({ ...prev, date: text }))} placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.textSecondary} />
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={handleCreateEntry}><Text style={styles.saveButtonText}>Eintragen</Text></TouchableOpacity>
          </View></View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceLight },
  headerTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  scrollView: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 16 },
  emptySubtext: { fontSize: 14, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
  categoryCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center' },
  categoryIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  categoryInfo: { flex: 1, marginLeft: 12 },
  categoryName: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  categoryPeriod: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  categoryAmount: { alignItems: 'flex-end' },
  amountText: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  budgetText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  progressBarBg: { height: 6, backgroundColor: COLORS.surfaceLight, borderRadius: 3, marginTop: 12, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  categoryFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  entryCount: { fontSize: 12, color: COLORS.textSecondary },
  remainingText: { fontSize: 12, color: COLORS.primary, fontWeight: '500' },
  addButton: { position: 'absolute', right: 20, bottom: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceLight },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  modalScroll: { padding: 16 },
  inputLabel: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 6, marginTop: 12 },
  textInput: { backgroundColor: COLORS.surfaceLight, borderRadius: 12, padding: 14, color: COLORS.text, fontSize: 16 },
  periodSelector: { flexDirection: 'row', gap: 8, marginTop: 8 },
  periodButton: { flex: 1, paddingVertical: 12, backgroundColor: COLORS.surfaceLight, borderRadius: 12, alignItems: 'center' },
  periodButtonActive: { backgroundColor: COLORS.primary },
  periodText: { fontSize: 14, color: COLORS.textSecondary },
  periodTextActive: { color: COLORS.text, fontWeight: '600' },
  iconSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  colorSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  colorButton: { width: 36, height: 36, borderRadius: 18 },
  colorButtonActive: { borderWidth: 3, borderColor: COLORS.text },
  saveButton: { backgroundColor: COLORS.primary, marginHorizontal: 16, borderRadius: 12, padding: 16, alignItems: 'center' },
  saveButtonText: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  summaryCard: { backgroundColor: COLORS.surfaceLight, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 },
  summaryAmount: { fontSize: 32, fontWeight: '700', color: COLORS.text, marginTop: 8 },
  summaryRemaining: { fontSize: 14, color: COLORS.primary, marginTop: 8 },
  addEntryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary + '20', padding: 14, borderRadius: 12, gap: 8, marginBottom: 20 },
  addEntryText: { fontSize: 16, fontWeight: '600', color: COLORS.primary },
  entriesTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  noEntries: { textAlign: 'center', color: COLORS.textSecondary, paddingVertical: 20 },
  entryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceLight },
  entryInfo: { flex: 1 },
  entryDate: { fontSize: 14, color: COLORS.textSecondary },
  entryDescription: { fontSize: 15, color: COLORS.text, marginTop: 2 },
  entryRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  entryAmount: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  deleteCategoryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, marginTop: 24, gap: 8 },
  deleteCategoryText: { fontSize: 16, color: COLORS.error },
});
