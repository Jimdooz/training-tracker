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

  const STORAGE_KEY = "training-tracker-content";

  let parsedContent: ReturnType<typeof parseContent> | null = $state(null);

  // Load content from localStorage or return default content if empty
  function loadContent(): string {
    if (typeof window === "undefined") return "";
    return (
      localStorage.getItem(STORAGE_KEY) ||
      "# Training Tracker\n\nStart writing here..."
    );
  }

  // Save content to localStorage
  function saveContent(content: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, content);
  }

  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      const content = update.state.doc.toString();
      parseContent(content);
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

  onMount(() => {
    view = createEditor();
    parsedContent = parseContent(view.state.doc.toString());
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

<div class="flex flex-col self-center w-full max-w-[800px] p-2 flex-1 pt-8 lg:pt-16 gap-4">
  <h1 class="text-5xl font-bold">Training tracker</h1>
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
  <!-- {#if parsedContent}
    {#each parsedContent as session}
      <div class="flex flex-col p-2 rounded shadow border">
        <div class="flex flex-col">
          {#if session.title}
            <h3 class="font-bold">{session.title || "Empty :{"}</h3>
          {/if}
          {#if session.date}
            <p>{new Date(session.date).toLocaleDateString()}</p>
          {/if}
        </div>
        <div class="flex flex-col">
          {#each session.exercises as exercise}
            <div class="flex flex-col gap-1">
              <p>
                {exercise.name}
                <span class="text-sm text-gray-500"
                  >({exercise.targetSets}x{exercise.target.type == "reps"
                    ? exercise.target.count
                    : `${exercise.target.duration.value}${exercise.target.duration.unit}`})</span
                >
              </p>
              {#each exercise.sets as set}
                <div class="flex gap-2 text-xs">
                  {#each set.efforts as effort}
                    <div class="flex flex-col gap-1">
                      <p>- {effort.load?.value}{effort.load?.unit} {effort.result.state}{effort.result.count}</p>
                    </div>
                  {/each}
                </div>
              {/each}
            </div>
          {/each}
        </div>
      </div>
    {/each}
  {/if} -->
  <div bind:this={editorContainer} class="flex-1"></div>
</div>
