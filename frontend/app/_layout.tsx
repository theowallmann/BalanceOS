import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useLanguage } from '../src/hooks/useLanguage';
import { initDatabase } from '../src/database/schema';
import { profileService, vitalsService, sportService } from '../src/database/services';
import { fitbitService } from '../src/services/fitbitService';

const COLORS = {
  primary: '#4CAF50',
  secondary: '#81C784',
  background: '#121212',
  surface: '#1E1E1E',
  surfaceLight: '#2D2D2D',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
};

function DataPreloader({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [statusText, setStatusText] = useState('Daten werden geladen...');

  useEffect(() => {
    const loadData = async () => {
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => Math.min(prev + 10, 70));
      }, 100);

      try {
        // Initialize database
        await initDatabase();
        setLoadingProgress(75);
        
        // Check and sync FitBit if connected
        const fitbitConnected = await fitbitService.isConnected();
        if (fitbitConnected) {
          setStatusText('FitBit wird synchronisiert...');
          setLoadingProgress(80);
          
          try {
            const today = new Date().toISOString().split('T')[0];
            const data = await fitbitService.syncToday();
            
            // Update vitals with FitBit data
            const vitalsUpdates: any = {};
            if (data.heartRate?.restingHeartRate) {
              vitalsUpdates.resting_heart_rate = data.heartRate.restingHeartRate;
            }
            if (data.sleep) {
              vitalsUpdates.sleep_duration = data.sleep.duration / 60; // to hours
              vitalsUpdates.sleep_quality = Math.round(data.sleep.efficiency / 20);
              if (data.sleep.startTime) {
                vitalsUpdates.sleep_start = data.sleep.startTime.split('T')[1]?.slice(0, 5);
              }
              if (data.sleep.endTime) {
                vitalsUpdates.sleep_end = data.sleep.endTime.split('T')[1]?.slice(0, 5);
              }
            }
            if (Object.keys(vitalsUpdates).length > 0) {
              await vitalsService.createOrUpdate(today, vitalsUpdates);
            }
            
            // Update steps
            if (data.steps > 0) {
              await sportService.createOrUpdate(today, { steps: data.steps });
            }
            
            setLoadingProgress(95);
            console.log('FitBit sync completed:', data.steps, 'steps');
          } catch (fitbitError) {
            console.log('FitBit sync skipped:', fitbitError);
          }
        }
        
        setLoadingProgress(100);
        setStatusText('Fertig!');
      } catch (error) {
        console.error('Database init error:', error);
        setLoadingProgress(100);
        setStatusText('Fertig!');
      } finally {
        clearInterval(progressInterval);
        setTimeout(() => setShowSplash(false), 200);
      }
    };
    loadData();
  }, []);

  if (showSplash) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.splashContent}>
          <Ionicons name="fitness" size={64} color={COLORS.primary} />
          <Text style={styles.splashTitle}>BalanceOS</Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${loadingProgress}%` }]} />
          </View>
          <Text style={styles.splashText}>{statusText}</Text>
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

function MainTabs() {
  const { t } = useLanguage();
  const [tabSettings, setTabSettings] = useState({
    show_dashboard_tab: true,
    show_nutrition_tab: true,
    show_sport_tab: true,
    show_vitals_tab: true,
    show_finance_tab: true,
    show_blocker_tab: true,
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const profile = await profileService.get();
        if (profile?.tracking_settings) {
          setTabSettings(prev => ({
            ...prev,
            ...profile.tracking_settings,
          }));
        }
      } catch (error) {
        console.error('Error loading tab settings:', error);
      }
    };
    loadSettings();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.surfaceLight,
          borderTopWidth: 1,
          height: Platform.OS === 'android' ? 90 : 88,
          paddingBottom: Platform.OS === 'android' ? 35 : 28,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('dashboard'),
          href: tabSettings.show_dashboard_tab ? '/' : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: t('nutrition'),
          href: tabSettings.show_nutrition_tab ? '/nutrition' : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sport"
        options={{
          title: t('sport'),
          href: tabSettings.show_sport_tab ? '/sport' : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="fitness" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="vitals"
        options={{
          title: t('vitals'),
          href: tabSettings.show_vitals_tab ? '/vitals' : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          title: t('finance'),
          href: tabSettings.show_finance_tab ? '/finance' : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="blocker"
        options={{
          title: t('blocker'),
          href: tabSettings.show_blocker_tab ? '/blocker' : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="lock-closed" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DataPreloader>
          <View style={styles.container}>
            <MainTabs />
          </View>
        </DataPreloader>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  splashContent: {
    alignItems: 'center',
    padding: 40,
  },
  splashTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 24,
  },
  progressBarContainer: {
    width: 200,
    height: 6,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  splashText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
