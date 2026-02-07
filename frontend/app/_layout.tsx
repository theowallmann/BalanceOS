import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useDataStore } from '../src/store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (renamed from cacheTime)
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
      // Minimum splash screen time for smooth UX
      setTimeout(() => setShowSplash(false), 500);
    };
    loadData();
  }, []);
  
  // Show loading indicator while preloading
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

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <DataPreloader>
          <View style={styles.container}>
            <Tabs
              screenOptions={{
                headerShown: false,
                tabBarStyle: {
                  backgroundColor: COLORS.surface,
                  borderTopColor: COLORS.surfaceLight,
                  borderTopWidth: 1,
                  // Android needs more padding for navigation bar
                  height: Platform.OS === 'android' ? 80 : 88,
                  paddingBottom: Platform.OS === 'android' ? 24 : 28,
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
                  title: 'Dashboard',
                  tabBarIcon: ({ color, size }) => (
                    <Ionicons name="analytics" size={size} color={color} />
                  ),
                }}
              />
              <Tabs.Screen
                name="nutrition"
                options={{
                  title: 'Ernährung',
                  tabBarIcon: ({ color, size }) => (
                    <Ionicons name="restaurant" size={size} color={color} />
                  ),
                }}
              />
              <Tabs.Screen
                name="sport"
                options={{
                  title: 'Sport',
                  tabBarIcon: ({ color, size }) => (
                    <Ionicons name="fitness" size={size} color={color} />
                  ),
                }}
              />
              <Tabs.Screen
                name="finance"
                options={{
                  title: 'Finanzen',
                  tabBarIcon: ({ color, size }) => (
                    <Ionicons name="wallet" size={size} color={color} />
                  ),
                }}
              />
              <Tabs.Screen
                name="vitals"
                options={{
                  title: 'Vitaldaten',
                  tabBarIcon: ({ color, size }) => (
                    <Ionicons name="heart" size={size} color={color} />
                  ),
                }}
              />
              <Tabs.Screen
                name="blocker"
                options={{
                  title: 'Sperre',
                  tabBarIcon: ({ color, size }) => (
                    <Ionicons name="lock-closed" size={size} color={color} />
                  ),
                }}
              />
              <Tabs.Screen
                name="profile"
                options={{
                  title: 'Profil',
                  tabBarIcon: ({ color, size }) => (
                    <Ionicons name="person" size={size} color={color} />
                  ),
                }}
              />
              <Tabs.Screen
                name="settings"
                options={{
                  href: null, // Hide from tab bar
                }}
              />
            </Tabs>
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
