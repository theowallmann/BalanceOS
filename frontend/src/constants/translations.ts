export const translations = {
  de: {
    // Navigation
    dashboard: 'Dashboard',
    nutrition: 'Ernährung',
    sport: 'Sport',
    vitals: 'Vitaldaten',
    profile: 'Profil',
    
    // Common
    save: 'Speichern',
    cancel: 'Abbrechen',
    delete: 'Löschen',
    edit: 'Bearbeiten',
    add: 'Hinzufügen',
    today: 'Heute',
    yesterday: 'Gestern',
    loading: 'Laden...',
    error: 'Fehler',
    success: 'Erfolgreich',
    
    // Nutrition
    calories: 'Kalorien',
    protein: 'Protein',
    carbs: 'Kohlenhydrate',
    fat: 'Fett',
    fiber: 'Ballaststoffe',
    sugar: 'Zucker',
    salt: 'Salz',
    water: 'Wasser',
    addEntry: 'Eintrag hinzufügen',
    aiEstimate: 'KI-Schätzung',
    takePhoto: 'Foto aufnehmen',
    enterManually: 'Manuell eingeben',
    mealDescription: 'Beschreibung der Mahlzeit',
    remaining: 'Verbleibend',
    consumed: 'Aufgenommen',
    goal: 'Ziel',
    
    // Vitals
    weight: 'Gewicht',
    bodyFat: 'Körperfett',
    sleepStart: 'Schlafbeginn',
    sleepEnd: 'Aufwachzeit',
    sleepDuration: 'Schlafdauer',
    sleepQuality: 'Schlafqualität',
    morningEnergy: 'Morgenenergie',
    restingHeartRate: 'Ruhepuls',
    bmr: 'Grundumsatz',
    neat: 'NEAT',
    
    // Sport
    steps: 'Schritte',
    workouts: 'Trainings',
    addWorkout: 'Training hinzufügen',
    duration: 'Dauer',
    caloriesBurned: 'Verbrannte Kalorien',
    distance: 'Distanz',
    customGoals: 'Eigene Ziele',
    
    // Profile
    birthDate: 'Geburtsdatum',
    height: 'Größe',
    gender: 'Geschlecht',
    male: 'Männlich',
    female: 'Weiblich',
    diverse: 'Divers',
    nutrientGoals: 'Nährstoffziele',
    vitalGoals: 'Vitalziele',
    sportGoals: 'Sportziele',
    overallGoal: 'Gesamtziel',
    getAiSuggestions: 'KI-Vorschläge erhalten',
    
    // Fitbit
    connectFitbit: 'Fitbit verbinden',
    disconnectFitbit: 'Fitbit trennen',
    fitbitConnected: 'Fitbit verbunden',
    syncData: 'Daten synchronisieren',
    
    // Dashboard
    dailySummary: 'Tagesübersicht',
    calorieBalance: 'Kalorienbilanz',
    burned: 'Verbrannt',
    
    // Workout types
    running: 'Laufen',
    cycling: 'Radfahren',
    swimming: 'Schwimmen',
    gym: 'Fitnessstudio',
    yoga: 'Yoga',
    hiking: 'Wandern',
    other: 'Sonstiges',
    
    // Units
    kcal: 'kcal',
    g: 'g',
    ml: 'ml',
    kg: 'kg',
    cm: 'cm',
    min: 'min',
    km: 'km',
    hours: 'Stunden',
    bpm: 'BPM',
  },
  en: {
    // Navigation
    dashboard: 'Dashboard',
    nutrition: 'Nutrition',
    sport: 'Sport',
    vitals: 'Vitals',
    profile: 'Profile',
    
    // Common
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    today: 'Today',
    yesterday: 'Yesterday',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    
    // Nutrition
    calories: 'Calories',
    protein: 'Protein',
    carbs: 'Carbohydrates',
    fat: 'Fat',
    fiber: 'Fiber',
    sugar: 'Sugar',
    salt: 'Salt',
    water: 'Water',
    addEntry: 'Add Entry',
    aiEstimate: 'AI Estimate',
    takePhoto: 'Take Photo',
    enterManually: 'Enter Manually',
    mealDescription: 'Meal Description',
    remaining: 'Remaining',
    consumed: 'Consumed',
    goal: 'Goal',
    
    // Vitals
    weight: 'Weight',
    bodyFat: 'Body Fat',
    sleepStart: 'Sleep Start',
    sleepEnd: 'Wake Time',
    sleepDuration: 'Sleep Duration',
    sleepQuality: 'Sleep Quality',
    morningEnergy: 'Morning Energy',
    restingHeartRate: 'Resting Heart Rate',
    bmr: 'BMR',
    neat: 'NEAT',
    
    // Sport
    steps: 'Steps',
    workouts: 'Workouts',
    addWorkout: 'Add Workout',
    duration: 'Duration',
    caloriesBurned: 'Calories Burned',
    distance: 'Distance',
    customGoals: 'Custom Goals',
    
    // Profile
    birthDate: 'Birth Date',
    height: 'Height',
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    diverse: 'Diverse',
    nutrientGoals: 'Nutrient Goals',
    vitalGoals: 'Vital Goals',
    sportGoals: 'Sport Goals',
    overallGoal: 'Overall Goal',
    getAiSuggestions: 'Get AI Suggestions',
    
    // Fitbit
    connectFitbit: 'Connect Fitbit',
    disconnectFitbit: 'Disconnect Fitbit',
    fitbitConnected: 'Fitbit Connected',
    syncData: 'Sync Data',
    
    // Dashboard
    dailySummary: 'Daily Summary',
    calorieBalance: 'Calorie Balance',
    burned: 'Burned',
    
    // Workout types
    running: 'Running',
    cycling: 'Cycling',
    swimming: 'Swimming',
    gym: 'Gym',
    yoga: 'Yoga',
    hiking: 'Hiking',
    other: 'Other',
    
    // Units
    kcal: 'kcal',
    g: 'g',
    ml: 'ml',
    kg: 'kg',
    cm: 'cm',
    min: 'min',
    km: 'km',
    hours: 'hours',
    bpm: 'BPM',
  }
};

export type Language = 'de' | 'en';
export type TranslationKey = keyof typeof translations.de;
