from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, date
import base64
import httpx
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# OpenAI API Key
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')

# Fitbit credentials
FITBIT_CLIENT_ID = os.environ.get('FITBIT_CLIENT_ID', '')
FITBIT_CLIENT_SECRET = os.environ.get('FITBIT_CLIENT_SECRET', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

# Tracking Settings Model
class TrackingSettings(BaseModel):
    # Nutrition tracking
    track_calories: bool = True
    track_protein: bool = True
    track_carbs: bool = True
    track_fat: bool = True
    track_fiber: bool = False
    track_sugar: bool = False
    track_salt: bool = False
    track_water: bool = True
    # Vital tracking
    track_weight: bool = True
    track_body_fat: bool = False
    track_sleep: bool = True
    track_sleep_quality: bool = False
    track_morning_energy: bool = False
    track_resting_heart_rate: bool = False
    # Sport tracking
    track_steps: bool = True
    track_workouts: bool = True
    track_calories_burned: bool = True

# Profile Models
class NutrientGoals(BaseModel):
    calories: Optional[int] = 2000
    protein: Optional[int] = 50  # grams
    carbs: Optional[int] = 250  # grams
    fat: Optional[int] = 65  # grams
    fiber: Optional[int] = 25  # grams
    sugar: Optional[int] = 50  # grams
    salt: Optional[float] = 6  # grams
    water: Optional[int] = 2000  # ml

class VitalGoals(BaseModel):
    target_weight: Optional[float] = None  # kg
    target_body_fat: Optional[float] = None  # %
    sleep_hours: Optional[float] = 8
    resting_heart_rate: Optional[int] = 60

class SportGoals(BaseModel):
    daily_steps: Optional[int] = 10000
    weekly_workouts: Optional[int] = 3
    custom_goals: Optional[List[Dict[str, Any]]] = []

class Profile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    birth_date: Optional[str] = None
    height: Optional[float] = None  # cm
    gender: Optional[str] = None  # male/female/diverse
    nutrient_goals: NutrientGoals = Field(default_factory=NutrientGoals)
    vital_goals: VitalGoals = Field(default_factory=VitalGoals)
    sport_goals: SportGoals = Field(default_factory=SportGoals)
    tracking_settings: TrackingSettings = Field(default_factory=TrackingSettings)
    overall_goal: Optional[str] = None  # Free text goal for AI
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ProfileUpdate(BaseModel):
    birth_date: Optional[str] = None
    height: Optional[float] = None
    gender: Optional[str] = None
    nutrient_goals: Optional[NutrientGoals] = None
    vital_goals: Optional[VitalGoals] = None
    sport_goals: Optional[SportGoals] = None
    tracking_settings: Optional[TrackingSettings] = None
    overall_goal: Optional[str] = None

# Nutrition Models
class NutritionEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    description: str
    calories: Optional[int] = 0
    protein: Optional[float] = 0
    carbs: Optional[float] = 0
    fat: Optional[float] = 0
    fiber: Optional[float] = 0
    sugar: Optional[float] = 0
    salt: Optional[float] = 0
    water: Optional[int] = 0  # ml
    ai_estimated: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class NutritionEntryCreate(BaseModel):
    date: str
    time: str
    description: str
    calories: Optional[int] = 0
    protein: Optional[float] = 0
    carbs: Optional[float] = 0
    fat: Optional[float] = 0
    fiber: Optional[float] = 0
    sugar: Optional[float] = 0
    salt: Optional[float] = 0
    water: Optional[int] = 0
    ai_estimated: bool = False

class AIEstimateRequest(BaseModel):
    description: str
    image_base64: Optional[str] = None

# Vitals Models
class VitalEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str  # YYYY-MM-DD
    weight: Optional[float] = None  # kg
    body_fat: Optional[float] = None  # %
    sleep_start: Optional[str] = None  # HH:MM
    sleep_end: Optional[str] = None  # HH:MM
    sleep_duration: Optional[float] = None  # hours
    sleep_quality: Optional[int] = None  # 1-10
    morning_energy: Optional[int] = None  # 1-10
    resting_heart_rate: Optional[int] = None
    basal_metabolic_rate: Optional[int] = None  # calculated
    neat: Optional[int] = None  # Non-Exercise Activity Thermogenesis
    manual_override: bool = False  # If true, Fitbit won't overwrite
    source: str = "manual"  # manual or fitbit
    created_at: datetime = Field(default_factory=datetime.utcnow)

class VitalEntryCreate(BaseModel):
    date: str
    weight: Optional[float] = None
    body_fat: Optional[float] = None
    sleep_start: Optional[str] = None
    sleep_end: Optional[str] = None
    sleep_quality: Optional[int] = None
    morning_energy: Optional[int] = None
    resting_heart_rate: Optional[int] = None
    manual_override: bool = True

# Sport/Activity Models
class Workout(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # running, cycling, gym, etc.
    duration: int  # minutes
    calories_burned: Optional[int] = 0
    distance: Optional[float] = None  # km
    notes: Optional[str] = None
    manual_override: bool = False

class SportEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str  # YYYY-MM-DD
    steps: Optional[int] = 0
    workouts: List[Workout] = []
    custom_metrics: Optional[Dict[str, Any]] = {}  # For pace, weights, etc.
    source: str = "manual"
    manual_override: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SportEntryCreate(BaseModel):
    date: str
    steps: Optional[int] = 0
    workouts: Optional[List[Dict]] = []
    custom_metrics: Optional[Dict[str, Any]] = {}
    manual_override: bool = True

class WorkoutCreate(BaseModel):
    date: str
    type: str
    duration: int
    calories_burned: Optional[int] = 0
    distance: Optional[float] = None
    notes: Optional[str] = None

# Fitbit Models
class FitbitToken(BaseModel):
    access_token: str
    refresh_token: str
    expires_at: datetime

# ==================== HELPER FUNCTIONS ====================

def calculate_bmr(weight: float, height: float, age: int, gender: str) -> int:
    """Calculate Basal Metabolic Rate using Mifflin-St Jeor Equation"""
    if gender == "male":
        return int(10 * weight + 6.25 * height - 5 * age + 5)
    else:
        return int(10 * weight + 6.25 * height - 5 * age - 161)

def calculate_neat(bmr: int, steps: int) -> int:
    """Estimate NEAT based on steps"""
    # Rough estimate: ~0.04 calories per step
    return int(bmr + (steps * 0.04))

def calculate_sleep_duration(start: str, end: str) -> float:
    """Calculate sleep duration in hours"""
    try:
        start_parts = start.split(":")
        end_parts = end.split(":")
        start_hours = int(start_parts[0]) + int(start_parts[1]) / 60
        end_hours = int(end_parts[0]) + int(end_parts[1]) / 60
        
        if end_hours < start_hours:
            # Sleep spans midnight
            duration = (24 - start_hours) + end_hours
        else:
            duration = end_hours - start_hours
        return round(duration, 1)
    except:
        return 0

async def estimate_nutrition_with_ai(description: str, image_base64: Optional[str] = None) -> Dict:
    """Use OpenAI to estimate nutritional values"""
    try:
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        messages = [{
            "role": "system",
            "content": """Du bist ein Ernährungsexperte. Schätze die Nährwerte für die beschriebene Mahlzeit.
            Antworte NUR mit einem JSON-Objekt in diesem Format:
            {"calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0, "sugar": 0, "salt": 0}
            Alle Werte in Gramm außer Kalorien (kcal) und Salz (g).
            Sei realistisch und präzise."""
        }]
        
        if image_base64:
            messages.append({
                "role": "user",
                "content": [
                    {"type": "text", "text": f"Schätze die Nährwerte für dieses Essen: {description}"},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}}
                ]
            })
        else:
            messages.append({
                "role": "user",
                "content": f"Schätze die Nährwerte für: {description}"
            })
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json={
                    "model": "gpt-4o",
                    "messages": messages,
                    "max_tokens": 200
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                content = result["choices"][0]["message"]["content"]
                # Extract JSON from response
                try:
                    # Try to parse directly
                    return json.loads(content)
                except:
                    # Try to find JSON in the response
                    import re
                    json_match = re.search(r'\{[^}]+\}', content)
                    if json_match:
                        return json.loads(json_match.group())
            
            logger.error(f"OpenAI API error: {response.status_code} - {response.text}")
            return {"calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0, "sugar": 0, "salt": 0}
    except Exception as e:
        logger.error(f"AI estimation error: {e}")
        return {"calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0, "sugar": 0, "salt": 0}

async def get_ai_goal_suggestions(profile_data: Dict, goal_text: str) -> Dict:
    """Use AI to suggest personalized goals"""
    try:
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        prompt = f"""Du bist ein Fitness- und Ernährungsberater. Basierend auf diesen Profildaten:
        - Geburtsdatum: {profile_data.get('birth_date', 'Unbekannt')}
        - Größe: {profile_data.get('height', 'Unbekannt')} cm
        - Geschlecht: {profile_data.get('gender', 'Unbekannt')}
        - Aktuelles Gewicht: {profile_data.get('current_weight', 'Unbekannt')} kg
        - Körperfett: {profile_data.get('current_body_fat', 'Unbekannt')} %
        
        Und diesem Ziel des Nutzers: "{goal_text}"
        
        Erstelle personalisierte Ziele. Antworte NUR mit diesem JSON-Format:
        {{
            "nutrient_goals": {{"calories": 2000, "protein": 50, "carbs": 250, "fat": 65, "fiber": 25, "sugar": 50, "salt": 6, "water": 2000}},
            "vital_goals": {{"target_weight": null, "target_body_fat": null, "sleep_hours": 8, "resting_heart_rate": 60}},
            "sport_goals": {{"daily_steps": 10000, "weekly_workouts": 3}},
            "explanation": "Kurze Erklärung der Empfehlungen"
        }}"""
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json={
                    "model": "gpt-4o",
                    "messages": [
                        {"role": "system", "content": "Du bist ein erfahrener Fitness- und Ernährungsberater."},
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 500
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                content = result["choices"][0]["message"]["content"]
                try:
                    return json.loads(content)
                except:
                    import re
                    json_match = re.search(r'\{[\s\S]*\}', content)
                    if json_match:
                        return json.loads(json_match.group())
            
            return {"error": "Konnte keine Empfehlungen generieren"}
    except Exception as e:
        logger.error(f"AI goal suggestion error: {e}")
        return {"error": str(e)}

# ==================== PROFILE ENDPOINTS ====================

@api_router.get("/profile")
async def get_profile():
    """Get or create user profile"""
    profile = await db.profiles.find_one({})
    if not profile:
        new_profile = Profile()
        await db.profiles.insert_one(new_profile.dict())
        return new_profile.dict()
    profile.pop('_id', None)
    return profile

@api_router.put("/profile")
async def update_profile(update: ProfileUpdate):
    """Update user profile"""
    profile = await db.profiles.find_one({})
    if not profile:
        new_profile = Profile(**update.dict(exclude_none=True))
        await db.profiles.insert_one(new_profile.dict())
        return new_profile.dict()
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data['updated_at'] = datetime.utcnow()
    
    # Handle nested objects properly
    if update.nutrient_goals:
        update_data['nutrient_goals'] = update.nutrient_goals.dict()
    if update.vital_goals:
        update_data['vital_goals'] = update.vital_goals.dict()
    if update.sport_goals:
        update_data['sport_goals'] = update.sport_goals.dict()
    
    await db.profiles.update_one({}, {"$set": update_data})
    updated = await db.profiles.find_one({})
    updated.pop('_id', None)
    return updated

@api_router.post("/profile/ai-suggestions")
async def get_ai_suggestions(request: Dict):
    """Get AI-powered goal suggestions based on profile and user's goal"""
    goal_text = request.get("goal", "")
    if not goal_text:
        raise HTTPException(status_code=400, detail="Bitte gib ein Ziel an")
    
    profile = await db.profiles.find_one({})
    if not profile:
        profile = {}
    
    # Get latest vitals for current weight/body fat
    latest_vital = await db.vitals.find_one({}, sort=[("date", -1)])
    if latest_vital:
        profile['current_weight'] = latest_vital.get('weight')
        profile['current_body_fat'] = latest_vital.get('body_fat')
    
    suggestions = await get_ai_goal_suggestions(profile, goal_text)
    return suggestions

# ==================== NUTRITION ENDPOINTS ====================

@api_router.get("/nutrition/{date}")
async def get_nutrition_entries(date: str):
    """Get all nutrition entries for a specific date"""
    entries = await db.nutrition.find({"date": date}).to_list(100)
    for entry in entries:
        entry.pop('_id', None)
    return entries

@api_router.post("/nutrition")
async def create_nutrition_entry(entry: NutritionEntryCreate):
    """Create a new nutrition entry"""
    nutrition_entry = NutritionEntry(**entry.dict())
    await db.nutrition.insert_one(nutrition_entry.dict())
    return nutrition_entry.dict()

@api_router.put("/nutrition/{entry_id}")
async def update_nutrition_entry(entry_id: str, update: Dict):
    """Update a nutrition entry"""
    await db.nutrition.update_one({"id": entry_id}, {"$set": update})
    updated = await db.nutrition.find_one({"id": entry_id})
    if updated:
        updated.pop('_id', None)
        return updated
    raise HTTPException(status_code=404, detail="Eintrag nicht gefunden")

@api_router.delete("/nutrition/{entry_id}")
async def delete_nutrition_entry(entry_id: str):
    """Delete a nutrition entry"""
    result = await db.nutrition.delete_one({"id": entry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden")
    return {"message": "Eintrag gelöscht"}

@api_router.post("/nutrition/ai-estimate")
async def ai_estimate_nutrition(request: AIEstimateRequest):
    """Estimate nutrition using AI"""
    result = await estimate_nutrition_with_ai(request.description, request.image_base64)
    return result

@api_router.get("/nutrition/summary/{date}")
async def get_nutrition_summary(date: str):
    """Get daily nutrition summary"""
    entries = await db.nutrition.find({"date": date}).to_list(100)
    
    summary = {
        "date": date,
        "total_calories": 0,
        "total_protein": 0,
        "total_carbs": 0,
        "total_fat": 0,
        "total_fiber": 0,
        "total_sugar": 0,
        "total_salt": 0,
        "total_water": 0,
        "entry_count": len(entries)
    }
    
    for entry in entries:
        summary["total_calories"] += entry.get("calories", 0) or 0
        summary["total_protein"] += entry.get("protein", 0) or 0
        summary["total_carbs"] += entry.get("carbs", 0) or 0
        summary["total_fat"] += entry.get("fat", 0) or 0
        summary["total_fiber"] += entry.get("fiber", 0) or 0
        summary["total_sugar"] += entry.get("sugar", 0) or 0
        summary["total_salt"] += entry.get("salt", 0) or 0
        summary["total_water"] += entry.get("water", 0) or 0
    
    return summary

# ==================== VITALS ENDPOINTS ====================

@api_router.get("/vitals/{date}")
async def get_vital_entry(date: str):
    """Get vital entry for a specific date"""
    entry = await db.vitals.find_one({"date": date})
    if entry:
        entry.pop('_id', None)
        return entry
    
    # If no entry, try to get previous day's weight/body_fat
    prev_entry = await db.vitals.find_one({"date": {"$lt": date}}, sort=[("date", -1)])
    if prev_entry:
        return {
            "date": date,
            "weight": prev_entry.get("weight"),
            "body_fat": prev_entry.get("body_fat"),
            "source": "carried_over"
        }
    return {"date": date}

@api_router.post("/vitals")
async def create_or_update_vital_entry(entry: VitalEntryCreate):
    """Create or update vital entry for a date"""
    existing = await db.vitals.find_one({"date": entry.date})
    
    # Calculate sleep duration if both times provided
    sleep_duration = None
    if entry.sleep_start and entry.sleep_end:
        sleep_duration = calculate_sleep_duration(entry.sleep_start, entry.sleep_end)
    
    # Calculate BMR if we have weight and profile data
    bmr = None
    profile = await db.profiles.find_one({})
    if entry.weight and profile and profile.get('height') and profile.get('birth_date') and profile.get('gender'):
        try:
            birth_date = datetime.strptime(profile['birth_date'], "%Y-%m-%d")
            age = (datetime.now() - birth_date).days // 365
            bmr = calculate_bmr(entry.weight, profile['height'], age, profile['gender'])
        except:
            pass
    
    entry_data = entry.dict()
    entry_data['sleep_duration'] = sleep_duration
    entry_data['basal_metabolic_rate'] = bmr
    entry_data['source'] = 'manual'
    
    if existing:
        # Only update non-None values, preserve manual overrides
        update_data = {k: v for k, v in entry_data.items() if v is not None}
        if existing.get('manual_override') and not entry.manual_override:
            # Don't overwrite if manual override is set
            pass
        else:
            await db.vitals.update_one({"date": entry.date}, {"$set": update_data})
    else:
        vital_entry = VitalEntry(**entry_data)
        await db.vitals.insert_one(vital_entry.dict())
    
    updated = await db.vitals.find_one({"date": entry.date})
    if updated:
        updated.pop('_id', None)
    return updated

@api_router.get("/vitals/history/{days}")
async def get_vital_history(days: int):
    """Get vital history for the last N days"""
    entries = await db.vitals.find().sort("date", -1).limit(days).to_list(days)
    for entry in entries:
        entry.pop('_id', None)
    return entries

# ==================== SPORT ENDPOINTS ====================

@api_router.get("/sport/{date}")
async def get_sport_entry(date: str):
    """Get sport entry for a specific date"""
    entry = await db.sport.find_one({"date": date})
    if entry:
        entry.pop('_id', None)
        return entry
    return {"date": date, "steps": 0, "workouts": [], "custom_metrics": {}}

@api_router.post("/sport")
async def create_or_update_sport_entry(entry: SportEntryCreate):
    """Create or update sport entry for a date"""
    existing = await db.sport.find_one({"date": entry.date})
    
    entry_data = entry.dict()
    entry_data['source'] = 'manual'
    
    # Convert workouts to proper format
    workouts = []
    for w in entry.workouts or []:
        workout = Workout(**w) if isinstance(w, dict) else w
        workouts.append(workout.dict() if hasattr(workout, 'dict') else w)
    entry_data['workouts'] = workouts
    
    if existing:
        update_data = {k: v for k, v in entry_data.items() if v is not None}
        await db.sport.update_one({"date": entry.date}, {"$set": update_data})
    else:
        sport_entry = SportEntry(**entry_data)
        await db.sport.insert_one(sport_entry.dict())
    
    updated = await db.sport.find_one({"date": entry.date})
    if updated:
        updated.pop('_id', None)
    return updated

@api_router.post("/sport/{date}/workout")
async def add_workout(date: str, workout: WorkoutCreate):
    """Add a workout to a date's sport entry"""
    existing = await db.sport.find_one({"date": date})
    
    new_workout = Workout(
        type=workout.type,
        duration=workout.duration,
        calories_burned=workout.calories_burned,
        distance=workout.distance,
        notes=workout.notes
    )
    
    if existing:
        workouts = existing.get('workouts', [])
        workouts.append(new_workout.dict())
        await db.sport.update_one({"date": date}, {"$set": {"workouts": workouts}})
    else:
        sport_entry = SportEntry(date=date, workouts=[new_workout])
        await db.sport.insert_one(sport_entry.dict())
    
    updated = await db.sport.find_one({"date": date})
    if updated:
        updated.pop('_id', None)
    return updated

@api_router.delete("/sport/{date}/workout/{workout_id}")
async def delete_workout(date: str, workout_id: str):
    """Delete a workout from a date's sport entry"""
    existing = await db.sport.find_one({"date": date})
    if not existing:
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden")
    
    workouts = [w for w in existing.get('workouts', []) if w.get('id') != workout_id]
    await db.sport.update_one({"date": date}, {"$set": {"workouts": workouts}})
    
    return {"message": "Training gelöscht"}

@api_router.put("/sport/{date}/custom-metrics")
async def update_custom_metrics(date: str, metrics: Dict):
    """Update custom metrics for a sport entry"""
    existing = await db.sport.find_one({"date": date})
    
    if existing:
        current_metrics = existing.get('custom_metrics', {})
        current_metrics.update(metrics)
        await db.sport.update_one({"date": date}, {"$set": {"custom_metrics": current_metrics}})
    else:
        sport_entry = SportEntry(date=date, custom_metrics=metrics)
        await db.sport.insert_one(sport_entry.dict())
    
    updated = await db.sport.find_one({"date": date})
    if updated:
        updated.pop('_id', None)
    return updated

# ==================== ANALYTICS ENDPOINTS ====================

@api_router.get("/analytics/{date}")
async def get_daily_analytics(date: str):
    """Get comprehensive daily analytics"""
    profile = await db.profiles.find_one({})
    nutrition_summary = await get_nutrition_summary(date)
    vitals = await db.vitals.find_one({"date": date})
    sport = await db.sport.find_one({"date": date})
    
    if vitals:
        vitals.pop('_id', None)
    if sport:
        sport.pop('_id', None)
    
    # Calculate NEAT if we have steps and BMR
    neat = None
    if vitals and sport:
        bmr = vitals.get('basal_metabolic_rate', 0)
        steps = sport.get('steps', 0)
        if bmr:
            neat = calculate_neat(bmr, steps)
    
    # Calculate total calories burned
    workout_calories = 0
    if sport and sport.get('workouts'):
        for workout in sport['workouts']:
            workout_calories += workout.get('calories_burned', 0) or 0
    
    total_burned = (vitals.get('basal_metabolic_rate', 0) if vitals else 0) + workout_calories
    
    # Get goals from profile
    nutrient_goals = {}
    vital_goals = {}
    sport_goals = {}
    if profile:
        profile.pop('_id', None)
        nutrient_goals = profile.get('nutrient_goals', {})
        vital_goals = profile.get('vital_goals', {})
        sport_goals = profile.get('sport_goals', {})
    
    return {
        "date": date,
        "nutrition": {
            "consumed": nutrition_summary,
            "goals": nutrient_goals,
            "remaining": {
                "calories": (nutrient_goals.get('calories', 0) or 0) - nutrition_summary['total_calories'],
                "protein": (nutrient_goals.get('protein', 0) or 0) - nutrition_summary['total_protein'],
                "carbs": (nutrient_goals.get('carbs', 0) or 0) - nutrition_summary['total_carbs'],
                "fat": (nutrient_goals.get('fat', 0) or 0) - nutrition_summary['total_fat'],
            }
        },
        "vitals": vitals or {},
        "sport": {
            "data": sport or {},
            "goals": sport_goals,
            "workout_calories": workout_calories,
            "neat": neat
        },
        "summary": {
            "calories_consumed": nutrition_summary['total_calories'],
            "calories_burned": total_burned,
            "calorie_balance": nutrition_summary['total_calories'] - total_burned,
            "steps": sport.get('steps', 0) if sport else 0,
            "steps_goal": sport_goals.get('daily_steps', 10000)
        }
    }

@api_router.get("/analytics/weekly/{end_date}")
async def get_weekly_analytics(end_date: str):
    """Get weekly analytics summary"""
    from datetime import timedelta
    
    end = datetime.strptime(end_date, "%Y-%m-%d")
    days = []
    
    for i in range(7):
        day = end - timedelta(days=i)
        day_str = day.strftime("%Y-%m-%d")
        analytics = await get_daily_analytics(day_str)
        days.append(analytics)
    
    return {"days": days}

# ==================== FITBIT ENDPOINTS ====================

@api_router.get("/fitbit/auth-url")
async def get_fitbit_auth_url():
    """Get Fitbit OAuth authorization URL"""
    # For a mobile app, we'd use a redirect URI that the app can handle
    redirect_uri = "https://healthmate-113.preview.emergentagent.com/api/fitbit/callback"
    scope = "activity heartrate sleep weight profile"
    
    auth_url = (
        f"https://www.fitbit.com/oauth2/authorize?"
        f"response_type=code&"
        f"client_id={FITBIT_CLIENT_ID}&"
        f"redirect_uri={redirect_uri}&"
        f"scope={scope}&"
        f"expires_in=604800"
    )
    
    return {"auth_url": auth_url}

@api_router.get("/fitbit/callback")
async def fitbit_callback(code: str):
    """Handle Fitbit OAuth callback"""
    redirect_uri = "https://healthmate-113.preview.emergentagent.com/api/fitbit/callback"
    
    try:
        async with httpx.AsyncClient() as client:
            # Exchange code for tokens
            token_response = await client.post(
                "https://api.fitbit.com/oauth2/token",
                data={
                    "client_id": FITBIT_CLIENT_ID,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri,
                    "code": code
                },
                headers={
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                auth=(FITBIT_CLIENT_ID, FITBIT_CLIENT_SECRET)
            )
            
            if token_response.status_code == 200:
                tokens = token_response.json()
                
                # Store tokens
                token_data = {
                    "access_token": tokens["access_token"],
                    "refresh_token": tokens["refresh_token"],
                    "expires_at": datetime.utcnow().timestamp() + tokens["expires_in"],
                    "user_id": tokens.get("user_id")
                }
                
                await db.fitbit_tokens.delete_many({})  # Only one user
                await db.fitbit_tokens.insert_one(token_data)
                
                # Return success page
                return {"message": "Fitbit erfolgreich verbunden!", "success": True}
            else:
                logger.error(f"Fitbit token error: {token_response.text}")
                return {"error": "Fehler bei der Fitbit-Verbindung", "success": False}
    except Exception as e:
        logger.error(f"Fitbit callback error: {e}")
        return {"error": str(e), "success": False}

@api_router.get("/fitbit/status")
async def get_fitbit_status():
    """Check if Fitbit is connected"""
    token = await db.fitbit_tokens.find_one({})
    if token:
        return {"connected": True, "user_id": token.get("user_id")}
    return {"connected": False}

@api_router.post("/fitbit/sync/{date}")
async def sync_fitbit_data(date: str):
    """Sync data from Fitbit for a specific date"""
    token_doc = await db.fitbit_tokens.find_one({})
    if not token_doc:
        raise HTTPException(status_code=401, detail="Fitbit nicht verbunden")
    
    access_token = token_doc["access_token"]
    
    try:
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {access_token}"}
            
            # Fetch activity data (steps)
            activity_response = await client.get(
                f"https://api.fitbit.com/1/user/-/activities/date/{date}.json",
                headers=headers
            )
            
            # Fetch sleep data
            sleep_response = await client.get(
                f"https://api.fitbit.com/1.2/user/-/sleep/date/{date}.json",
                headers=headers
            )
            
            # Fetch weight data
            weight_response = await client.get(
                f"https://api.fitbit.com/1/user/-/body/log/weight/date/{date}.json",
                headers=headers
            )
            
            # Fetch heart rate
            hr_response = await client.get(
                f"https://api.fitbit.com/1/user/-/activities/heart/date/{date}/1d.json",
                headers=headers
            )
            
            result = {"synced": [], "errors": []}
            
            # Process activity data
            if activity_response.status_code == 200:
                activity_data = activity_response.json()
                steps = activity_data.get("summary", {}).get("steps", 0)
                
                # Update sport entry if not manually overridden
                existing_sport = await db.sport.find_one({"date": date})
                if not existing_sport or not existing_sport.get("manual_override"):
                    await db.sport.update_one(
                        {"date": date},
                        {"$set": {"steps": steps, "source": "fitbit"}},
                        upsert=True
                    )
                    result["synced"].append("steps")
            
            # Process sleep data
            if sleep_response.status_code == 200:
                sleep_data = sleep_response.json()
                if sleep_data.get("sleep"):
                    sleep_entry = sleep_data["sleep"][0]
                    existing_vital = await db.vitals.find_one({"date": date})
                    
                    if not existing_vital or not existing_vital.get("manual_override"):
                        await db.vitals.update_one(
                            {"date": date},
                            {"$set": {
                                "sleep_duration": sleep_entry.get("duration", 0) / 3600000,  # ms to hours
                                "source": "fitbit"
                            }},
                            upsert=True
                        )
                        result["synced"].append("sleep")
            
            # Process weight data
            if weight_response.status_code == 200:
                weight_data = weight_response.json()
                if weight_data.get("weight"):
                    weight_entry = weight_data["weight"][0]
                    existing_vital = await db.vitals.find_one({"date": date})
                    
                    if not existing_vital or not existing_vital.get("manual_override"):
                        await db.vitals.update_one(
                            {"date": date},
                            {"$set": {
                                "weight": weight_entry.get("weight"),
                                "body_fat": weight_entry.get("fat"),
                                "source": "fitbit"
                            }},
                            upsert=True
                        )
                        result["synced"].append("weight")
            
            # Process heart rate data
            if hr_response.status_code == 200:
                hr_data = hr_response.json()
                resting_hr = hr_data.get("activities-heart", [{}])[0].get("value", {}).get("restingHeartRate")
                if resting_hr:
                    existing_vital = await db.vitals.find_one({"date": date})
                    if not existing_vital or not existing_vital.get("manual_override"):
                        await db.vitals.update_one(
                            {"date": date},
                            {"$set": {"resting_heart_rate": resting_hr}},
                            upsert=True
                        )
                        result["synced"].append("heart_rate")
            
            return result
            
    except Exception as e:
        logger.error(f"Fitbit sync error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/fitbit/disconnect")
async def disconnect_fitbit():
    """Disconnect Fitbit account"""
    await db.fitbit_tokens.delete_many({})
    return {"message": "Fitbit getrennt"}

# ==================== APP BLOCKER MODELS ====================

class AppBlockSchedule(BaseModel):
    days: List[str] = []  # monday, tuesday, etc.
    start_time: str  # HH:MM
    end_time: str  # HH:MM

class AppBlockRule(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    apps: List[str] = []  # List of app names/identifiers, empty = all apps
    block_all: bool = False
    schedule: AppBlockSchedule
    unlock_method: str = "password"  # password, sport, both
    password: Optional[str] = None
    sport_minutes_required: int = 30  # Minutes of sport needed to unlock
    edit_lock_days: int = 0  # Days until rule can be edited
    allow_temporary_unlock: bool = True  # Allow 5-minute unlock
    temporary_unlock_minutes: int = 5
    strict_mode: bool = False  # If true, no temporary unlock possible
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    edit_locked_until: Optional[datetime] = None

class AppBlockRuleCreate(BaseModel):
    name: str
    apps: List[str] = []
    block_all: bool = False
    schedule: AppBlockSchedule
    unlock_method: str = "password"
    password: Optional[str] = None
    sport_minutes_required: int = 30
    edit_lock_days: int = 0
    allow_temporary_unlock: bool = True
    temporary_unlock_minutes: int = 5
    strict_mode: bool = False

class TemporaryUnlock(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    rule_id: str
    app_name: Optional[str] = None
    unlocked_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime

# ==================== PUSH NOTIFICATION MODELS ====================

class PushNotification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    message: str
    schedule_time: str  # HH:MM
    schedule_days: List[str] = []  # monday, tuesday, etc. Empty = daily
    notification_type: str = "reminder"  # reminder, motivation, custom
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PushNotificationCreate(BaseModel):
    title: str
    message: str
    schedule_time: str
    schedule_days: List[str] = []
    notification_type: str = "reminder"

# ==================== APP BLOCKER ENDPOINTS ====================

@api_router.get("/app-blocker/rules")
async def get_app_block_rules():
    """Get all app block rules"""
    rules = await db.app_block_rules.find().to_list(100)
    for rule in rules:
        rule.pop('_id', None)
    return rules

@api_router.post("/app-blocker/rules")
async def create_app_block_rule(rule: AppBlockRuleCreate):
    """Create a new app block rule"""
    rule_data = rule.dict()
    
    # Calculate edit lock date if specified
    if rule.edit_lock_days > 0:
        from datetime import timedelta
        rule_data['edit_locked_until'] = datetime.utcnow() + timedelta(days=rule.edit_lock_days)
    
    new_rule = AppBlockRule(**rule_data)
    await db.app_block_rules.insert_one(new_rule.dict())
    
    result = new_rule.dict()
    return result

@api_router.get("/app-blocker/rules/{rule_id}")
async def get_app_block_rule(rule_id: str):
    """Get a specific app block rule"""
    rule = await db.app_block_rules.find_one({"id": rule_id})
    if not rule:
        raise HTTPException(status_code=404, detail="Regel nicht gefunden")
    rule.pop('_id', None)
    return rule

@api_router.put("/app-blocker/rules/{rule_id}")
async def update_app_block_rule(rule_id: str, update: Dict):
    """Update an app block rule (if not edit-locked)"""
    rule = await db.app_block_rules.find_one({"id": rule_id})
    if not rule:
        raise HTTPException(status_code=404, detail="Regel nicht gefunden")
    
    # Check if edit is locked
    if rule.get('edit_locked_until'):
        lock_date = rule['edit_locked_until']
        if isinstance(lock_date, str):
            lock_date = datetime.fromisoformat(lock_date)
        if datetime.utcnow() < lock_date:
            raise HTTPException(
                status_code=403, 
                detail=f"Regel kann nicht bearbeitet werden bis {lock_date.strftime('%d.%m.%Y')}"
            )
    
    # Check if currently in active schedule
    if is_rule_currently_active(rule):
        raise HTTPException(
            status_code=403,
            detail="Regel kann während des aktiven Zeitraums nicht bearbeitet werden"
        )
    
    await db.app_block_rules.update_one({"id": rule_id}, {"$set": update})
    updated = await db.app_block_rules.find_one({"id": rule_id})
    updated.pop('_id', None)
    return updated

@api_router.delete("/app-blocker/rules/{rule_id}")
async def delete_app_block_rule(rule_id: str):
    """Delete an app block rule (if not edit-locked or active)"""
    rule = await db.app_block_rules.find_one({"id": rule_id})
    if not rule:
        raise HTTPException(status_code=404, detail="Regel nicht gefunden")
    
    # Check if edit is locked
    if rule.get('edit_locked_until'):
        lock_date = rule['edit_locked_until']
        if isinstance(lock_date, str):
            lock_date = datetime.fromisoformat(lock_date)
        if datetime.utcnow() < lock_date:
            raise HTTPException(
                status_code=403,
                detail=f"Regel kann nicht gelöscht werden bis {lock_date.strftime('%d.%m.%Y')}"
            )
    
    # Check if currently active
    if is_rule_currently_active(rule):
        raise HTTPException(
            status_code=403,
            detail="Regel kann während des aktiven Zeitraums nicht gelöscht werden"
        )
    
    await db.app_block_rules.delete_one({"id": rule_id})
    return {"message": "Regel gelöscht"}

def is_rule_currently_active(rule: Dict) -> bool:
    """Check if a rule is currently in its active time window"""
    now = datetime.utcnow()
    current_day = now.strftime("%A").lower()
    current_time = now.strftime("%H:%M")
    
    schedule = rule.get('schedule', {})
    days = schedule.get('days', [])
    start_time = schedule.get('start_time', '00:00')
    end_time = schedule.get('end_time', '23:59')
    
    # Check if current day is in schedule
    if days and current_day not in [d.lower() for d in days]:
        return False
    
    # Check if current time is within schedule
    return start_time <= current_time <= end_time

@api_router.post("/app-blocker/rules/{rule_id}/verify-password")
async def verify_block_password(rule_id: str, data: Dict):
    """Verify password to unlock"""
    rule = await db.app_block_rules.find_one({"id": rule_id})
    if not rule:
        raise HTTPException(status_code=404, detail="Regel nicht gefunden")
    
    if rule.get('password') == data.get('password'):
        return {"verified": True}
    return {"verified": False}

@api_router.post("/app-blocker/rules/{rule_id}/verify-sport")
async def verify_sport_unlock(rule_id: str):
    """Check if enough sport activity for unlock"""
    rule = await db.app_block_rules.find_one({"id": rule_id})
    if not rule:
        raise HTTPException(status_code=404, detail="Regel nicht gefunden")
    
    # Get today's sport data
    today = datetime.utcnow().strftime("%Y-%m-%d")
    sport = await db.sport.find_one({"date": today})
    
    if not sport:
        return {"verified": False, "minutes_done": 0, "minutes_required": rule.get('sport_minutes_required', 30)}
    
    # Calculate total workout minutes
    total_minutes = sum(w.get('duration', 0) for w in sport.get('workouts', []))
    required_minutes = rule.get('sport_minutes_required', 30)
    
    return {
        "verified": total_minutes >= required_minutes,
        "minutes_done": total_minutes,
        "minutes_required": required_minutes
    }

@api_router.post("/app-blocker/rules/{rule_id}/temporary-unlock")
async def create_temporary_unlock(rule_id: str, data: Dict):
    """Create a temporary unlock for an app"""
    rule = await db.app_block_rules.find_one({"id": rule_id})
    if not rule:
        raise HTTPException(status_code=404, detail="Regel nicht gefunden")
    
    if rule.get('strict_mode') or not rule.get('allow_temporary_unlock', True):
        raise HTTPException(
            status_code=403,
            detail="Temporäres Entsperren ist für diese Regel deaktiviert"
        )
    
    from datetime import timedelta
    unlock_minutes = rule.get('temporary_unlock_minutes', 5)
    
    unlock = TemporaryUnlock(
        rule_id=rule_id,
        app_name=data.get('app_name'),
        expires_at=datetime.utcnow() + timedelta(minutes=unlock_minutes)
    )
    
    await db.temporary_unlocks.insert_one(unlock.dict())
    
    return {
        "message": f"App für {unlock_minutes} Minuten entsperrt",
        "expires_at": unlock.expires_at.isoformat(),
        "unlock_id": unlock.id
    }

@api_router.get("/app-blocker/temporary-unlocks")
async def get_active_temporary_unlocks():
    """Get all currently active temporary unlocks"""
    now = datetime.utcnow()
    unlocks = await db.temporary_unlocks.find({
        "expires_at": {"$gt": now}
    }).to_list(100)
    
    for unlock in unlocks:
        unlock.pop('_id', None)
    return unlocks

@api_router.get("/app-blocker/status")
async def get_blocker_status():
    """Get current blocker status - which rules are active"""
    rules = await db.app_block_rules.find({"is_active": True}).to_list(100)
    active_rules = []
    
    for rule in rules:
        if is_rule_currently_active(rule):
            rule.pop('_id', None)
            rule.pop('password', None)  # Don't expose password
            active_rules.append(rule)
    
    return {
        "is_blocking": len(active_rules) > 0,
        "active_rules": active_rules
    }

# ==================== PUSH NOTIFICATION ENDPOINTS ====================

@api_router.get("/notifications")
async def get_notifications():
    """Get all push notification settings"""
    notifications = await db.push_notifications.find().to_list(100)
    for notif in notifications:
        notif.pop('_id', None)
    return notifications

@api_router.post("/notifications")
async def create_notification(notification: PushNotificationCreate):
    """Create a new push notification"""
    new_notif = PushNotification(**notification.dict())
    await db.push_notifications.insert_one(new_notif.dict())
    return new_notif.dict()

@api_router.put("/notifications/{notif_id}")
async def update_notification(notif_id: str, update: Dict):
    """Update a push notification"""
    await db.push_notifications.update_one({"id": notif_id}, {"$set": update})
    updated = await db.push_notifications.find_one({"id": notif_id})
    if updated:
        updated.pop('_id', None)
        return updated
    raise HTTPException(status_code=404, detail="Benachrichtigung nicht gefunden")

@api_router.delete("/notifications/{notif_id}")
async def delete_notification(notif_id: str):
    """Delete a push notification"""
    result = await db.push_notifications.delete_one({"id": notif_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Benachrichtigung nicht gefunden")
    return {"message": "Benachrichtigung gelöscht"}

@api_router.put("/notifications/{notif_id}/toggle")
async def toggle_notification(notif_id: str):
    """Toggle notification active state"""
    notif = await db.push_notifications.find_one({"id": notif_id})
    if not notif:
        raise HTTPException(status_code=404, detail="Benachrichtigung nicht gefunden")
    
    new_state = not notif.get('is_active', True)
    await db.push_notifications.update_one({"id": notif_id}, {"$set": {"is_active": new_state}})
    
    return {"is_active": new_state}

# ==================== ROOT ENDPOINT ====================

@api_router.get("/")
async def root():
    return {"message": "HealthMate API", "version": "1.0"}

# Include router and setup middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
