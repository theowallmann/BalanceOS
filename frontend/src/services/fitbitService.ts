import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { FITBIT_CLIENT_ID} from '../constants/apiKeys';

WebBrowser.maybeCompleteAuthSession();

const FITBIT_AUTH_URL = 'https://www.fitbit.com/oauth2/authorize';
const FITBIT_API_BASE = 'https://api.fitbit.com/1';
const FITBIT_SCOPES = ['heartrate', 'activity', 'profile', 'sleep'];
const TOKEN_STORAGE_KEY = '@balanceos_fitbit_token';

// Generate redirect URI for Expo
const redirectUri = AuthSession.makeRedirectUri({
  scheme: 'balanceos',
  path: 'fitbit-callback',
});

// Build authorization URL
function buildAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: FITBIT_CLIENT_ID,
    response_type: 'token',
    scope: FITBIT_SCOPES.join(' '),
    redirect_uri: redirectUri,
    expires_in: '31536000', // 1 year
  });
  return `${FITBIT_AUTH_URL}?${params.toString()}`;
}

// FitBit Service
export const fitbitService = {
  // Check if user is connected to FitBit
  async isConnected(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      return !!token;
    } catch {
      return false;
    }
  },

  // Get stored access token
  async getAccessToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  },

  // Initiate OAuth2 login
  async login(): Promise<{ success: boolean; error?: string }> {
    try {
      const authUrl = buildAuthUrl();
      const result = await AuthSession.startAsync({ authUrl });

      if (result.type === 'success' && result.params?.access_token) {
        await AsyncStorage.setItem(TOKEN_STORAGE_KEY, result.params.access_token);
        return { success: true };
      } else if (result.type === 'error') {
        return { success: false, error: result.params?.error_description || 'Authentication failed' };
      } else {
        return { success: false, error: 'Authentication cancelled' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Unknown error' };
    }
  },

  // Disconnect FitBit
  async logout(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  },

  // API request helper
  async apiRequest<T>(endpoint: string): Promise<T | null> {
    const token = await this.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated with FitBit');
    }

    const response = await fetch(`${FITBIT_API_BASE}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (response.status === 401) {
      // Token expired, clear it
      await this.logout();
      throw new Error('FitBit session expired. Please reconnect.');
    }

    if (!response.ok) {
      throw new Error(`FitBit API error: ${response.status}`);
    }

    return response.json();
  },

  // Get user profile
  async getProfile(): Promise<any> {
    return this.apiRequest('/user/-/profile.json');
  },

  // Get steps for a date
  async getSteps(date: string = 'today'): Promise<number> {
    try {
      const data = await this.apiRequest<any>(`/user/-/activities/steps/date/${date}/1d.json`);
      const steps = data?.['activities-steps']?.[0]?.value;
      return parseInt(steps || '0', 10);
    } catch {
      return 0;
    }
  },

  // Get sleep data for a date
  async getSleep(date: string = 'today'): Promise<{
    duration: number; // in minutes
    efficiency: number;
    startTime: string | null;
    endTime: string | null;
    stages: { deep: number; light: number; rem: number; wake: number } | null;
  } | null> {
    try {
      const data = await this.apiRequest<any>(`/user/-/sleep/date/${date}.json`);
      const sleep = data?.sleep?.[0];
      
      if (!sleep) return null;

      return {
        duration: Math.round((sleep.duration || 0) / 60000), // ms to minutes
        efficiency: sleep.efficiency || 0,
        startTime: sleep.startTime || null,
        endTime: sleep.endTime || null,
        stages: sleep.levels?.summary ? {
          deep: sleep.levels.summary.deep?.minutes || 0,
          light: sleep.levels.summary.light?.minutes || 0,
          rem: sleep.levels.summary.rem?.minutes || 0,
          wake: sleep.levels.summary.wake?.minutes || 0,
        } : null,
      };
    } catch {
      return null;
    }
  },

  // Get heart rate for a date
  async getHeartRate(date: string = 'today'): Promise<{
    restingHeartRate: number | null;
    zones: Array<{ name: string; min: number; max: number; minutes: number; caloriesOut: number }>;
  } | null> {
    try {
      const data = await this.apiRequest<any>(`/user/-/activities/heart/date/${date}/1d.json`);
      const heartData = data?.['activities-heart']?.[0]?.value;
      
      if (!heartData) return null;

      return {
        restingHeartRate: heartData.restingHeartRate || null,
        zones: heartData.heartRateZones || [],
      };
    } catch {
      return null;
    }
  },

  // Get activity summary for a date
  async getActivitySummary(date: string = 'today'): Promise<{
    steps: number;
    caloriesOut: number;
    activeMinutes: number;
    distance: number; // in km
  } | null> {
    try {
      const data = await this.apiRequest<any>(`/user/-/activities/date/${date}.json`);
      const summary = data?.summary;
      
      if (!summary) return null;

      return {
        steps: summary.steps || 0,
        caloriesOut: summary.caloriesOut || 0,
        activeMinutes: (summary.fairlyActiveMinutes || 0) + (summary.veryActiveMinutes || 0),
        distance: summary.distances?.find((d: any) => d.activity === 'total')?.distance || 0,
      };
    } catch {
      return null;
    }
  },

  // Sync all FitBit data for today and update local database
  async syncToday(): Promise<{
    steps: number;
    sleep: any;
    heartRate: any;
    activity: any;
  }> {
    const today = new Date().toISOString().split('T')[0];
    
    const [steps, sleep, heartRate, activity] = await Promise.all([
      this.getSteps(today),
      this.getSleep(today),
      this.getHeartRate(today),
      this.getActivitySummary(today),
    ]);

    return { steps, sleep, heartRate, activity };
  },
};

export default fitbitService;
