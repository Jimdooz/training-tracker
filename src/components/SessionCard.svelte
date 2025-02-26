<script lang="ts">
  import type { TrainingSession } from '../lib/parsers/mod';
  
  // Props using Svelte 5 runes syntax
  let { session } = $props<{ session: TrainingSession }>();
  
  // State using Svelte 5 runes syntax
  let isExpanded = $state(false); // Collapsed by default
  
  // Toggle expansion state
  function toggleExpansion() {
    isExpanded = !isExpanded;
  }
  
  // Helper to format date
  function formatDate(date: Date | null): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR');
  }
</script>

<div class="flex flex-col p-4 rounded-lg shadow border bg-white mb-4">
  <!-- Session header (always visible) -->
  <div 
    class="flex items-center justify-between cursor-pointer" 
    on:click={toggleExpansion}
    on:keydown={(e) => e.key === 'Enter' && toggleExpansion()}
    tabindex="0"
    role="button"
    aria-expanded={isExpanded}
  >
    <div class="flex flex-col">
      {#if session.title}
        <h3 class="text-xl font-bold text-blue-600">{session.title}</h3>
      {/if}
      <div class="flex gap-2 items-center">
        {#if session.date}
          <p class="text-sm text-gray-500">{formatDate(session.date)}</p>
        {/if}
        <span class="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
          {session.exercises.length} {session.exercises.length === 1 ? 'exercise' : 'exercises'}
        </span>
      </div>
    </div>
    
    <!-- Expand/collapse arrow -->
    <div class="text-blue-500">
      <svg
        class="w-5 h-5 transform transition-transform {isExpanded ? 'rotate-180' : ''}"
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
    </div>
  </div>
  
  <!-- Comment preview (if not expanded) -->
  {#if !isExpanded && session.comment}
    <p class="italic text-gray-600 mt-1 text-sm truncate">{session.comment}</p>
  {/if}
  
  <!-- Expanded content -->
  {#if isExpanded}
    <!-- Full comment if available -->
    {#if session.comment}
      <p class="italic text-gray-600 mt-3 mb-3">{session.comment}</p>
    {/if}
    
    <!-- Exercises -->
    {#if session.exercises && session.exercises.length > 0}
      <div class="grid gap-4 md:grid-cols-2 mt-3">
        {#each session.exercises as exercise}
          <div class="border rounded-md p-3 bg-blue-50 shadow-sm">
            <div class="flex justify-between items-center mb-2">
              <h4 class="font-bold">{exercise.name}</h4>
              <span class="text-sm text-gray-500 bg-white px-2 py-0.5 rounded-full border">
                {exercise.targetSets}×{exercise.target.type === "reps" 
                  ? exercise.target.count 
                  : `${exercise.target.duration.value}${exercise.target.duration.unit}`}
              </span>
            </div>
            
            {#if exercise.comment}
              <p class="text-sm italic mb-2">{exercise.comment}</p>
            {/if}
            
            {#if exercise.sets && exercise.sets.length > 0}
              <div class="space-y-2 mt-2">
                {#each exercise.sets as set, setIndex}
                  <div class="flex gap-2 items-center bg-white p-2 rounded border">
                    <span class="text-xs font-medium bg-gray-100 text-gray-700 w-5 h-5 rounded-full flex items-center justify-center">
                      {setIndex + 1}
                    </span>
                    <div class="flex flex-wrap gap-2 text-sm">
                      {#each set.efforts as effort}
                        <div class="flex items-center">
                          {#if effort.load}
                            <span class="">{effort.load.value}{effort.load.unit}</span>
                          {/if}
                          
                          {#if effort.isRepeat}
                            <span class="mx-1 text-gray-500">/</span>
                          {/if}
                          
                          {#if effort.result.state}
                            <span class="{
                              effort.result.state === 'A' ? 'bg-green-100 text-green-700' :
                              effort.result.state === 'B' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            } px-1.5 py-0.5 rounded-sm ml-1">
                              {effort.result.state}
                              {effort.result.type === 'reps' ? effort.result.count : 
                                `${effort.result.duration.value}${effort.result.duration.unit}`}
                            </span>
                          {/if}
                        </div>
                      {/each}
                    </div>
                    
                    {#if set.comment}
                      <span class="ml-auto text-xs text-gray-500 italic">"{set.comment}"</span>
                    {/if}
                  </div>
                {/each}
              </div>
            {:else}
              <p class="text-sm text-gray-500">No sets recorded</p>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <p class="text-gray-500 italic mt-3">No exercises recorded</p>
    {/if}
  {/if}
</div>
