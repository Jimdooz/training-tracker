<script lang="ts">
  import { onMount } from 'svelte';
  import type { TrainingSession } from '../lib/parsers/mod';
  import ExerciseProgressChart from './stats/ExerciseProgressChart.svelte';
  import CompletionStatsChart from './stats/CompletionStatsChart.svelte';
  import {
    extractExerciseProgress,
    getUniqueExercises,
    calculateCompletionStats,
    calculateVolumeBySession
  } from '../lib/statistics/dataProcessor';
  
  let { sessions } = $props<{ sessions: TrainingSession[] }>();
  
  let selectedExercise = $state('');
  let statsInterval = $state<'week' | 'month'>('week');
  let uniqueExercises: string[] = $state([]);
  let isChartReady = $state(false);
  let windowWidth = $state(0);
  
  // Get the chart width based on window size
  $effect(() => {
    if (typeof window !== 'undefined') {
      windowWidth = window.innerWidth;
    }
  });
  
  // Calculate the appropriate chart width
  let chartWidth = $derived(
    windowWidth < 640 ? windowWidth - 20 : // Small screens, reduce padding
    windowWidth < 1024 ? Math.min(800, windowWidth - 40) : // Medium screens
    Math.min(1000, windowWidth - 40) // Large screens, allow charts to be wider
  );
  
  // Update unique exercises when sessions change
  $effect(() => {
    if (!sessions || sessions.length === 0) return;
    uniqueExercises = getUniqueExercises(sessions);
    
    // Select the first exercise by default if none is selected
    if (!selectedExercise && uniqueExercises.length > 0) {
      selectedExercise = uniqueExercises[0];
    }
    
    isChartReady = true;
  });
  
  function handleWindowResize() {
    windowWidth = window.innerWidth;
  }
  
  onMount(() => {
    window.addEventListener('resize', handleWindowResize);
    return () => {
      window.removeEventListener('resize', handleWindowResize);
    };
  });
</script>

<svelte:window on:resize={handleWindowResize} />

<div class="stats-container p-4">
  {#if sessions.length === 0}
    <div class="flex flex-col items-center justify-center h-64 text-center">
      <p class="text-gray-500">No training data available</p>
      <p class="text-sm text-gray-400 mt-2">Start by recording your training sessions in Text Mode</p>
    </div>
  {:else if isChartReady}
    <!-- Exercise selector -->
    <div class="mb-8">
      <h3 class="text-lg font-medium mb-3">Exercise Progress</h3>
      <div class="flex gap-3 items-center flex-wrap">
        <label for="exercise-select" class="text-sm">Select exercise:</label>
        <select 
          id="exercise-select" 
          bind:value={selectedExercise}
          class="border rounded px-3 py-1 text-sm bg-white"
        >
          {#each uniqueExercises as exercise}
            <option value={exercise}>{exercise}</option>
          {/each}
        </select>
      </div>
      
      <!-- Exercise progress chart -->
      <div class="mt-4 border rounded-lg bg-white p-4 shadow-sm w-full">
        {#if selectedExercise}
          <ExerciseProgressChart 
            data={extractExerciseProgress(sessions, selectedExercise)} 
            width={chartWidth} 
            height={300} 
          />
        {:else}
          <p class="text-gray-500 text-center py-10">Select an exercise to see progress</p>
        {/if}
      </div>
    </div>
    
    <!-- Completion stats -->
    <div class="mb-8">
      <h3 class="text-lg font-medium mb-3">Completion Statistics</h3>
      <div class="flex gap-3 items-center flex-wrap">
        <span class="text-sm">Group by:</span>
        <div class="flex rounded-md overflow-hidden border">
          <button 
            class="px-3 py-1 text-sm {statsInterval === 'week' ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-700'}"
            on:click={() => statsInterval = 'week'}
          >
            Week
          </button>
          <button 
            class="px-3 py-1 text-sm {statsInterval === 'month' ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-700'}"
            on:click={() => statsInterval = 'month'}
          >
            Month
          </button>
        </div>
      </div>
      
      <!-- Completion stats chart -->
      <div class="mt-4 border rounded-lg bg-white p-4 shadow-sm w-full">
        <CompletionStatsChart 
          data={calculateCompletionStats(sessions, statsInterval)} 
          width={chartWidth} 
          height={300} 
          interval={statsInterval}
        />
      </div>
    </div>
    
    <!-- Volume stats -->
    <div class="mb-8">
      <h3 class="text-lg font-medium mb-3">Key Statistics</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Total workouts -->
        <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border shadow-sm">
          <p class="text-sm text-blue-600 font-medium">Total Workouts</p>
          <p class="text-3xl font-bold">{sessions.length}</p>
          <p class="text-xs text-blue-500 mt-1">All time</p>
        </div>
        
        <!-- Total exercises -->
        <div class="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border shadow-sm">
          <p class="text-sm text-green-600 font-medium">Total Exercises</p>
          <p class="text-3xl font-bold">{uniqueExercises.length}</p>
          <p class="text-xs text-green-500 mt-1">Unique exercises tracked</p>
        </div>
        
        <!-- Success rate -->
        {#if calculateCompletionStats(sessions).length}
          {@const stats = calculateCompletionStats(sessions)}
          {@const total = stats.reduce((acc, curr) => acc + curr.completed + curr.partial + curr.failed, 0)}
          {@const completed = stats.reduce((acc, curr) => acc + curr.completed, 0)}
          {@const successRate = total ? Math.round((completed / total) * 100) : 0}
          
          <div class="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border shadow-sm">
            <p class="text-sm text-yellow-600 font-medium">Success Rate</p>
            <p class="text-3xl font-bold">{successRate}%</p>
            <p class="text-xs text-yellow-500 mt-1">
              {completed} successful sets out of {total}
            </p>
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <div class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  {/if}
</div>

<style>
  .stats-container {
    width: 100%;
    max-width: 100%;
    margin: 0 auto;
  }
</style>
