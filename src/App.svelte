<script lang="ts">
  import { EditorState, EditorSelection, Range } from "@codemirror/state";
  import {
    drawSelection,
    EditorView,
    keymap,
    Decoration,
    type DecorationSet,
    ViewPlugin,
    ViewUpdate,
  } from "@codemirror/view";
  import { defaultKeymap, history, undo, redo, historyKeymap } from "@codemirror/commands";
  import { onMount } from "svelte";
  import {
    autocompletion,
    completeFromList,
    type Completion,
    type CompletionContext,
    type CompletionResult,
  } from "@codemirror/autocomplete";
  import { appHighlighter } from "./lib/extensions/highlighters";
  import { 
    dateCompletions, 
    exerciseCompletions, 
    formatDateTime,
    sessionTitleCompletions
  } from "./lib/extensions/completions";
  import { parseContent } from "./lib/parsers/mod";
  import SessionCard from "./components/SessionCard.svelte";
  import StatsView from "./components/StatsView.svelte";

  const STORAGE_KEY = "training-tracker-content";
  const TAB_STORAGE_KEY = "training-tracker-active-tab";
  
  // Tab navigation constants
  const TABS = {
    TEXT: 'text',
    BLOCKS: 'blocks',
    STATS: 'stats'
  };
  
  let activeTab = $state(TABS.TEXT);
  let parsedContent: ReturnType<typeof parseContent> | null = $state(null);
  let isContentParsed = $state(false);

  // Load content from localStorage or return default content if empty
  function loadContent(): string {
    if (typeof window === "undefined") return "";
    return (
      localStorage.getItem(STORAGE_KEY) ||
      "# Training Tracker\n\nStart writing here..."
    );
  }
  
  // Load active tab from localStorage
  function loadActiveTab(): string {
    if (typeof window === "undefined") return TABS.TEXT;
    return localStorage.getItem(TAB_STORAGE_KEY) || TABS.TEXT;
  }

  // Save content to localStorage
  function saveContent(content: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, content);
  }
  
  // Save active tab to localStorage
  function saveActiveTab(tab: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(TAB_STORAGE_KEY, tab);
  }

  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      const content = update.state.doc.toString();
      // Only parse content when in blocks or stats view for better performance
      if (activeTab === TABS.BLOCKS || activeTab === TABS.STATS) {
        parsedContent = parseContent(content);
        isContentParsed = true;
      } else {
        // Mark content as needing parsing
        isContentParsed = false;
      }
      saveContent(content);
    }
  });

  let editorContainer: HTMLDivElement = $state()!;
  let view: EditorView;

  function createEditor() {
    let state = EditorState.create({
      doc: loadContent(),
      extensions: [
        keymap.of([...defaultKeymap, ...historyKeymap]),
        history(),
        appHighlighter,
        autocompletion({
          override: [
            dateCompletions,
            (context: CompletionContext) => exerciseCompletions(view?.state.doc.toString() || "")(context),
            (context: CompletionContext) => sessionTitleCompletions(view?.state.doc.toString() || "")(context)
          ],
        }),
        updateListener,
        EditorView.lineWrapping,
      ],
    });

    let view = new EditorView({
      state,
      parent: editorContainer,
    });

    return view;
  }

  function undoText() {
    undo(view);
  }

  function redoText() {
    redo(view);
  }

  function createNewSession() {
    const date = formatDateTime(new Date());
    const session = `# Session\n${date}\n\n--------\n\n`;
    // Add new session at the start of the document
    view.dispatch({
      changes: { from: 0, to: 0, insert: session },
      selection: EditorSelection.single(0),
    });
    // Focus the editor after creating a new session at the '-' line and move the cursor to the end of the line
    view.focus();
    const newPosition = view.state.doc.lineAt(`# Session\n${date}\n`.length).to;
    view.dispatch({
      selection: {
        anchor: newPosition,
        head: newPosition,
      },
    });
  }

  function namedSession() {
    const title = `# \n`;
    view.dispatch({
      changes: { from: 0, to: 0, insert: title },
      selection: EditorSelection.single(0),
    });
    view.focus();
    const newPosition = view.state.doc.lineAt(title.length - 1).to;
    view.dispatch({
      selection: {
        anchor: newPosition,
        head: newPosition,
      },
    });
  }

  function setActiveTab(tab: string) {
    // Don't do anything if the tab is already active
    if (activeTab === tab) return;
    
    // Parse content if needed when switching to blocks or stats view
    if ((tab === TABS.BLOCKS || tab === TABS.STATS) && view && !isContentParsed) {
      // Show parsing is happening by setting immediately to the new tab
      activeTab = tab;
      saveActiveTab(tab);
      
      // Use setTimeout to allow the UI to update before doing the heavy parsing
      setTimeout(() => {
        parsedContent = parseContent(view.state.doc.toString());
        isContentParsed = true;
      }, 10);
    } else {
      activeTab = tab;
      saveActiveTab(tab);
    }
  }

  onMount(() => {
    view = createEditor();
    // Load the active tab from localStorage
    activeTab = loadActiveTab();
    
    // If starting on blocks or stats tab, parse the content
    if (activeTab === TABS.BLOCKS || activeTab === TABS.STATS) {
      parsedContent = parseContent(view.state.doc.toString());
      isContentParsed = true;
    }
    
    return () => {
      view.destroy();
    };
  });
</script>

{#snippet svgArrow(rotate = 0)}
  {#if rotate === 180}
    <!-- Undo arrow (counterclockwise) -->
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 14l-4-4 4-4"></path>
      <path d="M5 10h11a4 4 0 1 1 0 8h-1"></path>
    </svg>
  {:else}
    <!-- Redo arrow (clockwise) -->
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M15 14l4-4-4-4"></path>
      <path d="M19 10H8a4 4 0 1 0 0 8h1"></path>
    </svg>
  {/if}
{/snippet}

{#snippet textIcon()}
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
{/snippet}

{#snippet blocksIcon()}
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
{/snippet}

{#snippet statsIcon()}
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
{/snippet}

<div class="flex flex-col self-center w-full max-w-[1200px] p-2 flex-1 pt-8 lg:pt-16 gap-4">
  <h1 class="text-5xl font-bold">Training tracker</h1>
  
  <!-- Tab Navigation with responsive design -->
  <div class="flex border-b border-neutral-200">
    <button 
      class="px-4 py-2 font-medium {activeTab === TABS.TEXT ? 'text-blue-500 border-b-2 border-blue-500' : 'text-neutral-500 hover:text-neutral-700'}"
      onclick={() => setActiveTab(TABS.TEXT)}
    >
      <span class="hidden sm:inline">Text Mode</span>
      <span class="sm:hidden" aria-label="Text Mode">
        {@render textIcon()}
      </span>
    </button>
    <button 
      class="px-4 py-2 font-medium {activeTab === TABS.BLOCKS ? 'text-blue-500 border-b-2 border-blue-500' : 'text-neutral-500 hover:text-neutral-700'}"
      onclick={() => setActiveTab(TABS.BLOCKS)}
    >
      <span class="hidden sm:inline">Block View</span>
      <span class="sm:hidden" aria-label="Block View">
        {@render blocksIcon()}
      </span>
    </button>
    <button 
      class="px-4 py-2 font-medium {activeTab === TABS.STATS ? 'text-blue-500 border-b-2 border-blue-500' : 'text-neutral-500 hover:text-neutral-700'}"
      onclick={() => setActiveTab(TABS.STATS)}
    >
      <span class="hidden sm:inline">Stats</span>
      <span class="sm:hidden" aria-label="Stats">
        {@render statsIcon()}
      </span>
    </button>
  </div>
  
  <!-- Action buttons -->
  {#if activeTab === TABS.TEXT}
  <div class="flex gap-4">
    <div class="flex gap-2 flex-1">
      <button onclick={createNewSession} class="rounded-xl px-4 py-1 border border-b-3 border-blue-300 bg-blue-100 cursor-pointer hover:bg-blue-200 transition-all">New</button>
      <button onclick={namedSession} class="rounded-xl px-4 py-1 border border-b-3 border-blue-300 bg-blue-100 cursor-pointer hover:bg-blue-200 transition-all">Named</button>
    </div>
    <div class="flex gap-2">
      <button onclick={undoText} class="rounded-xl px-4 py-1 border border-b-3 border-neutral-300 bg-neutral-100 cursor-pointer hover:bg-neutral-200 transition-all">
        {@render svgArrow(180)}
      </button>
      <button onclick={redoText} class="rounded-xl px-4 py-1 border border-b-3 border-neutral-300 bg-neutral-100 cursor-pointer hover:bg-neutral-200 transition-all">
        {@render svgArrow(0)}
      </button>
    </div>
  </div>
  {/if}
  
  <!-- Text editor view -->
  <div class="flex-1 {activeTab === TABS.TEXT ? 'block' : 'hidden'}">
    <div bind:this={editorContainer} />
  </div>
  
  <!-- Block view -->
  {#if activeTab === TABS.BLOCKS}
    <div class="flex-1 overflow-y-auto">
      {#if !isContentParsed}
        <!-- Loading indicator for blocks view -->
        <div class="flex justify-center items-center h-64">
          <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      {:else if parsedContent && parsedContent.length > 0}
        <div>
          {#each parsedContent as session}
            <SessionCard {session} />
          {/each}
        </div>
      {:else}
        <div class="flex flex-col items-center justify-center h-64 text-gray-500">
          <p>No training sessions found</p>
          <p class="text-sm">Start by creating a new session in Text Mode</p>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Stats View -->
  {#if activeTab === TABS.STATS}
    <div class="flex-1 overflow-y-auto">
      {#if !isContentParsed}
        <!-- Loading indicator for stats view -->
        <div class="flex justify-center items-center h-64">
          <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      {:else}
        <StatsView sessions={parsedContent || []} />
      {/if}
    </div>
  {/if}
</div>
