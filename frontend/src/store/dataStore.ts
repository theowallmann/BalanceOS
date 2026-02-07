import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import localStorageAdapter from './storage';
import { profileApi, nutritionApi, vitalsApi, sportApi, analyticsApi, financeApi, appBlockerApi, notificationsApi } from '../services/api';

const getDateString = (date: Date) => date.toISOString().split('T')[0];

interface DataState {
  // Data
  profile: any | null;
  todayNutrition: any[];
  todayVitals: any | null;
  todaySport: any | null;
  analytics: { today: any; month: any; all: any };
  financeSummaries: any[];
  blockerRules: any[];
  notifications: any[];
  
  // Loading states
  isLoading: boolean;
  isPreloaded: boolean;
  lastFetchTime: number | null;
  
  // Actions
  preloadAllData: () => Promise<void>;
  refreshData: (section?: string) => Promise<void>;
  setProfile: (profile: any) => void;
  setTodayNutrition: (data: any[]) => void;
  setTodayVitals: (data: any) => void;
  setTodaySport: (data: any) => void;
  setAnalytics: (period: string, data: any) => void;
  setFinanceSummaries: (data: any[]) => void;
  setBlockerRules: (data: any[]) => void;
  setNotifications: (data: any[]) => void;
  clearCache: () => void;
}

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      // Initial data state
      profile: null,
      todayNutrition: [],
      todayVitals: null,
      todaySport: null,
      analytics: { today: null, month: null, all: null },
      financeSummaries: [],
      blockerRules: [],
      notifications: [],
      
      isLoading: false,
      isPreloaded: false,
      lastFetchTime: null,
      
      // Preload all data on app start
      preloadAllData: async () => {
        const state = get();
        
        // Skip if already preloaded within last 5 minutes
        if (state.isPreloaded && state.lastFetchTime) {
          const timeSinceLastFetch = Date.now() - state.lastFetchTime;
          if (timeSinceLastFetch < 5 * 60 * 1000) {
            console.log('Data already preloaded, skipping...');
            return;
          }
        }
        
        set({ isLoading: true });
        const today = getDateString(new Date());
        
        try {
          // Fetch all data in parallel for speed
          const [profileRes, nutritionRes, vitalsRes, sportRes, todayAnalytics, monthAnalytics, allAnalytics, financeRes, blockerRes, notifRes] = await Promise.allSettled([
            profileApi.get(),
            nutritionApi.getByDate(today),
            vitalsApi.getByDate(today),
            sportApi.getByDate(today),
            analyticsApi.getPeriod('today'),
            analyticsApi.getPeriod('month'),
            analyticsApi.getPeriod('all'),
            financeApi.getAllSummaries(),
            appBlockerApi.getRules(),
            notificationsApi.getAll(),
          ]);
          
          // Update state with successful responses
          set({
            profile: profileRes.status === 'fulfilled' ? profileRes.value.data : get().profile,
            todayNutrition: nutritionRes.status === 'fulfilled' ? (nutritionRes.value.data || []) : get().todayNutrition,
            todayVitals: vitalsRes.status === 'fulfilled' ? vitalsRes.value.data : get().todayVitals,
            todaySport: sportRes.status === 'fulfilled' ? sportRes.value.data : get().todaySport,
            analytics: {
              today: todayAnalytics.status === 'fulfilled' ? todayAnalytics.value.data : get().analytics.today,
              month: monthAnalytics.status === 'fulfilled' ? monthAnalytics.value.data : get().analytics.month,
              all: allAnalytics.status === 'fulfilled' ? allAnalytics.value.data : get().analytics.all,
            },
            financeSummaries: financeRes.status === 'fulfilled' ? (financeRes.value.data || []) : get().financeSummaries,
            blockerRules: blockerRes.status === 'fulfilled' ? (blockerRes.value.data || []) : get().blockerRules,
            notifications: notifRes.status === 'fulfilled' ? (notifRes.value.data || []) : get().notifications,
            isLoading: false,
            isPreloaded: true,
            lastFetchTime: Date.now(),
          });
          
          console.log('All data preloaded successfully!');
        } catch (error) {
          console.error('Error preloading data:', error);
          set({ isLoading: false });
        }
      },
      
      // Refresh specific section or all data
      refreshData: async (section?: string) => {
        const today = getDateString(new Date());
        
        try {
          if (!section || section === 'profile') {
            const res = await profileApi.get();
            set({ profile: res.data });
          }
          
          if (!section || section === 'nutrition') {
            const res = await nutritionApi.getByDate(today);
            set({ todayNutrition: res.data || [] });
          }
          
          if (!section || section === 'vitals') {
            const res = await vitalsApi.getByDate(today);
            set({ todayVitals: res.data });
          }
          
          if (!section || section === 'sport') {
            const res = await sportApi.getByDate(today);
            set({ todaySport: res.data });
          }
          
          if (!section || section === 'analytics') {
            const [todayRes, monthRes, allRes] = await Promise.all([
              analyticsApi.getPeriod('today'),
              analyticsApi.getPeriod('month'),
              analyticsApi.getPeriod('all'),
            ]);
            set({
              analytics: {
                today: todayRes.data,
                month: monthRes.data,
                all: allRes.data,
              },
            });
          }
          
          if (!section || section === 'finance') {
            const res = await financeApi.getAllSummaries();
            set({ financeSummaries: res.data || [] });
          }
          
          if (!section || section === 'blocker') {
            const res = await appBlockerApi.getRules();
            set({ blockerRules: res.data || [] });
          }
          
          if (!section || section === 'notifications') {
            const res = await notificationsApi.getAll();
            set({ notifications: res.data || [] });
          }
          
          set({ lastFetchTime: Date.now() });
        } catch (error) {
          console.error('Error refreshing data:', error);
        }
      },
      
      // Individual setters for optimistic updates
      setProfile: (profile) => set({ profile }),
      setTodayNutrition: (data) => set({ todayNutrition: data }),
      setTodayVitals: (data) => set({ todayVitals: data }),
      setTodaySport: (data) => set({ todaySport: data }),
      setAnalytics: (period, data) => set((state) => ({
        analytics: { ...state.analytics, [period]: data },
      })),
      setFinanceSummaries: (data) => set({ financeSummaries: data }),
      setBlockerRules: (data) => set({ blockerRules: data }),
      setNotifications: (data) => set({ notifications: data }),
      
      clearCache: () => set({
        profile: null,
        todayNutrition: [],
        todayVitals: null,
        todaySport: null,
        analytics: { today: null, month: null, all: null },
        financeSummaries: [],
        blockerRules: [],
        notifications: [],
        isPreloaded: false,
        lastFetchTime: null,
      }),
    }),
    {
      name: 'health-app-data',
      storage: createJSONStorage(() => ({
        getItem: localStorageAdapter.getItem,
        setItem: localStorageAdapter.setItem,
        removeItem: localStorageAdapter.removeItem,
      })),
      partialize: (state) => ({
        profile: state.profile,
        todayNutrition: state.todayNutrition,
        todayVitals: state.todayVitals,
        todaySport: state.todaySport,
        analytics: state.analytics,
        financeSummaries: state.financeSummaries,
        blockerRules: state.blockerRules,
        notifications: state.notifications,
        lastFetchTime: state.lastFetchTime,
      }),
    }
  )
);

export default useDataStore;
