import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../src/constants/colors';
import { useLanguage } from '../src/hooks/useLanguage';
import { appBlockerService, notificationsService } from '../src/database/services';

const DAYS = [
  { key: 'monday', label: 'Mo' }, { key: 'tuesday', label: 'Di' },
  { key: 'wednesday', label: 'Mi' }, { key: 'thursday', label: 'Do' },
  { key: 'friday', label: 'Fr' }, { key: 'saturday', label: 'Sa' },
  { key: 'sunday', label: 'So' },
];

const NOTIFICATION_TEMPLATES = [
  { title: 'Sport-Erinnerung', message: 'Zeit für dein Training!', type: 'reminder' },
  { title: 'Gewicht eintragen', message: 'Vergiss nicht, dein Gewicht zu tracken!', type: 'reminder' },
  { title: 'Wasser trinken', message: 'Bleib hydriert! Trink ein Glas Wasser', type: 'reminder' },
  { title: 'Mahlzeit tracken', message: 'Hast du schon dein Essen eingetragen?', type: 'reminder' },
];

export default function BlockerScreen() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'blocker' | 'notifications'>('blocker');
  const [blockerModalVisible, setBlockerModalVisible] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [rules, setRules] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  const [blockerForm, setBlockerForm] = useState({
    name: '', apps: '', days: [] as string[],
    start_time: '08:00', end_time: '17:00',
    unlock_type: 'password', unlock_password: '',
    sport_minutes_required: '30',
    allow_temporary_unlock: true, temporary_unlock_minutes: '5',
  });

  const [notificationForm, setNotificationForm] = useState({
    title: '', message: '', time: '09:00', days: [] as string[],
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [r, n] = await Promise.all([appBlockerService.getRules(), notificationsService.getAll()]);
      setRules(r);
      setNotifications(n);
    } catch (error) { console.error('Error loading blocker data:', error); }
    finally { setIsLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const resetBlockerForm = () => setBlockerForm({ name: '', apps: '', days: [], start_time: '08:00', end_time: '17:00', unlock_type: 'password', unlock_password: '', sport_minutes_required: '30', allow_temporary_unlock: true, temporary_unlock_minutes: '5' });
  const resetNotificationForm = () => setNotificationForm({ title: '', message: '', time: '09:00', days: [] });

  const handleCreateBlocker = async () => {
    if (!blockerForm.name.trim()) { Alert.alert('Fehler', 'Bitte gib einen Namen ein'); return; }
    try {
      await appBlockerService.createRule({
        name: blockerForm.name,
        apps: blockerForm.apps ? blockerForm.apps.split(',').map(a => a.trim()).filter(Boolean) : [],
        start_time: blockerForm.start_time, end_time: blockerForm.end_time,
        days: blockerForm.days,
        unlock_type: blockerForm.unlock_type, unlock_password: blockerForm.unlock_password,
        sport_minutes_required: parseInt(blockerForm.sport_minutes_required) || 30,
        allow_temporary_unlock: blockerForm.allow_temporary_unlock,
        temporary_unlock_minutes: parseInt(blockerForm.temporary_unlock_minutes) || 5,
      });
      setBlockerModalVisible(false);
      resetBlockerForm();
      loadData();
    } catch (error) { Alert.alert('Fehler', 'Erstellen fehlgeschlagen'); }
  };

  const handleCreateNotification = async () => {
    if (!notificationForm.title.trim() || !notificationForm.message.trim()) { Alert.alert('Fehler', 'Bitte fülle alle Felder aus'); return; }
    try {
      await notificationsService.create({
        title: notificationForm.title, message: notificationForm.message,
        time: notificationForm.time, days: notificationForm.days,
      });
      setNotificationModalVisible(false);
      resetNotificationForm();
      loadData();
    } catch (error) { Alert.alert('Fehler', 'Erstellen fehlgeschlagen'); }
  };

  const handleDeleteRule = (rule: any) => {
    Alert.alert('Sperre loschen', `Mochtest du "${rule.name}" wirklich loschen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Loschen', style: 'destructive', onPress: async () => { await appBlockerService.deleteRule(rule.id); loadData(); } },
    ]);
  };

  const toggleDay = (day: string, isBlocker: boolean) => {
    if (isBlocker) {
      setBlockerForm(prev => ({ ...prev, days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day] }));
    } else {
      setNotificationForm(prev => ({ ...prev, days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day] }));
    }
  };

  const applyTemplate = (template: any) => {
    setNotificationForm(prev => ({ ...prev, title: template.title, message: template.message }));
  };

  const renderDaySelector = (selectedDays: string[], isBlocker: boolean) => (
    <View style={styles.daySelector}>
      {DAYS.map(day => (
        <TouchableOpacity key={day.key} style={[styles.dayButton, selectedDays.includes(day.key) && styles.dayButtonActive]} onPress={() => toggleDay(day.key, isBlocker)}>
          <Text style={[styles.dayButtonText, selectedDays.includes(day.key) && styles.dayButtonTextActive]}>{day.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <View style={styles.tabSwitch}>
            <TouchableOpacity style={[styles.tabButton, activeTab === 'blocker' && styles.tabButtonActive]} onPress={() => setActiveTab('blocker')}>
              <Ionicons name="lock-closed" size={18} color={activeTab === 'blocker' ? COLORS.text : COLORS.textSecondary} />
              <Text style={[styles.tabText, activeTab === 'blocker' && styles.tabTextActive]}>App-Sperre</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabButton, activeTab === 'notifications' && styles.tabButtonActive]} onPress={() => setActiveTab('notifications')}>
              <Ionicons name="notifications" size={18} color={activeTab === 'notifications' ? COLORS.text : COLORS.textSecondary} />
              <Text style={[styles.tabText, activeTab === 'notifications' && styles.tabTextActive]}>Benachrichtigungen</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.scrollView}>
          {activeTab === 'blocker' ? (
            <>
              {isLoading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} /> : rules.length === 0 ? (
                <View style={styles.emptyState}><Ionicons name="lock-open-outline" size={64} color={COLORS.textSecondary} /><Text style={styles.emptyText}>Keine App-Sperren eingerichtet</Text><Text style={styles.emptySubtext}>Erstelle eine Sperre, um Apps zu bestimmten Zeiten zu blockieren</Text></View>
              ) : (
                rules.map((rule: any) => (
                  <View key={rule.id} style={styles.ruleCard}>
                    <View style={styles.ruleHeader}><View style={styles.ruleTitle}><Ionicons name={rule.is_active ? "lock-closed" : "lock-open"} size={20} color={rule.is_active ? COLORS.error : COLORS.textSecondary} /><Text style={styles.ruleName}>{rule.name}</Text></View></View>
                    <View style={styles.ruleDetails}>
                      <View style={styles.ruleDetailRow}><Ionicons name="time" size={16} color={COLORS.textSecondary} /><Text style={styles.ruleDetailText}>{rule.start_time} - {rule.end_time}</Text></View>
                      <View style={styles.ruleDetailRow}><Ionicons name="key" size={16} color={COLORS.textSecondary} /><Text style={styles.ruleDetailText}>Entsperren: {rule.unlock_type === 'password' ? 'Passwort' : rule.unlock_type === 'sport' ? 'Sport' : 'Passwort oder Sport'}</Text></View>
                    </View>
                    <View style={styles.ruleActions}>
                      <TouchableOpacity style={styles.actionButton} onPress={() => handleDeleteRule(rule)}><Ionicons name="trash" size={18} color={COLORS.error} /></TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
              <View style={styles.infoBox}><Ionicons name="information-circle" size={20} color={COLORS.info} /><Text style={styles.infoText}>Hinweis: Die App-Sperre verwaltet Regeln lokal. Eine echte Systemsperre erfordert native Integration mit dem Betriebssystem.</Text></View>
            </>
          ) : (
            <>
              {isLoading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} /> : notifications.length === 0 ? (
                <View style={styles.emptyState}><Ionicons name="notifications-off-outline" size={64} color={COLORS.textSecondary} /><Text style={styles.emptyText}>Keine Benachrichtigungen</Text><Text style={styles.emptySubtext}>Erstelle personalisierte Erinnerungen</Text></View>
              ) : (
                notifications.map((notif: any) => (
                  <View key={notif.id} style={styles.notifCard}>
                    <View style={styles.notifHeader}>
                      <View style={styles.notifTitle}><Ionicons name="notifications" size={20} color={notif.is_active ? COLORS.accent : COLORS.textSecondary} /><Text style={styles.notifName}>{notif.title}</Text></View>
                      <Switch value={notif.is_active} onValueChange={async () => { await notificationsService.toggle(notif.id); loadData(); }} trackColor={{ false: COLORS.surfaceLight, true: COLORS.primary + '60' }} thumbColor={notif.is_active ? COLORS.primary : COLORS.textSecondary} />
                    </View>
                    <Text style={styles.notifMessage}>{notif.message}</Text>
                    <View style={styles.notifDetails}>
                      <View style={styles.ruleDetailRow}><Ionicons name="time" size={16} color={COLORS.textSecondary} /><Text style={styles.ruleDetailText}>{notif.time}</Text></View>
                    </View>
                    <TouchableOpacity style={styles.deleteButton} onPress={() => { Alert.alert('Loschen', 'Mochtest du diese Benachrichtigung loschen?', [{ text: 'Abbrechen', style: 'cancel' }, { text: 'Loschen', style: 'destructive', onPress: async () => { await notificationsService.delete(notif.id); loadData(); } }]); }}>
                      <Ionicons name="trash" size={18} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>

        <TouchableOpacity style={styles.addButton} onPress={() => { if (activeTab === 'blocker') { resetBlockerForm(); setBlockerModalVisible(true); } else { resetNotificationForm(); setNotificationModalVisible(true); } }}>
          <Ionicons name="add" size={32} color={COLORS.text} />
        </TouchableOpacity>

        {/* App Blocker Modal */}
        <Modal visible={blockerModalVisible} animationType="slide" transparent={true} onRequestClose={() => setBlockerModalVisible(false)}>
          <View style={styles.modalOverlay}><View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Neue App-Sperre</Text><TouchableOpacity onPress={() => setBlockerModalVisible(false)}><Ionicons name="close" size={28} color={COLORS.text} /></TouchableOpacity></View>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Name der Sperre</Text>
              <TextInput style={styles.textInput} value={blockerForm.name} onChangeText={(text) => setBlockerForm(prev => ({ ...prev, name: text }))} placeholder="z.B. Arbeitszeit" placeholderTextColor={COLORS.textSecondary} />
              <Text style={styles.inputLabel}>Apps (kommagetrennt, optional)</Text>
              <TextInput style={styles.textInput} value={blockerForm.apps} onChangeText={(text) => setBlockerForm(prev => ({ ...prev, apps: text }))} placeholder="Instagram, TikTok, YouTube" placeholderTextColor={COLORS.textSecondary} />
              <Text style={styles.inputLabel}>Tage (leer = taglich)</Text>
              {renderDaySelector(blockerForm.days, true)}
              <View style={styles.timeRow}>
                <View style={styles.timeInput}><Text style={styles.inputLabel}>Von</Text><TextInput style={styles.textInput} value={blockerForm.start_time} onChangeText={(text) => setBlockerForm(prev => ({ ...prev, start_time: text }))} placeholder="08:00" placeholderTextColor={COLORS.textSecondary} /></View>
                <View style={styles.timeInput}><Text style={styles.inputLabel}>Bis</Text><TextInput style={styles.textInput} value={blockerForm.end_time} onChangeText={(text) => setBlockerForm(prev => ({ ...prev, end_time: text }))} placeholder="17:00" placeholderTextColor={COLORS.textSecondary} /></View>
              </View>
              <Text style={styles.inputLabel}>Passwort</Text>
              <TextInput style={styles.textInput} value={blockerForm.unlock_password} onChangeText={(text) => setBlockerForm(prev => ({ ...prev, unlock_password: text }))} placeholder="Passwort eingeben" placeholderTextColor={COLORS.textSecondary} secureTextEntry />
            </ScrollView>
            <TouchableOpacity style={styles.saveButton} onPress={handleCreateBlocker}><Text style={styles.saveButtonText}>{t('save')}</Text></TouchableOpacity>
          </View></View>
        </Modal>

        {/* Notification Modal */}
        <Modal visible={notificationModalVisible} animationType="slide" transparent={true} onRequestClose={() => setNotificationModalVisible(false)}>
          <View style={styles.modalOverlay}><View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Neue Benachrichtigung</Text><TouchableOpacity onPress={() => setNotificationModalVisible(false)}><Ionicons name="close" size={28} color={COLORS.text} /></TouchableOpacity></View>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Vorlagen</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateScroll}>
                {NOTIFICATION_TEMPLATES.map((template, index) => (
                  <TouchableOpacity key={index} style={styles.templateButton} onPress={() => applyTemplate(template)}>
                    <Text style={styles.templateText}>{template.title}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.inputLabel}>Titel</Text>
              <TextInput style={styles.textInput} value={notificationForm.title} onChangeText={(text) => setNotificationForm(prev => ({ ...prev, title: text }))} placeholder="z.B. Sport-Erinnerung" placeholderTextColor={COLORS.textSecondary} />
              <Text style={styles.inputLabel}>Nachricht</Text>
              <TextInput style={[styles.textInput, { minHeight: 80 }]} value={notificationForm.message} onChangeText={(text) => setNotificationForm(prev => ({ ...prev, message: text }))} placeholder="Deine Erinnerungsnachricht..." placeholderTextColor={COLORS.textSecondary} multiline />
              <Text style={styles.inputLabel}>Uhrzeit</Text>
              <TextInput style={styles.textInput} value={notificationForm.time} onChangeText={(text) => setNotificationForm(prev => ({ ...prev, time: text }))} placeholder="09:00" placeholderTextColor={COLORS.textSecondary} />
              <Text style={styles.inputLabel}>Tage (leer = taglich)</Text>
              {renderDaySelector(notificationForm.days, false)}
            </ScrollView>
            <TouchableOpacity style={styles.saveButton} onPress={handleCreateNotification}><Text style={styles.saveButtonText}>{t('save')}</Text></TouchableOpacity>
          </View></View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceLight },
  tabSwitch: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 12, padding: 4 },
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6 },
  tabButtonActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  tabTextActive: { color: COLORS.text, fontWeight: '600' },
  scrollView: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 16 },
  emptySubtext: { fontSize: 14, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
  ruleCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12 },
  ruleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  ruleTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleName: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  ruleDetails: { gap: 6, marginBottom: 12 },
  ruleDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleDetailText: { fontSize: 14, color: COLORS.textSecondary },
  ruleActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.surfaceLight },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10 },
  notifCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, position: 'relative' },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  notifTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notifName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  notifMessage: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 12 },
  notifDetails: { flexDirection: 'row', gap: 16 },
  deleteButton: { position: 'absolute', bottom: 16, right: 16, padding: 4 },
  infoBox: { flexDirection: 'row', backgroundColor: COLORS.info + '20', padding: 12, borderRadius: 12, marginTop: 16, gap: 10 },
  infoText: { flex: 1, fontSize: 13, color: COLORS.info, lineHeight: 18 },
  addButton: { position: 'absolute', right: 20, bottom: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceLight },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  modalScroll: { padding: 16 },
  inputLabel: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 6, marginTop: 12 },
  textInput: { backgroundColor: COLORS.surfaceLight, borderRadius: 12, padding: 14, color: COLORS.text, fontSize: 16 },
  daySelector: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  dayButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  dayButtonActive: { backgroundColor: COLORS.primary },
  dayButtonText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  dayButtonTextActive: { color: COLORS.text },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeInput: { flex: 1 },
  templateScroll: { marginTop: 8, marginBottom: 8 },
  templateButton: { backgroundColor: COLORS.surfaceLight, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 8 },
  templateText: { color: COLORS.text, fontSize: 14 },
  saveButton: { backgroundColor: COLORS.primary, marginHorizontal: 16, borderRadius: 12, padding: 16, alignItems: 'center' },
  saveButtonText: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
});
