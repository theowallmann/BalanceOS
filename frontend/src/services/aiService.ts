import { OPENAI_API_KEY, AI_CONFIG } from '../constants/apiKeys';

interface NutritionEstimate {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  salt: number;
  water: number;
  confidence: 'high' | 'medium' | 'low';
}

interface WorkoutSuggestion {
  type: string;
  name: string;
  duration: number;
  calories_burned: number;
  description: string;
}

// Estimate nutrition from food description
export async function estimateNutrition(description: string): Promise<NutritionEstimate> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: `Du bist ein Ernährungsexperte. Schätze die Nährwerte für die beschriebene Mahlzeit.
Antworte NUR mit einem JSON-Objekt in diesem Format:
{
  "calories": number,
  "protein": number (in Gramm),
  "carbs": number (in Gramm),
  "fat": number (in Gramm),
  "fiber": number (in Gramm),
  "sugar": number (in Gramm),
  "salt": number (in Gramm),
  "water": number (in ml),
  "confidence": "high" | "medium" | "low"
}
Sei realistisch bei den Schätzungen. Wenn die Beschreibung unklar ist, schätze konservativ.`
          },
          {
            role: 'user',
            content: description
          }
        ],
        max_tokens: AI_CONFIG.maxTokens,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        calories: Math.round(parsed.calories || 0),
        protein: Math.round(parsed.protein || 0),
        carbs: Math.round(parsed.carbs || 0),
        fat: Math.round(parsed.fat || 0),
        fiber: Math.round(parsed.fiber || 0),
        sugar: Math.round(parsed.sugar || 0),
        salt: Math.round((parsed.salt || 0) * 10) / 10,
        water: Math.round(parsed.water || 0),
        confidence: parsed.confidence || 'medium',
      };
    }
    
    throw new Error('Could not parse nutrition data');
  } catch (error) {
    console.error('Nutrition estimation error:', error);
    throw error;
  }
}

// Get workout suggestions based on goals
export async function getWorkoutSuggestions(
  currentStats: {
    weight?: number;
    caloriesConsumed?: number;
    caloriesBurned?: number;
    stepsToday?: number;
  },
  goals: {
    targetCalories?: number;
    targetWeight?: number;
  }
): Promise<WorkoutSuggestion[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: `Du bist ein Fitness-Coach. Basierend auf den aktuellen Statistiken und Zielen, schlage 3 passende Workouts vor.
Antworte NUR mit einem JSON-Array in diesem Format:
[
  {
    "type": "cardio" | "strength" | "flexibility" | "hiit",
    "name": "Name des Workouts",
    "duration": number (in Minuten),
    "calories_burned": number (geschätzte Kalorien),
    "description": "Kurze Beschreibung"
  }
]`
          },
          {
            role: 'user',
            content: `Aktuelle Stats:
- Gewicht: ${currentStats.weight || 'unbekannt'} kg
- Heute konsumiert: ${currentStats.caloriesConsumed || 0} kcal
- Heute verbrannt: ${currentStats.caloriesBurned || 0} kcal
- Schritte heute: ${currentStats.stepsToday || 0}

Ziele:
- Tägliche Kalorien: ${goals.targetCalories || 2000} kcal
- Zielgewicht: ${goals.targetWeight || 'nicht gesetzt'} kg`
          }
        ],
        max_tokens: AI_CONFIG.maxTokens,
        temperature: AI_CONFIG.temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('Could not parse workout suggestions');
  } catch (error) {
    console.error('Workout suggestion error:', error);
    throw error;
  }
}

// Get daily health tips
export async function getDailyTip(
  context: {
    sleepHours?: number;
    stepsToday?: number;
    waterIntake?: number;
    calorieBalance?: number;
  }
): Promise<string> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: 'Du bist ein freundlicher Gesundheitsberater. Gib einen kurzen, motivierenden Tipp (max 2 Sätze) basierend auf den Tagesstatistiken. Sei positiv und ermutigend.'
          },
          {
            role: 'user',
            content: `Meine heutigen Stats:
- Schlaf: ${context.sleepHours || 'nicht getrackt'} Stunden
- Schritte: ${context.stepsToday || 0}
- Wasser: ${context.waterIntake || 0} ml
- Kalorienbilanz: ${context.calorieBalance || 0} kcal`
          }
        ],
        max_tokens: 150,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Bleib aktiv und trink genug Wasser!';
  } catch (error) {
    console.error('Daily tip error:', error);
    return 'Bleib aktiv und trink genug Wasser!';
  }
}

export const aiService = {
  estimateNutrition,
  getWorkoutSuggestions,
  getDailyTip,
};
