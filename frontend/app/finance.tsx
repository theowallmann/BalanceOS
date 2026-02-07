import React, { useState } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS } from '../src/constants/colors';
import { useLanguage } from '../src/hooks/useLanguage';
import { financeApi } from '../src/services/api';
import { getDateString } from '../src/utils/date';

const PERIODS = [
  { key: 'daily', label: 'Täglich', labelEn: 'Daily' },
  { key: 'weekly', label: 'Wöchentlich', labelEn: 'Weekly' },
  { key: 'monthly', label: 'Monatlich', labelEn: 'Monthly' },
];

const CATEGORY_COLORS = [
  '#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', 
  '#00BCD4', '#FF5722', '#795548', '#607D8B', '#F44336',
];

const CATEGORY_ICONS = [
  'wallet', 'restaurant', 'car', 'film', 'cart', 
  'home', 'medical', 'school', 'airplane', 'gift',
];

interface Category {
  id: string;
  name: string;
  period: string;
  budget: number | null;
  icon: string;
  color: string;
}

interface CategorySummary {
  category: Category;
  period_start: string;
  period_end: string;
  total_spent: number;
  budget: number | null;
  remaining: number | null;
  over_budget: boolean;
  entries: any[];
  entry_count: number;
}

export default function FinanceScreen() {
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [entryModalVisible, setEntryModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategorySummary | null>(null);
  
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    period: 'monthly',
    budget: '',
    icon: 'wallet',
    color: COLORS.primary,
  });
  
  const [entryForm, setEntryForm] = useState({
    amount: '',
    description: '',
    date: getDateString(new Date()),
  });

  const { data: summaries = [], isLoading, refetch } = useQuery({
    queryKey: ['financeSummaries'],
    queryFn: () => financeApi.getAllSummaries().then(res => res.data),
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data: any) => financeApi.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeSummaries'] });
      setCategoryModalVisible(false);
      resetCategoryForm();
      Alert.alert('Erfolg', 'Kategorie erstellt');
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => financeApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeSummaries'] });
      setDetailModalVisible(false);
      setSelectedCategory(null);
    },
  });

  const createEntryMutation = useMutation({
    mutationFn: (data: any) => financeApi.createEntry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeSummaries'] });
      setEntryModalVisible(false);
      resetEntryForm();
      Alert.alert('Erfolg', 'Ausgabe eingetragen');
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (id: string) => financeApi.deleteEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeSummaries'] });
      // Refresh selected category if open
      if (selectedCategory) {
        financeApi.getSummary(selectedCategory.category.id).then(res => {
          setSelectedCategory(res.data);
        });
      }
    },
  });

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      period: 'monthly',
      budget: '',
      icon: 'wallet',
      color: COLORS.primary,
    });
  };

  const resetEntryForm = () => {
    setEntryForm({
      amount: '',
      description: '',
      date: getDateString(new Date()),
    });
  };

  const handleCreateCategory = () => {
    if (!categoryForm.name.trim()) {
      Alert.alert('Fehler', 'Bitte gib einen Namen ein');
      return;
    }

    createCategoryMutation.mutate({
      name: categoryForm.name,
      period: categoryForm.period,
      budget: categoryForm.budget ? parseFloat(categoryForm.budget) : null,
      icon: categoryForm.icon,
      color: categoryForm.color,
    });
  };

  const handleCreateEntry = () => {
    if (!entryForm.amount || !selectedCategory) {
      Alert.alert('Fehler', 'Bitte gib einen Betrag ein');
      return;
    }

    createEntryMutation.mutate({
      category_id: selectedCategory.category.id,
      amount: parseFloat(entryForm.amount),
      description: entryForm.description || null,
      date: entryForm.date,
    });
  };

  const handleOpenCategory = async (summary: CategorySummary) => {
    setSelectedCategory(summary);
    setDetailModalVisible(true);
  };

  const handleDeleteCategory = (category: Category) => {
    Alert.alert(
      'Löschen',
      `Möchtest du "${category.name}" wirklich löschen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        { 
          text: 'Löschen', 
          style: 'destructive', 
          onPress: () => deleteCategoryMutation.mutate(category.id) 
        },
      ]
    );
  };

  const getPeriodLabel = (period: string) => {
    const p = PERIODS.find(p => p.key === period);
    return language === 'de' ? p?.label : p?.labelEn;
  };

  const formatCurrency = (amount: number) => {
    return amount.toFixed(2).replace('.', ',') + ' €';
  };

  const renderProgressBar = (spent: number, budget: number | null) => {
    if (!budget) return null;
    const percentage = Math.min((spent / budget) * 100, 100);
    const isOver = spent > budget;
    return (
      <View style={styles.progressBarBg}>
        <View 
          style={[
            styles.progressBarFill, 
            { 
              width: `${percentage}%`, 
              backgroundColor: isOver ? COLORS.error : COLORS.primary 
            }
          ]} 
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Finanzen</Text>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        >
          {isLoading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : summaries.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={64} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>Keine Kategorien</Text>
              <Text style={styles.emptySubtext}>
                Erstelle eine Kategorie, um deine Ausgaben zu tracken
              </Text>
            </View>
          ) : (
            summaries.map((summary: CategorySummary) => (
              <TouchableOpacity 
                key={summary.category.id} 
                style={styles.categoryCard}
                onPress={() => handleOpenCategory(summary)}
              >
                <View style={styles.categoryHeader}>
                  <View style={[styles.categoryIcon, { backgroundColor: summary.category.color + '20' }]}>
                    <Ionicons 
                      name={summary.category.icon as any} 
                      size={24} 
                      color={summary.category.color} 
                    />
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{summary.category.name}</Text>
                    <Text style={styles.categoryPeriod}>{getPeriodLabel(summary.category.period)}</Text>
                  </View>
                  <View style={styles.categoryAmount}>
                    <Text style={[
                      styles.amountText,
                      summary.over_budget && { color: COLORS.error }
                    ]}>
                      {formatCurrency(summary.total_spent)}
                    </Text>
                    {summary.budget && (
                      <Text style={styles.budgetText}>
                        von {formatCurrency(summary.budget)}
                      </Text>
                    )}
                  </View>
                </View>
                {renderProgressBar(summary.total_spent, summary.budget)}
                <View style={styles.categoryFooter}>
                  <Text style={styles.entryCount}>
                    {summary.entry_count} Einträge
                  </Text>
                  {summary.remaining !== null && (
                    <Text style={[
                      styles.remainingText,
                      summary.over_budget && { color: COLORS.error }
                    ]}>
                      {summary.over_budget ? 'Über Budget: ' : 'Übrig: '}
                      {formatCurrency(Math.abs(summary.remaining))}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* Add Category Button */}
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => {
            resetCategoryForm();
            setCategoryModalVisible(true);
          }}
        >
          <Ionicons name="add" size={32} color={COLORS.text} />
        </TouchableOpacity>

        {/* Create Category Modal */}
        <Modal
          visible={categoryModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setCategoryModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Neue Kategorie</Text>
                <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                  <Ionicons name="close" size={28} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={categoryForm.name}
                  onChangeText={(text) => setCategoryForm(prev => ({ ...prev, name: text }))}
                  placeholder="z.B. Mittagessen, Kino, Transport"
                  placeholderTextColor={COLORS.textSecondary}
                />

                <Text style={styles.inputLabel}>Zeitraum</Text>
                <View style={styles.periodSelector}>
                  {PERIODS.map((period) => (
                    <TouchableOpacity
                      key={period.key}
                      style={[
                        styles.periodButton,
                        categoryForm.period === period.key && styles.periodButtonActive,
                      ]}
                      onPress={() => setCategoryForm(prev => ({ ...prev, period: period.key }))}
                    >
                      <Text style={[
                        styles.periodText,
                        categoryForm.period === period.key && styles.periodTextActive,
                      ]}>
                        {language === 'de' ? period.label : period.labelEn}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Budget (optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={categoryForm.budget}
                  onChangeText={(text) => setCategoryForm(prev => ({ ...prev, budget: text }))}
                  keyboardType="decimal-pad"
                  placeholder="z.B. 100.00"
                  placeholderTextColor={COLORS.textSecondary}
                />

                <Text style={styles.inputLabel}>Icon</Text>
                <View style={styles.iconSelector}>
                  {CATEGORY_ICONS.map((icon) => (
                    <TouchableOpacity
                      key={icon}
                      style={[
                        styles.iconButton,
                        categoryForm.icon === icon && { backgroundColor: categoryForm.color },
                      ]}
                      onPress={() => setCategoryForm(prev => ({ ...prev, icon }))}
                    >
                      <Ionicons 
                        name={icon as any} 
                        size={20} 
                        color={categoryForm.icon === icon ? COLORS.text : COLORS.textSecondary} 
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Farbe</Text>
                <View style={styles.colorSelector}>
                  {CATEGORY_COLORS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorButton,
                        { backgroundColor: color },
                        categoryForm.color === color && styles.colorButtonActive,
                      ]}
                      onPress={() => setCategoryForm(prev => ({ ...prev, color }))}
                    />
                  ))}
                </View>
              </ScrollView>

              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={handleCreateCategory}
                disabled={createCategoryMutation.isPending}
              >
                {createCategoryMutation.isPending ? (
                  <ActivityIndicator color={COLORS.text} />
                ) : (
                  <Text style={styles.saveButtonText}>Erstellen</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Category Detail Modal */}
        <Modal
          visible={detailModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setDetailModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '95%' }]}>
              {selectedCategory && (
                <>
                  <View style={styles.modalHeader}>
                    <View style={styles.detailHeader}>
                      <View style={[styles.categoryIcon, { backgroundColor: selectedCategory.category.color + '20' }]}>
                        <Ionicons 
                          name={selectedCategory.category.icon as any} 
                          size={24} 
                          color={selectedCategory.category.color} 
                        />
                      </View>
                      <Text style={styles.modalTitle}>{selectedCategory.category.name}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                      <Ionicons name="close" size={28} color={COLORS.text} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.modalScroll}>
                    {/* Summary */}
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryPeriod}>
                        {selectedCategory.period_start} - {selectedCategory.period_end}
                      </Text>
                      <Text style={styles.summaryAmount}>
                        {formatCurrency(selectedCategory.total_spent)}
                      </Text>
                      {selectedCategory.budget && (
                        <>
                          {renderProgressBar(selectedCategory.total_spent, selectedCategory.budget)}
                          <Text style={[
                            styles.summaryRemaining,
                            selectedCategory.over_budget && { color: COLORS.error }
                          ]}>
                            {selectedCategory.over_budget 
                              ? `${formatCurrency(Math.abs(selectedCategory.remaining || 0))} über Budget`
                              : `${formatCurrency(selectedCategory.remaining || 0)} übrig`
                            }
                          </Text>
                        </>
                      )}
                    </View>

                    {/* Add Entry Button */}
                    <TouchableOpacity 
                      style={styles.addEntryButton}
                      onPress={() => {
                        resetEntryForm();
                        setEntryModalVisible(true);
                      }}
                    >
                      <Ionicons name="add-circle" size={24} color={COLORS.primary} />
                      <Text style={styles.addEntryText}>Ausgabe eintragen</Text>
                    </TouchableOpacity>

                    {/* Entries List */}
                    <Text style={styles.entriesTitle}>Einträge</Text>
                    {selectedCategory.entries.length === 0 ? (
                      <Text style={styles.noEntries}>Noch keine Einträge</Text>
                    ) : (
                      selectedCategory.entries.map((entry: any) => (
                        <View key={entry.id} style={styles.entryItem}>
                          <View style={styles.entryInfo}>
                            <Text style={styles.entryDate}>{entry.date}</Text>
                            {entry.description && (
                              <Text style={styles.entryDescription}>{entry.description}</Text>
                            )}
                          </View>
                          <View style={styles.entryRight}>
                            <Text style={styles.entryAmount}>{formatCurrency(entry.amount)}</Text>
                            <TouchableOpacity 
                              onPress={() => {
                                Alert.alert(
                                  'Löschen',
                                  'Eintrag löschen?',
                                  [
                                    { text: 'Abbrechen', style: 'cancel' },
                                    { text: 'Löschen', style: 'destructive', onPress: () => deleteEntryMutation.mutate(entry.id) },
                                  ]
                                );
                              }}
                            >
                              <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))
                    )}

                    {/* Delete Category */}
                    <TouchableOpacity 
                      style={styles.deleteCategoryButton}
                      onPress={() => handleDeleteCategory(selectedCategory.category)}
                    >
                      <Ionicons name="trash" size={20} color={COLORS.error} />
                      <Text style={styles.deleteCategoryText}>Kategorie löschen</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Add Entry Modal */}
        <Modal
          visible={entryModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setEntryModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '50%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Ausgabe eintragen</Text>
                <TouchableOpacity onPress={() => setEntryModalVisible(false)}>
                  <Ionicons name="close" size={28} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalScroll}>
                <Text style={styles.inputLabel}>Betrag (€)</Text>
                <TextInput
                  style={styles.textInput}
                  value={entryForm.amount}
                  onChangeText={(text) => setEntryForm(prev => ({ ...prev, amount: text }))}
                  keyboardType="decimal-pad"
                  placeholder="z.B. 12.50"
                  placeholderTextColor={COLORS.textSecondary}
                  autoFocus
                />

                <Text style={styles.inputLabel}>Beschreibung (optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={entryForm.description}
                  onChangeText={(text) => setEntryForm(prev => ({ ...prev, description: text }))}
                  placeholder="z.B. Pizza Margherita"
                  placeholderTextColor={COLORS.textSecondary}
                />

                <Text style={styles.inputLabel}>Datum</Text>
                <TextInput
                  style={styles.textInput}
                  value={entryForm.date}
                  onChangeText={(text) => setEntryForm(prev => ({ ...prev, date: text }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>

              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={handleCreateEntry}
                disabled={createEntryMutation.isPending}
              >
                {createEntryMutation.isPending ? (
                  <ActivityIndicator color={COLORS.text} />
                ) : (
                  <Text style={styles.saveButtonText}>Eintragen</Text>
                )}
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
  header: {
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
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  categoryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryInfo: {
    flex: 1,
    marginLeft: 12,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  categoryPeriod: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  categoryAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  budgetText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  categoryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  entryCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  remainingText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
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
    maxHeight: '85%',
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
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: COLORS.primary,
  },
  periodText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  periodTextActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
  iconSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  colorButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorButtonActive: {
    borderWidth: 3,
    borderColor: COLORS.text,
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
  summaryCard: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryPeriod: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 8,
  },
  summaryRemaining: {
    fontSize: 14,
    color: COLORS.primary,
    marginTop: 8,
  },
  addEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '20',
    padding: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
  },
  addEntryText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  entriesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  noEntries: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    paddingVertical: 20,
  },
  entryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  entryInfo: {
    flex: 1,
  },
  entryDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  entryDescription: {
    fontSize: 15,
    color: COLORS.text,
    marginTop: 2,
  },
  entryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  entryAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  deleteCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    marginTop: 24,
    gap: 8,
  },
  deleteCategoryText: {
    fontSize: 16,
    color: COLORS.error,
  },
});
