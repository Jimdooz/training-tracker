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
  import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
  import { onMount } from "svelte";
  import {
    autocompletion,
    completeFromList,
    type Completion,
    type CompletionContext,
    type CompletionResult,
  } from "@codemirror/autocomplete";
  import { appHighlighter } from "./lib/extensions/highlighters";
  import { dateCompletions, exerciseCompletions, formatDateTime } from "./lib/extensions/completions";
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
            (context: CompletionContext) => exerciseCompletions(view?.state.doc.toString() || "")(context)
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

  function createNewSession() {
    const date = formatDateTime(new Date());
    const session = `# Session\n${date}\n- \n--------\n\n`;
    // Add new session at the start of the document
    view.dispatch({
      changes: { from: 0, to: 0, insert: session },
      selection: EditorSelection.single(0),
    });
    // Focus the editor after creating a new session at the '-' line and move the cursor to the end of the line
    view.focus();
    const newPosition = view.state.doc.lineAt(`# Session\n${date}\n-`.length + 1).to;
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

<div class="flex flex-col self-center w-full max-w-[800px] p-2 flex-1 pt-8 lg:pt-16 gap-4">
  <h1 class="text-5xl font-bold">Training tracker</h1>
  <div class="flex gap-2">
    <button onclick={createNewSession} class="rounded-full px-4 py-1 border border-blue-300 bg-blue-100">New Session</button>
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
