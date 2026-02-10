import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useDataStore } from '../src/store';
import { profileApi } from '../src/services/api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const COLORS = {
  primary: '#4CAF50',
  secondary: '#81C784',
  background: '#121212',
  surface: '#1E1E1E',
  surfaceLight: '#2D2D2D',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  accent: '#FF9800',
  error: '#F44336',
  success: '#4CAF50',
};

// Preloader component
function DataPreloader({ children }: { children: React.ReactNode }) {
  const { preloadAllData, isPreloaded, isLoading } = useDataStore();
  const [showSplash, setShowSplash] = useState(true);
  
  useEffect(() => {
    const loadData = async () => {
      await preloadAllData();
      setTimeout(() => setShowSplash(false), 500);
    };
    loadData();
  }, []);
  
  if (showSplash && isLoading && !isPreloaded) {
    return (
      <View style={styles.splashContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.splashText}>Daten werden geladen...</Text>
      </View>
    );
  }
  
  return <>{children}</>;
}

// Main Tab Navigation with dynamic visibility
function MainTabs() {
  const { t } = useLanguage();
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.get().then(res => res.data),
  });

  // Default: all tabs visible
  const tabSettings = {
    show_dashboard_tab: profile?.tracking_settings?.show_dashboard_tab ?? true,
    show_nutrition_tab: profile?.tracking_settings?.show_nutrition_tab ?? true,
    show_sport_tab: profile?.tracking_settings?.show_sport_tab ?? true,
    show_vitals_tab: profile?.tracking_settings?.show_vitals_tab ?? true,
    show_finance_tab: profile?.tracking_settings?.show_finance_tab ?? true,
    show_blocker_tab: profile?.tracking_settings?.show_blocker_tab ?? true,
  };

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
          href: null, // Always hidden from tab bar
        }}
      />
    </Tabs>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <DataPreloader>
            <View style={styles.container}>
              <MainTabs />
            </View>
          </DataPreloader>
        </SafeAreaProvider>
      </QueryClientProvider>
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
  splashText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});
