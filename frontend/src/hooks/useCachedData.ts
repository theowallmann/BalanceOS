import { useEffect, useState } from 'react';
import { useDataStore } from '../store';

/**
 * Hook that provides cached data from the store with automatic refresh
 * This enables instant tab switching by serving cached data immediately
 */
export function useCachedData() {
  const store = useDataStore();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    // On first mount, trigger preload if not already done
    if (!store.isPreloaded && !store.isLoading) {
      store.preloadAllData().finally(() => {
        setIsInitialLoad(false);
      });
    } else {
      setIsInitialLoad(false);
    }
  }, []);

  return {
    // Data
    profile: store.profile,
    todayNutrition: store.todayNutrition,
    todayVitals: store.todayVitals,
    todaySport: store.todaySport,
    analytics: store.analytics,
    financeSummaries: store.financeSummaries,
    blockerRules: store.blockerRules,
    notifications: store.notifications,
    
    // Status
    isLoading: store.isLoading || isInitialLoad,
    isPreloaded: store.isPreloaded,
    
    // Actions
    refreshData: store.refreshData,
    refreshAll: store.preloadAllData,
  };
}

/**
 * Hook for getting profile data with caching
 */
export function useCachedProfile() {
  const { profile, isLoading, refreshData } = useCachedData();
  
  return {
    profile,
    isLoading: isLoading && !profile,
    refresh: () => refreshData('profile'),
  };
}

/**
 * Hook for getting today's nutrition data with caching
 */
export function useCachedNutrition() {
  const { todayNutrition, isLoading, refreshData } = useCachedData();
  
  return {
    entries: todayNutrition,
    isLoading: isLoading && todayNutrition.length === 0,
    refresh: () => refreshData('nutrition'),
  };
}

/**
 * Hook for getting today's vitals data with caching
 */
export function useCachedVitals() {
  const { todayVitals, isLoading, refreshData } = useCachedData();
  
  return {
    vitals: todayVitals,
    isLoading: isLoading && !todayVitals,
    refresh: () => refreshData('vitals'),
  };
}

/**
 * Hook for getting today's sport data with caching
 */
export function useCachedSport() {
  const { todaySport, isLoading, refreshData } = useCachedData();
  
  return {
    sportData: todaySport,
    isLoading: isLoading && !todaySport,
    refresh: () => refreshData('sport'),
  };
}

/**
 * Hook for getting analytics data with caching
 */
export function useCachedAnalytics() {
  const { analytics, isLoading, refreshData } = useCachedData();
  
  return {
    today: analytics.today,
    month: analytics.month,
    all: analytics.all,
    isLoading: isLoading && !analytics.today,
    refresh: () => refreshData('analytics'),
  };
}

export default useCachedData;
