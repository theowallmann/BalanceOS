import React, { useState, useEffect } from 'react';
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
  Switch,
  AppState,
  NativeModules,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS } from '../src/constants/colors';
import { useLanguage } from '../src/hooks/useLanguage';
import { appBlockerApi, notificationsApi } from '../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// ACCESSIBILITY SERVICE INTEGRATION
// ============================================
// This code prepares the app for real app blocking functionality
// using Android's Accessibility Service. In production (installed APK),
// this will intercept app launches and redirect to this screen.

const ACCESSIBILITY_STORAGE_KEY = '@accessibility_permission_granted';

// Check if accessibility service is enabled (will work when native module is added)
const checkAccessibilityPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;
  
  try {
    // Try to use native module if available (for production builds)
    if (NativeModules.AccessibilityServiceModule) {
      return await NativeModules.AccessibilityServiceModule.isEnabled();
    }
    // Fallback: check stored permission status
    const stored = await AsyncStorage.getItem(ACCESSIBILITY_STORAGE_KEY);
    return stored === 'true';
  } catch (error) {
    console.log('Accessibility check not available in preview');
    return false;
  }
};

// Open Android Accessibility Settings
const openAccessibilitySettings = () => {
  if (Platform.OS === 'android') {
    // Direct link to Accessibility Settings
    Linking.openSettings().catch(() => {
      // Fallback: try specific accessibility settings intent
      Linking.openURL('android-settings://accessibility').catch(() => {
        Alert.alert(
          'Einstellungen öffnen',
          'Bitte öffne manuell: Einstellungen → Bedienungshilfen → Installierte Dienste → [App Name]'
        );
      });
    });
  } else {
    Alert.alert('Hinweis', 'Diese Funktion ist nur auf Android verfügbar');
  }
};

const DAYS = [
  { key: 'monday', label: 'Mo' },
  { key: 'tuesday', label: 'Di' },
  { key: 'wednesday', label: 'Mi' },
  { key: 'thursday', label: 'Do' },
  { key: 'friday', label: 'Fr' },
  { key: 'saturday', label: 'Sa' },
  { key: 'sunday', label: 'So' },
];

const NOTIFICATION_TEMPLATES = [
  { title: 'Sport-Erinnerung', message: 'Zeit für dein Training! 💪', type: 'reminder' },
  { title: 'Gewicht eintragen', message: 'Vergiss nicht, dein Gewicht zu tracken!', type: 'reminder' },
  { title: 'Wasser trinken', message: 'Bleib hydriert! Trink ein Glas Wasser 💧', type: 'reminder' },
  { title: 'Mahlzeit tracken', message: 'Hast du schon dein Essen eingetragen?', type: 'reminder' },
];

export default function BlockerScreen() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'blocker' | 'notifications'>('blocker');
  const [blockerModalVisible, setBlockerModalVisible] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [unlockModalVisible, setUnlockModalVisible] = useState(false);
  const [selectedRule, setSelectedRule] = useState<any>(null);
  const [unlockPassword, setUnlockPassword] = useState('');
  
  // Accessibility Service State
  const [accessibilityEnabled, setAccessibilityEnabled] = useState(false);
  const [permissionBannerDismissed, setPermissionBannerDismissed] = useState(false);

  // Check accessibility permission on mount and when app comes to foreground
  useEffect(() => {
    const checkPermission = async () => {
      const enabled = await checkAccessibilityPermission();
      setAccessibilityEnabled(enabled);
    };
    
    checkPermission();
    
    // Re-check when app comes back to foreground (user might have enabled it)
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkPermission();
      }
    });
    
    return () => subscription.remove();
  }, []);

  // Blocker form state
  const [blockerForm, setBlockerForm] = useState({
    name: '',
    block_all: true,
    apps: '',
    days: [] as string[],
    start_time: '08:00',
    end_time: '17:00',
    unlock_method: 'password',
    password: '',
    sport_minutes_required: '30',
    edit_lock_days: '0',
    allow_temporary_unlock: true,
    temporary_unlock_minutes: '5',
    strict_mode: false,
  });

  // Notification form state
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    schedule_time: '09:00',
    schedule_days: [] as string[],
    notification_type: 'reminder',
  });

  // Queries
  const { data: rules = [], isLoading: rulesLoading, refetch: refetchRules } = useQuery({
    queryKey: ['appBlockerRules'],
    queryFn: () => appBlockerApi.getRules().then(res => res.data),
  });

  const { data: notifications = [], isLoading: notifsLoading, refetch: refetchNotifs } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll().then(res => res.data),
  });

  const { data: blockerStatus } = useQuery({
    queryKey: ['blockerStatus'],
    queryFn: () => appBlockerApi.getStatus().then(res => res.data),
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Mutations
  const createRuleMutation = useMutation({
    mutationFn: (data: any) => appBlockerApi.createRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appBlockerRules'] });
      setBlockerModalVisible(false);
      resetBlockerForm();
      Alert.alert('Erfolg', 'App-Sperre erstellt');
    },
    onError: (error: any) => {
      Alert.alert('Fehler', error.response?.data?.detail || 'Konnte Sperre nicht erstellen');
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) => appBlockerApi.deleteRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appBlockerRules'] });
      Alert.alert('Erfolg', 'App-Sperre gelöscht');
    },
    onError: (error: any) => {
      Alert.alert('Fehler', error.response?.data?.detail || 'Konnte Sperre nicht löschen');
    },
  });

  const createNotificationMutation = useMutation({
    mutationFn: (data: any) => notificationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setNotificationModalVisible(false);
      resetNotificationForm();
      Alert.alert('Erfolg', 'Benachrichtigung erstellt');
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const toggleNotificationMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.toggle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const temporaryUnlockMutation = useMutation({
    mutationFn: ({ ruleId, appName }: { ruleId: string; appName?: string }) => 
      appBlockerApi.temporaryUnlock(ruleId, appName),
    onSuccess: (data) => {
      setUnlockModalVisible(false);
      Alert.alert('Entsperrt', data.data.message);
    },
    onError: (error: any) => {
      Alert.alert('Fehler', error.response?.data?.detail || 'Entsperren fehlgeschlagen');
    },
  });

  const resetBlockerForm = () => {
    setBlockerForm({
      name: '',
      block_all: true,
      apps: '',
      days: [],
      start_time: '08:00',
      end_time: '17:00',
      unlock_method: 'password',
      password: '',
      sport_minutes_required: '30',
      edit_lock_days: '0',
      allow_temporary_unlock: true,
      temporary_unlock_minutes: '5',
      strict_mode: false,
    });
  };

  const resetNotificationForm = () => {
    setNotificationForm({
      title: '',
      message: '',
      schedule_time: '09:00',
      schedule_days: [],
      notification_type: 'reminder',
    });
  };

  const handleCreateBlocker = () => {
    if (!blockerForm.name.trim()) {
      Alert.alert('Fehler', 'Bitte gib einen Namen ein');
      return;
    }

    if (blockerForm.unlock_method === 'password' && !blockerForm.password) {
      Alert.alert('Fehler', 'Bitte gib ein Passwort ein');
      return;
    }

    const data = {
      name: blockerForm.name,
      block_all: blockerForm.block_all,
      apps: blockerForm.block_all ? [] : blockerForm.apps.split(',').map(a => a.trim()).filter(Boolean),
      schedule: {
        days: blockerForm.days,
        start_time: blockerForm.start_time,
        end_time: blockerForm.end_time,
      },
      unlock_method: blockerForm.unlock_method,
      password: blockerForm.unlock_method !== 'sport' ? blockerForm.password : null,
      sport_minutes_required: parseInt(blockerForm.sport_minutes_required) || 30,
      edit_lock_days: parseInt(blockerForm.edit_lock_days) || 0,
      allow_temporary_unlock: blockerForm.allow_temporary_unlock,
      temporary_unlock_minutes: parseInt(blockerForm.temporary_unlock_minutes) || 5,
      strict_mode: blockerForm.strict_mode,
    };

    createRuleMutation.mutate(data);
  };

  const handleCreateNotification = () => {
    if (!notificationForm.title.trim() || !notificationForm.message.trim()) {
      Alert.alert('Fehler', 'Bitte fülle alle Felder aus');
      return;
    }

    createNotificationMutation.mutate(notificationForm);
  };

  const handleDeleteRule = (rule: any) => {
    Alert.alert(
      'Sperre löschen',
      `Möchtest du "${rule.name}" wirklich löschen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Löschen', style: 'destructive', onPress: () => deleteRuleMutation.mutate(rule.id) },
      ]
    );
  };

  const handleTryUnlock = async (rule: any) => {
    setSelectedRule(rule);
    
    if (rule.unlock_method === 'sport' || rule.unlock_method === 'both') {
      // Check sport first
      try {
        const response = await appBlockerApi.verifySport(rule.id);
        const data = response.data;
        
        if (data.verified) {
          Alert.alert('Entsperrt!', 'Du hast genug Sport gemacht! 🎉');
          return;
        } else if (rule.unlock_method === 'sport') {
          Alert.alert(
            'Noch nicht genug Sport',
            `Du hast ${data.minutes_done} von ${data.minutes_required} Minuten Sport gemacht.`
          );
          return;
        }
      } catch (error) {
        console.error('Sport verification error:', error);
      }
    }
    
    if (rule.unlock_method === 'password' || rule.unlock_method === 'both') {
      setUnlockPassword('');
      setUnlockModalVisible(true);
    }
  };

  const handleVerifyPassword = async () => {
    if (!selectedRule) return;

    try {
      const response = await appBlockerApi.verifyPassword(selectedRule.id, unlockPassword);
      if (response.data.verified) {
        setUnlockModalVisible(false);
        Alert.alert('Entsperrt!', 'Passwort korrekt ✓');
      } else {
        Alert.alert('Fehler', 'Falsches Passwort');
      }
    } catch (error) {
      Alert.alert('Fehler', 'Überprüfung fehlgeschlagen');
    }
  };

  const handleTemporaryUnlock = (rule: any) => {
    if (rule.strict_mode || !rule.allow_temporary_unlock) {
      Alert.alert('Nicht möglich', 'Temporäres Entsperren ist für diese Regel deaktiviert');
      return;
    }

    Alert.alert(
      'Temporär entsperren',
      `Möchtest du für ${rule.temporary_unlock_minutes || 5} Minuten entsperren?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        { 
          text: 'Entsperren', 
          onPress: () => temporaryUnlockMutation.mutate({ ruleId: rule.id }) 
        },
      ]
    );
  };

  const toggleDay = (day: string, isBlocker: boolean) => {
    if (isBlocker) {
      setBlockerForm(prev => ({
        ...prev,
        days: prev.days.includes(day) 
          ? prev.days.filter(d => d !== day)
          : [...prev.days, day]
      }));
    } else {
      setNotificationForm(prev => ({
        ...prev,
        schedule_days: prev.schedule_days.includes(day)
          ? prev.schedule_days.filter(d => d !== day)
          : [...prev.schedule_days, day]
      }));
    }
  };

  const applyTemplate = (template: typeof NOTIFICATION_TEMPLATES[0]) => {
    setNotificationForm(prev => ({
      ...prev,
      title: template.title,
      message: template.message,
      notification_type: template.type,
    }));
  };

  const renderDaySelector = (selectedDays: string[], isBlocker: boolean) => (
    <View style={styles.daySelector}>
      {DAYS.map(day => (
        <TouchableOpacity
          key={day.key}
          style={[
            styles.dayButton,
            selectedDays.includes(day.key) && styles.dayButtonActive,
          ]}
          onPress={() => toggleDay(day.key, isBlocker)}
        >
          <Text style={[
            styles.dayButtonText,
            selectedDays.includes(day.key) && styles.dayButtonTextActive,
          ]}>
            {day.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header with Tab Switch */}
        <View style={styles.header}>
          <View style={styles.tabSwitch}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'blocker' && styles.tabButtonActive]}
              onPress={() => setActiveTab('blocker')}
            >
              <Ionicons 
                name="lock-closed" 
                size={18} 
                color={activeTab === 'blocker' ? COLORS.text : COLORS.textSecondary} 
              />
              <Text style={[styles.tabText, activeTab === 'blocker' && styles.tabTextActive]}>
                App-Sperre
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'notifications' && styles.tabButtonActive]}
              onPress={() => setActiveTab('notifications')}
            >
              <Ionicons 
                name="notifications" 
                size={18} 
                color={activeTab === 'notifications' ? COLORS.text : COLORS.textSecondary} 
              />
              <Text style={[styles.tabText, activeTab === 'notifications' && styles.tabTextActive]}>
                Benachrichtigungen
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Banner */}
        {blockerStatus?.is_blocking && activeTab === 'blocker' && (
          <View style={styles.statusBanner}>
            <Ionicons name="lock-closed" size={20} color={COLORS.text} />
            <Text style={styles.statusText}>
              {blockerStatus.active_rules.length} Sperre(n) aktiv
            </Text>
          </View>
        )}

        {/* Accessibility Permission Banner */}
        {Platform.OS === 'android' && !accessibilityEnabled && !permissionBannerDismissed && activeTab === 'blocker' && (
          <View style={styles.permissionBanner}>
            <View style={styles.permissionBannerHeader}>
              <Ionicons name="warning" size={24} color={COLORS.accent} />
              <Text style={styles.permissionBannerTitle}>Berechtigung erforderlich</Text>
              <TouchableOpacity 
                style={styles.permissionBannerClose}
                onPress={() => setPermissionBannerDismissed(true)}
              >
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.permissionBannerText}>
              Damit die App-Sperre funktioniert, muss die App auf andere Apps zugreifen dürfen. 
              Aktiviere den Bedienungshilfen-Dienst in den Android-Einstellungen.
            </Text>
            <View style={styles.permissionBannerSteps}>
              <Text style={styles.permissionStepText}>1. Einstellungen → Bedienungshilfen</Text>
              <Text style={styles.permissionStepText}>2. Installierte Dienste</Text>
              <Text style={styles.permissionStepText}>3. Diese App aktivieren</Text>
            </View>
            <TouchableOpacity 
              style={styles.permissionBannerButton}
              onPress={openAccessibilitySettings}
            >
              <Ionicons name="settings-outline" size={18} color={COLORS.text} />
              <Text style={styles.permissionBannerButtonText}>Einstellungen öffnen</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Accessibility Enabled Success Banner */}
        {Platform.OS === 'android' && accessibilityEnabled && activeTab === 'blocker' && (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.successBannerText}>
              Bedienungshilfen aktiviert - App-Sperre ist einsatzbereit
            </Text>
          </View>
        )}

        <ScrollView style={styles.scrollView}>
          {activeTab === 'blocker' ? (
            // App Blocker Content
            <>
              {rulesLoading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
              ) : rules.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="lock-open-outline" size={64} color={COLORS.textSecondary} />
                  <Text style={styles.emptyText}>Keine App-Sperren eingerichtet</Text>
                  <Text style={styles.emptySubtext}>
                    Erstelle eine Sperre, um Apps zu bestimmten Zeiten zu blockieren
                  </Text>
                </View>
              ) : (
                rules.map((rule: any) => (
                  <View key={rule.id} style={styles.ruleCard}>
                    <View style={styles.ruleHeader}>
                      <View style={styles.ruleTitle}>
                        <Ionicons 
                          name={rule.is_active ? "lock-closed" : "lock-open"} 
                          size={20} 
                          color={rule.is_active ? COLORS.error : COLORS.textSecondary} 
                        />
                        <Text style={styles.ruleName}>{rule.name}</Text>
                      </View>
                      {rule.strict_mode && (
                        <View style={styles.strictBadge}>
                          <Text style={styles.strictText}>STRIKT</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.ruleDetails}>
                      <View style={styles.ruleDetailRow}>
                        <Ionicons name="time" size={16} color={COLORS.textSecondary} />
                        <Text style={styles.ruleDetailText}>
                          {rule.schedule?.start_time} - {rule.schedule?.end_time}
                        </Text>
                      </View>
                      <View style={styles.ruleDetailRow}>
                        <Ionicons name="calendar" size={16} color={COLORS.textSecondary} />
                        <Text style={styles.ruleDetailText}>
                          {rule.schedule?.days?.length > 0 
                            ? rule.schedule.days.map((d: string) => d.substring(0, 2).toUpperCase()).join(', ')
                            : 'Täglich'}
                        </Text>
                      </View>
                      <View style={styles.ruleDetailRow}>
                        <Ionicons name="key" size={16} color={COLORS.textSecondary} />
                        <Text style={styles.ruleDetailText}>
                          Entsperren: {rule.unlock_method === 'password' ? 'Passwort' : 
                                       rule.unlock_method === 'sport' ? 'Sport' : 'Passwort oder Sport'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.ruleActions}>
                      {!rule.strict_mode && rule.allow_temporary_unlock && (
                        <TouchableOpacity 
                          style={styles.actionButton}
                          onPress={() => handleTemporaryUnlock(rule)}
                        >
                          <Ionicons name="timer" size={18} color={COLORS.accent} />
                          <Text style={[styles.actionText, { color: COLORS.accent }]}>
                            {rule.temporary_unlock_minutes || 5} Min
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => handleTryUnlock(rule)}
                      >
                        <Ionicons name="lock-open" size={18} color={COLORS.primary} />
                        <Text style={[styles.actionText, { color: COLORS.primary }]}>Entsperren</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => handleDeleteRule(rule)}
                      >
                        <Ionicons name="trash" size={18} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}

              {/* Info Box */}
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color={COLORS.info} />
                <Text style={styles.infoText}>
                  Hinweis: Die App-Sperre verwaltet Regeln in der App. Eine echte Systemsperre 
                  erfordert native Integration mit dem Betriebssystem.
                </Text>
              </View>
            </>
          ) : (
            // Notifications Content
            <>
              {notifsLoading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
              ) : notifications.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="notifications-off-outline" size={64} color={COLORS.textSecondary} />
                  <Text style={styles.emptyText}>Keine Benachrichtigungen</Text>
                  <Text style={styles.emptySubtext}>
                    Erstelle personalisierte Erinnerungen für Sport, Ernährung und mehr
                  </Text>
                </View>
              ) : (
                notifications.map((notif: any) => (
                  <View key={notif.id} style={styles.notifCard}>
                    <View style={styles.notifHeader}>
                      <View style={styles.notifTitle}>
                        <Ionicons 
                          name="notifications" 
                          size={20} 
                          color={notif.is_active ? COLORS.accent : COLORS.textSecondary} 
                        />
                        <Text style={styles.notifName}>{notif.title}</Text>
                      </View>
                      <Switch
                        value={notif.is_active}
                        onValueChange={() => toggleNotificationMutation.mutate(notif.id)}
                        trackColor={{ false: COLORS.surfaceLight, true: COLORS.primary + '60' }}
                        thumbColor={notif.is_active ? COLORS.primary : COLORS.textSecondary}
                      />
                    </View>
                    <Text style={styles.notifMessage}>{notif.message}</Text>
                    <View style={styles.notifDetails}>
                      <View style={styles.ruleDetailRow}>
                        <Ionicons name="time" size={16} color={COLORS.textSecondary} />
                        <Text style={styles.ruleDetailText}>{notif.schedule_time}</Text>
                      </View>
                      <View style={styles.ruleDetailRow}>
                        <Ionicons name="calendar" size={16} color={COLORS.textSecondary} />
                        <Text style={styles.ruleDetailText}>
                          {notif.schedule_days?.length > 0 
                            ? notif.schedule_days.map((d: string) => d.substring(0, 2).toUpperCase()).join(', ')
                            : 'Täglich'}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => {
                        Alert.alert(
                          'Löschen',
                          'Möchtest du diese Benachrichtigung löschen?',
                          [
                            { text: 'Abbrechen', style: 'cancel' },
                            { text: 'Löschen', style: 'destructive', onPress: () => deleteNotificationMutation.mutate(notif.id) },
                          ]
                        );
                      }}
                    >
                      <Ionicons name="trash" size={18} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Add Button */}
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => {
            if (activeTab === 'blocker') {
              resetBlockerForm();
              setBlockerModalVisible(true);
            } else {
              resetNotificationForm();
              setNotificationModalVisible(true);
            }
          }}
        >
          <Ionicons name="add" size={32} color={COLORS.text} />
        </TouchableOpacity>

        {/* App Blocker Modal */}
        <Modal
          visible={blockerModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setBlockerModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Neue App-Sperre</Text>
                <TouchableOpacity onPress={() => setBlockerModalVisible(false)}>
                  <Ionicons name="close" size={28} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                {/* Name */}
                <Text style={styles.inputLabel}>Name der Sperre</Text>
                <TextInput
                  style={styles.textInput}
                  value={blockerForm.name}
                  onChangeText={(text) => setBlockerForm(prev => ({ ...prev, name: text }))}
                  placeholder="z.B. Arbeitszeit"
                  placeholderTextColor={COLORS.textSecondary}
                />

                {/* Block All Switch */}
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Alle Apps sperren</Text>
                  <Switch
                    value={blockerForm.block_all}
                    onValueChange={(value) => setBlockerForm(prev => ({ ...prev, block_all: value }))}
                    trackColor={{ false: COLORS.surfaceLight, true: COLORS.primary + '60' }}
                    thumbColor={blockerForm.block_all ? COLORS.primary : COLORS.textSecondary}
                  />
                </View>

                {!blockerForm.block_all && (
                  <>
                    <Text style={styles.inputLabel}>Apps (kommagetrennt)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={blockerForm.apps}
                      onChangeText={(text) => setBlockerForm(prev => ({ ...prev, apps: text }))}
                      placeholder="Instagram, TikTok, YouTube"
                      placeholderTextColor={COLORS.textSecondary}
                    />
                  </>
                )}

                {/* Days */}
                <Text style={styles.inputLabel}>Tage (leer = täglich)</Text>
                {renderDaySelector(blockerForm.days, true)}

                {/* Time Range */}
                <View style={styles.timeRow}>
                  <View style={styles.timeInput}>
                    <Text style={styles.inputLabel}>Von</Text>
                    <TextInput
                      style={styles.textInput}
                      value={blockerForm.start_time}
                      onChangeText={(text) => setBlockerForm(prev => ({ ...prev, start_time: text }))}
                      placeholder="08:00"
                      placeholderTextColor={COLORS.textSecondary}
                    />
                  </View>
                  <View style={styles.timeInput}>
                    <Text style={styles.inputLabel}>Bis</Text>
                    <TextInput
                      style={styles.textInput}
                      value={blockerForm.end_time}
                      onChangeText={(text) => setBlockerForm(prev => ({ ...prev, end_time: text }))}
                      placeholder="17:00"
                      placeholderTextColor={COLORS.textSecondary}
                    />
                  </View>
                </View>

                {/* Unlock Method */}
                <Text style={styles.inputLabel}>Entsperrmethode</Text>
                <View style={styles.unlockMethodRow}>
                  {['password', 'sport', 'both'].map(method => (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.methodButton,
                        blockerForm.unlock_method === method && styles.methodButtonActive,
                      ]}
                      onPress={() => setBlockerForm(prev => ({ ...prev, unlock_method: method }))}
                    >
                      <Ionicons 
                        name={method === 'password' ? 'key' : method === 'sport' ? 'fitness' : 'options'} 
                        size={18} 
                        color={blockerForm.unlock_method === method ? COLORS.text : COLORS.textSecondary} 
                      />
                      <Text style={[
                        styles.methodText,
                        blockerForm.unlock_method === method && styles.methodTextActive,
                      ]}>
                        {method === 'password' ? 'Passwort' : method === 'sport' ? 'Sport' : 'Beides'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {blockerForm.unlock_method !== 'sport' && (
                  <>
                    <Text style={styles.inputLabel}>Passwort</Text>
                    <TextInput
                      style={styles.textInput}
                      value={blockerForm.password}
                      onChangeText={(text) => setBlockerForm(prev => ({ ...prev, password: text }))}
                      placeholder="Passwort eingeben"
                      placeholderTextColor={COLORS.textSecondary}
                      secureTextEntry
                    />
                  </>
                )}

                {(blockerForm.unlock_method === 'sport' || blockerForm.unlock_method === 'both') && (
                  <>
                    <Text style={styles.inputLabel}>Sport-Minuten für Entsperrung</Text>
                    <TextInput
                      style={styles.textInput}
                      value={blockerForm.sport_minutes_required}
                      onChangeText={(text) => setBlockerForm(prev => ({ ...prev, sport_minutes_required: text }))}
                      keyboardType="numeric"
                      placeholder="30"
                      placeholderTextColor={COLORS.textSecondary}
                    />
                  </>
                )}

                {/* Edit Lock Days */}
                <Text style={styles.inputLabel}>Bearbeitungssperre (Tage)</Text>
                <TextInput
                  style={styles.textInput}
                  value={blockerForm.edit_lock_days}
                  onChangeText={(text) => setBlockerForm(prev => ({ ...prev, edit_lock_days: text }))}
                  keyboardType="numeric"
                  placeholder="0 = keine Sperre"
                  placeholderTextColor={COLORS.textSecondary}
                />

                {/* Temporary Unlock */}
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Temporäres Entsperren erlauben</Text>
                  <Switch
                    value={blockerForm.allow_temporary_unlock}
                    onValueChange={(value) => setBlockerForm(prev => ({ ...prev, allow_temporary_unlock: value }))}
                    trackColor={{ false: COLORS.surfaceLight, true: COLORS.primary + '60' }}
                    thumbColor={blockerForm.allow_temporary_unlock ? COLORS.primary : COLORS.textSecondary}
                  />
                </View>

                {blockerForm.allow_temporary_unlock && (
                  <>
                    <Text style={styles.inputLabel}>Temporäre Entsperrzeit (Minuten)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={blockerForm.temporary_unlock_minutes}
                      onChangeText={(text) => setBlockerForm(prev => ({ ...prev, temporary_unlock_minutes: text }))}
                      keyboardType="numeric"
                      placeholder="5"
                      placeholderTextColor={COLORS.textSecondary}
                    />
                  </>
                )}

                {/* Strict Mode */}
                <View style={[styles.switchRow, styles.strictSwitch]}>
                  <View>
                    <Text style={styles.switchLabel}>Strikter Modus</Text>
                    <Text style={styles.switchHint}>Keine Umgehung möglich</Text>
                  </View>
                  <Switch
                    value={blockerForm.strict_mode}
                    onValueChange={(value) => setBlockerForm(prev => ({ 
                      ...prev, 
                      strict_mode: value,
                      allow_temporary_unlock: value ? false : prev.allow_temporary_unlock 
                    }))}
                    trackColor={{ false: COLORS.surfaceLight, true: COLORS.error + '60' }}
                    thumbColor={blockerForm.strict_mode ? COLORS.error : COLORS.textSecondary}
                  />
                </View>
              </ScrollView>

              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={handleCreateBlocker}
                disabled={createRuleMutation.isPending}
              >
                {createRuleMutation.isPending ? (
                  <ActivityIndicator color={COLORS.text} />
                ) : (
                  <Text style={styles.saveButtonText}>{t('save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Notification Modal */}
        <Modal
          visible={notificationModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setNotificationModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Neue Benachrichtigung</Text>
                <TouchableOpacity onPress={() => setNotificationModalVisible(false)}>
                  <Ionicons name="close" size={28} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                {/* Templates */}
                <Text style={styles.inputLabel}>Vorlagen</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateScroll}>
                  {NOTIFICATION_TEMPLATES.map((template, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.templateButton}
                      onPress={() => applyTemplate(template)}
                    >
                      <Text style={styles.templateText}>{template.title}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Title */}
                <Text style={styles.inputLabel}>Titel</Text>
                <TextInput
                  style={styles.textInput}
                  value={notificationForm.title}
                  onChangeText={(text) => setNotificationForm(prev => ({ ...prev, title: text }))}
                  placeholder="z.B. Sport-Erinnerung"
                  placeholderTextColor={COLORS.textSecondary}
                />

                {/* Message */}
                <Text style={styles.inputLabel}>Nachricht</Text>
                <TextInput
                  style={[styles.textInput, { minHeight: 80 }]}
                  value={notificationForm.message}
                  onChangeText={(text) => setNotificationForm(prev => ({ ...prev, message: text }))}
                  placeholder="Deine Erinnerungsnachricht..."
                  placeholderTextColor={COLORS.textSecondary}
                  multiline
                />

                {/* Time */}
                <Text style={styles.inputLabel}>Uhrzeit</Text>
                <TextInput
                  style={styles.textInput}
                  value={notificationForm.schedule_time}
                  onChangeText={(text) => setNotificationForm(prev => ({ ...prev, schedule_time: text }))}
                  placeholder="09:00"
                  placeholderTextColor={COLORS.textSecondary}
                />

                {/* Days */}
                <Text style={styles.inputLabel}>Tage (leer = täglich)</Text>
                {renderDaySelector(notificationForm.schedule_days, false)}
              </ScrollView>

              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={handleCreateNotification}
                disabled={createNotificationMutation.isPending}
              >
                {createNotificationMutation.isPending ? (
                  <ActivityIndicator color={COLORS.text} />
                ) : (
                  <Text style={styles.saveButtonText}>{t('save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Unlock Password Modal */}
        <Modal
          visible={unlockModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setUnlockModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '40%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Passwort eingeben</Text>
                <TouchableOpacity onPress={() => setUnlockModalVisible(false)}>
                  <Ionicons name="close" size={28} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalScroll}>
                <TextInput
                  style={styles.textInput}
                  value={unlockPassword}
                  onChangeText={setUnlockPassword}
                  placeholder="Passwort"
                  placeholderTextColor={COLORS.textSecondary}
                  secureTextEntry
                  autoFocus
                />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleVerifyPassword}>
                <Text style={styles.saveButtonText}>Entsperren</Text>
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
  tabSwitch: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error,
    paddingVertical: 8,
    gap: 8,
  },
  statusText: {
    color: COLORS.text,
    fontWeight: '600',
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
  ruleCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ruleTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  strictBadge: {
    backgroundColor: COLORS.error + '30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  strictText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.error,
  },
  ruleDetails: {
    gap: 6,
    marginBottom: 12,
  },
  ruleDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleDetailText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  ruleActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  notifCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notifTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  notifMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  notifDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  deleteButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    padding: 4,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.info + '20',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.info,
    lineHeight: 18,
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
    maxHeight: '90%',
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 16,
    color: COLORS.text,
  },
  switchHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  strictSwitch: {
    backgroundColor: COLORS.error + '10',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  daySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonActive: {
    backgroundColor: COLORS.primary,
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  dayButtonTextActive: {
    color: COLORS.text,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeInput: {
    flex: 1,
  },
  unlockMethodRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  methodButtonActive: {
    backgroundColor: COLORS.primary,
  },
  methodText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  methodTextActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
  templateScroll: {
    marginTop: 8,
    marginBottom: 8,
  },
  templateButton: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  templateText: {
    color: COLORS.text,
    fontSize: 14,
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
});
