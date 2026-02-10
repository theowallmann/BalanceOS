import { db, generateId, initDatabase } from './schema';

// ==================== PROFILE ====================
export const profileService = {
  async get() {
    const result = await db.getFirstAsync<any>('SELECT * FROM profile WHERE id = 1');
    if (result) {
      return {
        ...result,
        nutrient_goals: JSON.parse(result.nutrient_goals || '{}'),
        vital_goals: JSON.parse(result.vital_goals || '{}'),
        sport_goals: JSON.parse(result.sport_goals || '{}'),
        tracking_settings: JSON.parse(result.tracking_settings || '{}'),
      };
    }
    return null;
  },

  async update(data: any) {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.birth_date !== undefined) {
      updates.push('birth_date = ?');
      values.push(data.birth_date);
    }
    if (data.height !== undefined) {
      updates.push('height = ?');
      values.push(data.height);
    }
    if (data.gender !== undefined) {
      updates.push('gender = ?');
      values.push(data.gender);
    }
    if (data.nutrient_goals !== undefined) {
      updates.push('nutrient_goals = ?');
      values.push(JSON.stringify(data.nutrient_goals));
    }
    if (data.vital_goals !== undefined) {
      updates.push('vital_goals = ?');
      values.push(JSON.stringify(data.vital_goals));
    }
    if (data.sport_goals !== undefined) {
      updates.push('sport_goals = ?');
      values.push(JSON.stringify(data.sport_goals));
    }
    if (data.tracking_settings !== undefined) {
      updates.push('tracking_settings = ?');
      values.push(JSON.stringify(data.tracking_settings));
    }
    if (data.language !== undefined) {
      updates.push('language = ?');
      values.push(data.language);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    if (updates.length > 0) {
      await db.runAsync(
        `UPDATE profile SET ${updates.join(', ')} WHERE id = 1`,
        values
      );
    }

    return this.get();
  },
};

// ==================== NUTRITION ====================
export const nutritionService = {
  async getByDate(date: string) {
    const results = await db.getAllAsync<any>(
      'SELECT * FROM nutrition_entries WHERE date = ? ORDER BY time DESC',
      [date]
    );
    return results;
  },

  async create(data: any) {
    const id = generateId();
    await db.runAsync(
      `INSERT INTO nutrition_entries (id, date, time, description, calories, protein, carbs, fat, fiber, sugar, salt, water)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.date,
        data.time || new Date().toTimeString().slice(0, 5),
        data.description || '',
        data.calories || 0,
        data.protein || 0,
        data.carbs || 0,
        data.fat || 0,
        data.fiber || 0,
        data.sugar || 0,
        data.salt || 0,
        data.water || 0,
      ]
    );
    return { id, ...data };
  },

  async update(id: string, data: any) {
    await db.runAsync(
      `UPDATE nutrition_entries SET 
       description = ?, calories = ?, protein = ?, carbs = ?, fat = ?, 
       fiber = ?, sugar = ?, salt = ?, water = ?
       WHERE id = ?`,
      [
        data.description || '',
        data.calories || 0,
        data.protein || 0,
        data.carbs || 0,
        data.fat || 0,
        data.fiber || 0,
        data.sugar || 0,
        data.salt || 0,
        data.water || 0,
        id,
      ]
    );
    return { id, ...data };
  },

  async delete(id: string) {
    await db.runAsync('DELETE FROM nutrition_entries WHERE id = ?', [id]);
  },

  async getRange(startDate: string, endDate: string) {
    return await db.getAllAsync<any>(
      'SELECT * FROM nutrition_entries WHERE date >= ? AND date <= ? ORDER BY date DESC, time DESC',
      [startDate, endDate]
    );
  },
};

// ==================== VITALS ====================
export const vitalsService = {
  async getByDate(date: string) {
    return await db.getFirstAsync<any>(
      'SELECT * FROM vitals WHERE date = ?',
      [date]
    );
  },

  async createOrUpdate(date: string, data: any) {
    const existing = await this.getByDate(date);
    
    if (existing) {
      await db.runAsync(
        `UPDATE vitals SET 
         weight = COALESCE(?, weight),
         body_fat = COALESCE(?, body_fat),
         sleep_start = COALESCE(?, sleep_start),
         sleep_end = COALESCE(?, sleep_end),
         sleep_duration = COALESCE(?, sleep_duration),
         sleep_quality = COALESCE(?, sleep_quality),
         morning_energy = COALESCE(?, morning_energy),
         resting_heart_rate = COALESCE(?, resting_heart_rate),
         basal_metabolic_rate = COALESCE(?, basal_metabolic_rate),
         neat = COALESCE(?, neat),
         updated_at = CURRENT_TIMESTAMP
         WHERE date = ?`,
        [
          data.weight, data.body_fat, data.sleep_start, data.sleep_end,
          data.sleep_duration, data.sleep_quality, data.morning_energy,
          data.resting_heart_rate, data.basal_metabolic_rate, data.neat,
          date,
        ]
      );
    } else {
      const id = generateId();
      await db.runAsync(
        `INSERT INTO vitals (id, date, weight, body_fat, sleep_start, sleep_end, sleep_duration, sleep_quality, morning_energy, resting_heart_rate, basal_metabolic_rate, neat)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, date, data.weight, data.body_fat, data.sleep_start, data.sleep_end,
          data.sleep_duration, data.sleep_quality, data.morning_energy,
          data.resting_heart_rate, data.basal_metabolic_rate, data.neat,
        ]
      );
    }
    
    return this.getByDate(date);
  },

  async getLatest() {
    return await db.getFirstAsync<any>(
      'SELECT * FROM vitals ORDER BY date DESC LIMIT 1'
    );
  },

  async getRange(startDate: string, endDate: string) {
    return await db.getAllAsync<any>(
      'SELECT * FROM vitals WHERE date >= ? AND date <= ? ORDER BY date',
      [startDate, endDate]
    );
  },
};

// ==================== SPORT ====================
export const sportService = {
  async getByDate(date: string) {
    const result = await db.getFirstAsync<any>(
      'SELECT * FROM sport WHERE date = ?',
      [date]
    );
    if (result) {
      return {
        ...result,
        workouts: JSON.parse(result.workouts || '[]'),
        custom_metrics: JSON.parse(result.custom_metrics || '{}'),
      };
    }
    return null;
  },

  async createOrUpdate(date: string, data: any) {
    const existing = await this.getByDate(date);
    
    if (existing) {
      const updates: string[] = [];
      const values: any[] = [];

      if (data.steps !== undefined) {
        updates.push('steps = ?');
        values.push(data.steps);
      }
      if (data.calories_burned !== undefined) {
        updates.push('calories_burned = ?');
        values.push(data.calories_burned);
      }
      if (data.workouts !== undefined) {
        updates.push('workouts = ?');
        values.push(JSON.stringify(data.workouts));
      }
      if (data.custom_metrics !== undefined) {
        updates.push('custom_metrics = ?');
        values.push(JSON.stringify(data.custom_metrics));
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(date);

      await db.runAsync(
        `UPDATE sport SET ${updates.join(', ')} WHERE date = ?`,
        values
      );
    } else {
      const id = generateId();
      await db.runAsync(
        `INSERT INTO sport (id, date, steps, calories_burned, workouts, custom_metrics)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id, date,
          data.steps || 0,
          data.calories_burned || 0,
          JSON.stringify(data.workouts || []),
          JSON.stringify(data.custom_metrics || {}),
        ]
      );
    }
    
    return this.getByDate(date);
  },

  async addWorkout(date: string, workout: any) {
    const sportData = await this.getByDate(date) || { workouts: [] };
    const workouts = sportData.workouts || [];
    const newWorkout = { id: generateId(), ...workout };
    workouts.push(newWorkout);
    
    await this.createOrUpdate(date, { workouts });
    return newWorkout;
  },

  async deleteWorkout(date: string, workoutId: string) {
    const sportData = await this.getByDate(date);
    if (sportData) {
      const workouts = (sportData.workouts || []).filter((w: any) => w.id !== workoutId);
      await this.createOrUpdate(date, { workouts });
    }
  },

  async getRange(startDate: string, endDate: string) {
    return await db.getAllAsync<any>(
      'SELECT * FROM sport WHERE date >= ? AND date <= ? ORDER BY date',
      [startDate, endDate]
    );
  },
};

// ==================== FINANCE ====================
export const financeService = {
  async getCategories() {
    return await db.getAllAsync<any>('SELECT * FROM finance_categories ORDER BY name');
  },

  async createCategory(data: any) {
    const id = generateId();
    await db.runAsync(
      `INSERT INTO finance_categories (id, name, budget, rhythm, color)
       VALUES (?, ?, ?, ?, ?)`,
      [id, data.name, data.budget || 0, data.rhythm || 'monthly', data.color || '#4CAF50']
    );
    return { id, ...data };
  },

  async deleteCategory(id: string) {
    await db.runAsync('DELETE FROM finance_entries WHERE category_id = ?', [id]);
    await db.runAsync('DELETE FROM finance_categories WHERE id = ?', [id]);
  },

  async getEntries(categoryId?: string, startDate?: string, endDate?: string) {
    let query = 'SELECT * FROM finance_entries WHERE 1=1';
    const params: any[] = [];

    if (categoryId) {
      query += ' AND category_id = ?';
      params.push(categoryId);
    }
    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY date DESC';
    return await db.getAllAsync<any>(query, params);
  },

  async createEntry(data: any) {
    const id = generateId();
    await db.runAsync(
      `INSERT INTO finance_entries (id, category_id, date, description, amount)
       VALUES (?, ?, ?, ?, ?)`,
      [id, data.category_id, data.date, data.description || '', data.amount]
    );
    return { id, ...data };
  },

  async deleteEntry(id: string) {
    await db.runAsync('DELETE FROM finance_entries WHERE id = ?', [id]);
  },

  async getSummary(categoryId: string) {
    const category = await db.getFirstAsync<any>(
      'SELECT * FROM finance_categories WHERE id = ?',
      [categoryId]
    );
    const entries = await this.getEntries(categoryId);
    const totalSpent = entries.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    
    return {
      category,
      entries,
      total_spent: totalSpent,
      budget_remaining: (category?.budget || 0) - totalSpent,
    };
  },

  async getAllSummaries() {
    const categories = await this.getCategories();
    const summaries = [];
    
    for (const category of categories) {
      const summary = await this.getSummary(category.id);
      summaries.push(summary);
    }
    
    return summaries;
  },
};

// ==================== APP BLOCKER ====================
export const appBlockerService = {
  async getRules() {
    const rules = await db.getAllAsync<any>('SELECT * FROM app_blocker_rules');
    return rules.map((r: any) => ({
      ...r,
      apps: JSON.parse(r.apps || '[]'),
      days: JSON.parse(r.days || '[]'),
      is_active: Boolean(r.is_active),
      allow_temporary_unlock: Boolean(r.allow_temporary_unlock),
    }));
  },

  async createRule(data: any) {
    const id = generateId();
    await db.runAsync(
      `INSERT INTO app_blocker_rules (id, name, apps, start_time, end_time, days, is_active, unlock_type, unlock_password, sport_minutes_required, allow_temporary_unlock, temporary_unlock_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, data.name,
        JSON.stringify(data.apps || []),
        data.start_time, data.end_time,
        JSON.stringify(data.days || []),
        data.is_active !== false ? 1 : 0,
        data.unlock_type || 'password',
        data.unlock_password || '',
        data.sport_minutes_required || 0,
        data.allow_temporary_unlock !== false ? 1 : 0,
        data.temporary_unlock_minutes || 5,
      ]
    );
    return { id, ...data };
  },

  async updateRule(id: string, data: any) {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.apps !== undefined) { updates.push('apps = ?'); values.push(JSON.stringify(data.apps)); }
    if (data.start_time !== undefined) { updates.push('start_time = ?'); values.push(data.start_time); }
    if (data.end_time !== undefined) { updates.push('end_time = ?'); values.push(data.end_time); }
    if (data.days !== undefined) { updates.push('days = ?'); values.push(JSON.stringify(data.days)); }
    if (data.is_active !== undefined) { updates.push('is_active = ?'); values.push(data.is_active ? 1 : 0); }

    values.push(id);
    await db.runAsync(`UPDATE app_blocker_rules SET ${updates.join(', ')} WHERE id = ?`, values);
  },

  async deleteRule(id: string) {
    await db.runAsync('DELETE FROM app_blocker_rules WHERE id = ?', [id]);
  },

  async getStatus() {
    const rules = await this.getRules();
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const currentDay = now.getDay();

    const activeRules = rules.filter((rule: any) => {
      if (!rule.is_active) return false;
      if (!rule.days.includes(currentDay)) return false;
      return currentTime >= rule.start_time && currentTime <= rule.end_time;
    });

    return {
      is_blocking: activeRules.length > 0,
      active_rules: activeRules,
    };
  },
};

// ==================== NOTIFICATIONS ====================
export const notificationsService = {
  async getAll() {
    const results = await db.getAllAsync<any>('SELECT * FROM notifications');
    return results.map((n: any) => ({
      ...n,
      days: JSON.parse(n.days || '[]'),
      is_active: Boolean(n.is_active),
    }));
  },

  async create(data: any) {
    const id = generateId();
    await db.runAsync(
      `INSERT INTO notifications (id, title, message, time, days, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.title, data.message || '', data.time, JSON.stringify(data.days || []), 1]
    );
    return { id, ...data };
  },

  async delete(id: string) {
    await db.runAsync('DELETE FROM notifications WHERE id = ?', [id]);
  },

  async toggle(id: string) {
    const notif = await db.getFirstAsync<any>('SELECT is_active FROM notifications WHERE id = ?', [id]);
    if (notif) {
      await db.runAsync('UPDATE notifications SET is_active = ? WHERE id = ?', [notif.is_active ? 0 : 1, id]);
    }
  },
};

// ==================== ANALYTICS ====================
export const analyticsService = {
  async getToday(date: string) {
    const nutrition = await nutritionService.getByDate(date);
    const vitals = await vitalsService.getByDate(date);
    const sport = await sportService.getByDate(date);

    const totalCalories = nutrition.reduce((sum: number, e: any) => sum + (e.calories || 0), 0);
    const totalProtein = nutrition.reduce((sum: number, e: any) => sum + (e.protein || 0), 0);
    const totalCarbs = nutrition.reduce((sum: number, e: any) => sum + (e.carbs || 0), 0);
    const totalFat = nutrition.reduce((sum: number, e: any) => sum + (e.fat || 0), 0);
    const totalWater = nutrition.reduce((sum: number, e: any) => sum + (e.water || 0), 0);
    const totalFiber = nutrition.reduce((sum: number, e: any) => sum + (e.fiber || 0), 0);
    const totalSugar = nutrition.reduce((sum: number, e: any) => sum + (e.sugar || 0), 0);

    const sportCalories = sport?.calories_burned || 0;
    const workoutCalories = (sport?.workouts || []).reduce((s: number, w: any) => s + (w.calories_burned || 0), 0);

    return {
      date,
      nutrition: {
        consumed: {
          total_calories: totalCalories,
          total_protein: totalProtein,
          total_carbs: totalCarbs,
          total_fat: totalFat,
          total_water: totalWater,
          total_fiber: totalFiber,
          total_sugar: totalSugar,
        },
      },
      sport: { data: sport || { steps: 0, calories_burned: 0, workouts: [] } },
      vitals: vitals || {},
      summary: { calories_burned: sportCalories || workoutCalories },
    };
  },

  async getPeriod(period: 'today' | 'month' | 'all') {
    const today = new Date().toISOString().split('T')[0];
    let startDate = today;

    if (period === 'month') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      startDate = d.toISOString().split('T')[0];
    } else if (period === 'all') {
      startDate = '2000-01-01';
    }

    const nutrition = await nutritionService.getRange(startDate, today);
    const vitalsRows = await vitalsService.getRange(startDate, today);
    const sportRows = await sportService.getRange(startDate, today);

    const dayCount = Math.max(1, new Set(nutrition.map((e: any) => e.date)).size);
    const totalCalories = nutrition.reduce((s: number, e: any) => s + (e.calories || 0), 0);
    const totalProtein = nutrition.reduce((s: number, e: any) => s + (e.protein || 0), 0);
    const totalCarbs = nutrition.reduce((s: number, e: any) => s + (e.carbs || 0), 0);
    const totalFat = nutrition.reduce((s: number, e: any) => s + (e.fat || 0), 0);
    const totalWater = nutrition.reduce((s: number, e: any) => s + (e.water || 0), 0);

    // Weight progression
    const weightsWithData = vitalsRows.filter((v: any) => v.weight);
    const weightStart = weightsWithData.length > 0 ? weightsWithData[0].weight : null;
    const weightEnd = weightsWithData.length > 0 ? weightsWithData[weightsWithData.length - 1].weight : null;
    const weightChange = weightStart && weightEnd ? Math.round((weightEnd - weightStart) * 10) / 10 : null;

    const bodyFatWithData = vitalsRows.filter((v: any) => v.body_fat);
    const bodyFatStart = bodyFatWithData.length > 0 ? bodyFatWithData[0].body_fat : null;
    const bodyFatEnd = bodyFatWithData.length > 0 ? bodyFatWithData[bodyFatWithData.length - 1].body_fat : null;
    const bodyFatChange = bodyFatStart && bodyFatEnd ? Math.round((bodyFatEnd - bodyFatStart) * 10) / 10 : null;

    const sleepRows = vitalsRows.filter((v: any) => v.sleep_duration);
    const avgSleep = sleepRows.length > 0
      ? Math.round((sleepRows.reduce((s: number, v: any) => s + v.sleep_duration, 0) / sleepRows.length) * 10) / 10
      : null;

    // Sport
    const totalSteps = sportRows.reduce((s: number, r: any) => s + (r.steps || 0), 0);
    const sportDays = Math.max(1, sportRows.length);
    let totalWorkouts = 0;
    let totalWorkoutMinutes = 0;
    let totalWorkoutCalories = 0;
    for (const row of sportRows) {
      const workouts = JSON.parse(row.workouts || '[]');
      totalWorkouts += workouts.length;
      totalWorkoutMinutes += workouts.reduce((s: number, w: any) => s + (w.duration || 0), 0);
      totalWorkoutCalories += workouts.reduce((s: number, w: any) => s + (w.calories_burned || 0), 0);
    }

    return {
      period,
      start_date: startDate,
      end_date: today,
      nutrition: {
        averages: {
          calories: totalCalories / dayCount,
          protein: totalProtein / dayCount,
          carbs: totalCarbs / dayCount,
          fat: totalFat / dayCount,
          water: totalWater / dayCount,
        },
      },
      vitals: {
        weight: { start: weightStart, end: weightEnd, change: weightChange },
        body_fat: { start: bodyFatStart, end: bodyFatEnd, change: bodyFatChange },
        sleep: { average_hours: avgSleep },
      },
      sport: {
        averages: {
          steps_per_day: totalSteps / sportDays,
          workout_calories_per_day: totalWorkoutCalories / sportDays,
        },
        totals: { workouts: totalWorkouts, workout_minutes: totalWorkoutMinutes },
      },
      days_with_data: { nutrition: dayCount },
    };
  },
};

// ==================== NUTRITION SUMMARY ====================
export const nutritionSummaryService = {
  async getByDate(date: string) {
    const entries = await nutritionService.getByDate(date);
    return {
      total_calories: entries.reduce((s: number, e: any) => s + (e.calories || 0), 0),
      total_protein: entries.reduce((s: number, e: any) => s + (e.protein || 0), 0),
      total_carbs: entries.reduce((s: number, e: any) => s + (e.carbs || 0), 0),
      total_fat: entries.reduce((s: number, e: any) => s + (e.fat || 0), 0),
      total_water: entries.reduce((s: number, e: any) => s + (e.water || 0), 0),
      total_fiber: entries.reduce((s: number, e: any) => s + (e.fiber || 0), 0),
      total_sugar: entries.reduce((s: number, e: any) => s + (e.sugar || 0), 0),
      total_salt: entries.reduce((s: number, e: any) => s + (e.salt || 0), 0),
    };
  },
};

// ==================== EXPORT ====================
export const exportService = {
  async exportToCsv(startDate?: string, endDate?: string) {
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString().split('T')[0];
    })();

    const nutrition = await nutritionService.getRange(start, end);
    const vitals = await vitalsService.getRange(start, end);
    const sport = await sportService.getRange(start, end);
    const finance = await financeService.getEntries(undefined, start, end);

    // Build CSV strings
    const nutritionCsv = 'Datum;Uhrzeit;Beschreibung;Kalorien;Protein;Kohlenhydrate;Fett;Ballaststoffe;Zucker;Salz;Wasser\n' +
      nutrition.map((e: any) => 
        `${e.date};${e.time};${e.description};${e.calories};${e.protein};${e.carbs};${e.fat};${e.fiber};${e.sugar};${e.salt};${e.water}`
      ).join('\n');

    const vitalsCsv = 'Datum;Gewicht;Korperfett;Schlafbeginn;Schlafende;Schlafdauer;Schlafqualitat;Morgenenergie;Ruhepuls\n' +
      vitals.map((e: any) =>
        `${e.date};${e.weight || ''};${e.body_fat || ''};${e.sleep_start || ''};${e.sleep_end || ''};${e.sleep_duration || ''};${e.sleep_quality || ''};${e.morning_energy || ''};${e.resting_heart_rate || ''}`
      ).join('\n');

    const sportCsv = 'Datum;Schritte;Verbrannte Kalorien\n' +
      sport.map((e: any) => `${e.date};${e.steps};${e.calories_burned}`).join('\n');

    return {
      start_date: start,
      end_date: end,
      nutrition_csv: nutritionCsv,
      vitals_csv: vitalsCsv,
      sport_csv: sportCsv,
      counts: {
        nutrition: nutrition.length,
        vitals: vitals.length,
        sport: sport.length,
        finance: finance.length,
      },
    };
  },
};

// Initialize database on import
export { initDatabase };
