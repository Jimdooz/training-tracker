import type { TrainingSession, Exercise, Set, Effort } from '../parsers/mod';
import { formatWeek, formatMonth, getWeekNumber } from './dateUtils';

/**
 * Interface for exercise progress data
 */
export interface ExerciseProgress {
  exerciseName: string;
  dates: Date[];
  weights: number[];
  states: string[];
}

/**
 * Interface for completion statistics
 */
export interface CompletionStats {
  date: Date;
  period: string;
  completed: number;
  partial: number;
  failed: number;
}

/**
 * Interface for volume data
 */
export interface VolumeData {
  exercise: string;
  date: Date;
  volume: number; // Typically weight * reps
}

// Cache for memoization
interface CacheEntry<T> {
  timestamp: number;
  value: T;
}

// Set cache expiration to 30 seconds
const CACHE_EXPIRATION = 30 * 1000;

// Caches for expensive calculations
const uniqueExercisesCache = new Map<string, CacheEntry<string[]>>();
const exerciseProgressCache = new Map<string, CacheEntry<ExerciseProgress>>();
const completionStatsCache = new Map<string, CacheEntry<CompletionStats[]>>();
const volumeBySessionCache = new Map<string, CacheEntry<VolumeData[]>>();

/**
 * Generate a cache key for sessions array
 */
function generateSessionsCacheKey(sessions: TrainingSession[] | null | undefined): string {
  if (!sessions || !Array.isArray(sessions) || sessions.length === 0) return 'empty';
  // Use the latest session date + count as cache key
  const latestSession = [...sessions].sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  })[0];
  
  return `${sessions.length}-${latestSession.date ? new Date(latestSession.date).getTime() : 'nodate'}`;
}

/**
 * Check if a cache entry is valid
 */
function isCacheValid<T>(entry: CacheEntry<T> | undefined): boolean {
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_EXPIRATION;
}

/**
 * Safely convert a date value to a Date object
 */
function safeGetDate(dateValue: Date | string | null | undefined): Date | null {
  if (!dateValue) return null;
  
  let date: Date;
  if (typeof dateValue === 'string') {
    date = new Date(dateValue);
  } else if (dateValue instanceof Date) {
    date = dateValue;
  } else {
    return null;
  }
  
  // Check if the date is valid
  return !isNaN(date.getTime()) ? date : null;
}

/**
 * Extract a list of unique exercise names from training sessions
 */
export function getUniqueExercises(sessions: TrainingSession[] | null | undefined): string[] {
  // Generate cache key
  const cacheKey = generateSessionsCacheKey(sessions);
  const cached = uniqueExercisesCache.get(cacheKey);
  
  // Return cached value if valid
  if (isCacheValid(cached)) {
    return cached.value;
  }
  
  if (!sessions || !Array.isArray(sessions) || sessions.length === 0) return [];
  
  const exerciseSet = new Set<string>();
  
  for (const session of sessions) {
    if (session.exercises && Array.isArray(session.exercises)) {
      for (const exercise of session.exercises) {
        if (exercise.name) {
          exerciseSet.add(exercise.name);
        }
      }
    }
  }
  
  const result = Array.from(exerciseSet).sort();
  
  // Cache the result
  uniqueExercisesCache.set(cacheKey, {
    timestamp: Date.now(),
    value: result
  });
  
  return result;
}

/**
 * Extract progress data for a specific exercise
 */
export function extractExerciseProgress(
  sessions: TrainingSession[] | null | undefined, 
  exerciseName: string
): ExerciseProgress {
  // Generate cache key
  const cacheKey = `${generateSessionsCacheKey(sessions)}-${exerciseName}`;
  const cached = exerciseProgressCache.get(cacheKey);
  
  // Return cached value if valid
  if (isCacheValid(cached)) {
    return cached.value;
  }
  
  const result: ExerciseProgress = {
    exerciseName,
    dates: [],
    weights: [],
    states: []
  };
  
  if (!sessions || !Array.isArray(sessions) || sessions.length === 0 || !exerciseName) {
    return result;
  }
  
  // Find all sessions that include this exercise and have valid dates
  const relevantSessions = sessions
    .filter(session => {
      const date = safeGetDate(session.date);
      return date && session.exercises?.some(ex => ex.name === exerciseName);
    })
    .sort((a, b) => {
      const dateA = safeGetDate(a.date) || new Date(0);
      const dateB = safeGetDate(b.date) || new Date(0);
      return dateA.getTime() - dateB.getTime();
    });
  
  for (const session of relevantSessions) {
    const sessionDate = safeGetDate(session.date);
    if (!sessionDate) continue;
    
    const exercise = session.exercises?.find(ex => ex.name === exerciseName);
    if (!exercise || !exercise.sets || exercise.sets.length === 0) continue;
    
    // Use the first set with a load for the progress data
    // This is typically the heaviest or most representative set
    const firstLoadSet = exercise.sets.find(set => 
      set.efforts?.some(eff => eff.load?.value && eff.load.value > 0)
    );
    
    if (!firstLoadSet || !firstLoadSet.efforts) continue;
    
    // Find the heaviest effort in the set
    const heaviestEffort = [...firstLoadSet.efforts]
      .filter(eff => eff.load?.value)
      .sort((a, b) => (b.load?.value || 0) - (a.load?.value || 0))[0];
    
    if (!heaviestEffort || !heaviestEffort.load) continue;
    
    // Add this data point to the result
    result.dates.push(sessionDate);
    result.weights.push(heaviestEffort.load.value);
    result.states.push(heaviestEffort.result.state);
  }
  
  // Cache the result
  exerciseProgressCache.set(cacheKey, {
    timestamp: Date.now(),
    value: result
  });
  
  return result;
}

/**
 * Calculate completion statistics (success/partial/failure rates)
 */
export function calculateCompletionStats(
  sessions: TrainingSession[] | null | undefined, 
  interval: 'week' | 'month' = 'week'
): CompletionStats[] {
  // Generate cache key
  const cacheKey = `${generateSessionsCacheKey(sessions)}-${interval}`;
  const cached = completionStatsCache.get(cacheKey);
  
  // Return cached value if valid
  if (isCacheValid(cached)) {
    return cached.value;
  }
  
  if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
    return [];
  }
  
  const statsByPeriod = new Map<string, { 
    date: Date, 
    period: string,
    completed: number, 
    partial: number, 
    failed: number 
  }>();
  
  for (const session of sessions) {
    const sessionDate = safeGetDate(session.date);
    if (!sessionDate) continue;
    
    // Create a period key based on interval (week or month)
    const periodKey = interval === 'week' 
      ? `${getWeekNumber(sessionDate)}-${sessionDate.getFullYear()}`
      : `${sessionDate.getMonth()}-${sessionDate.getFullYear()}`;
    
    const periodLabel = interval === 'week'
      ? formatWeek(sessionDate)
      : formatMonth(sessionDate);
    
    // Initialize period stats if not exists
    if (!statsByPeriod.has(periodKey)) {
      statsByPeriod.set(periodKey, {
        date: sessionDate,
        period: periodLabel,
        completed: 0,
        partial: 0,
        failed: 0
      });
    }
    
    // Get the stats object for this period
    const periodStats = statsByPeriod.get(periodKey)!;
    
    // Count completions for each exercise's sets
    for (const exercise of session.exercises || []) {
      for (const set of exercise.sets || []) {
        // Determine the overall set status based on efforts
        if (!set.efforts || set.efforts.length === 0) continue;
        
        // Use the first effort's state as representative
        // This is a simplification - could be enhanced for multi-effort sets
        const state = set.efforts[0]?.result?.state || '';
        
        if (state === 'A') {
          periodStats.completed++;
        } else if (state === 'B') {
          periodStats.partial++;
        } else if (state === 'C') {
          periodStats.failed++;
        }
      }
    }
  }
  
  // Convert map to array and sort by date
  const result = Array.from(statsByPeriod.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Cache the result
  completionStatsCache.set(cacheKey, {
    timestamp: Date.now(),
    value: result
  });
  
  return result;
}

/**
 * Calculate training volume (weight × reps) by session
 */
export function calculateVolumeBySession(
  sessions: TrainingSession[] | null | undefined
): VolumeData[] {
  // Generate cache key
  const cacheKey = generateSessionsCacheKey(sessions);
  const cached = volumeBySessionCache.get(cacheKey);
  
  // Return cached value if valid
  if (isCacheValid(cached)) {
    return cached.value;
  }
  
  if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
    return [];
  }
  
  const volumeData: VolumeData[] = [];
  
  for (const session of sessions) {
    const sessionDate = safeGetDate(session.date);
    if (!sessionDate) continue;
    
    for (const exercise of session.exercises || []) {
      let exerciseVolume = 0;
      
      for (const set of exercise.sets || []) {
        for (const effort of set.efforts || []) {
          const weight = effort.load?.value || 0;
          
          // Calculate volume differently based on result type
          if (effort.result.type === 'reps') {
            exerciseVolume += weight * effort.result.count;
          } else if (effort.result.type === 'time') {
            // For time-based exercises, use time as a proxy for reps
            // Converting to seconds for consistency
            let timeInSeconds = effort.result.duration.value;
            if (effort.result.duration.unit === 'min') {
              timeInSeconds *= 60;
            }
            exerciseVolume += weight * (timeInSeconds / 10); // Normalize time
          }
        }
      }
      
      // Only add entries with actual volume
      if (exerciseVolume > 0) {
        volumeData.push({
          exercise: exercise.name,
          date: sessionDate,
          volume: exerciseVolume
        });
      }
    }
  }
  
  // Cache the result
  volumeBySessionCache.set(cacheKey, {
    timestamp: Date.now(),
    value: volumeData
  });
  
  return volumeData;
}

/**
 * Export data to various formats
 */
export function exportData(
  sessions: TrainingSession[] | null | undefined, 
  format: 'csv' | 'json'
): void {
  if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
    alert("No data to export");
    return;
  }
  
  if (format === 'json') {
    const jsonStr = JSON.stringify(sessions, null, 2);
    downloadFile(jsonStr, 'training-data.json', 'application/json');
  } 
  else if (format === 'csv') {
    // Generate flat CSV data structure
    const rows: string[] = ['Date,Exercise,Set,Weight,Reps,Time,Status,Comment'];
    
    for (const session of sessions) {
      if (!session.date) continue;
      const sessionDate = new Date(session.date).toISOString().split('T')[0];
      
      for (const exercise of session.exercises || []) {
        for (let i = 0; i < (exercise.sets?.length || 0); i++) {
          const set = exercise.sets![i];
          
          for (const effort of set.efforts || []) {
            const weight = effort.load?.value || '';
            
            let reps = '';
            let time = '';
            
            if (effort.result.type === 'reps') {
              reps = effort.result.count.toString();
            } else {
              time = effort.result.duration.value.toString();
            }
            
            const status = effort.result.state || '';
            const comment = set.comment || '';
            
            rows.push([
              sessionDate,
              exercise.name,
              (i + 1).toString(),
              weight,
              reps,
              time,
              status,
              comment
            ].map(cell => `"${cell.replace(/"/g, '""')}"`).join(','));
          }
        }
      }
    }
    
    downloadFile(rows.join('\n'), 'training-data.csv', 'text/csv');
  }
}

/**
 * Helper to trigger file download
 */
function downloadFile(content: string, fileName: string, contentType: string): void {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Clear all caches
 * Useful when data is updated or imported
 */
export function clearStatisticsCache(): void {
  uniqueExercisesCache.clear();
  exerciseProgressCache.clear();
  completionStatsCache.clear();
  volumeBySessionCache.clear();
}
