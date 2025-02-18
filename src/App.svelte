<script lang="ts">
  import {EditorState, EditorSelection, Range} from "@codemirror/state"
  import {drawSelection, EditorView, keymap, Decoration, type DecorationSet, ViewPlugin, ViewUpdate} from "@codemirror/view"
  import {defaultKeymap, history, historyKeymap} from "@codemirror/commands"
  import { onMount } from 'svelte';
  import { autocompletion, completeFromList, type Completion, type CompletionContext, type CompletionResult } from "@codemirror/autocomplete"
  import { appHighlighter } from "./lib/extensions/highlighters";
  import { dateCompletions } from "./lib/extensions/completions";
    import { parseContent } from "./lib/parsers/mod";

  const STORAGE_KEY = 'training-tracker-content';

  // Load content from localStorage or return default content if empty
  function loadContent(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(STORAGE_KEY) || '# Training Tracker\n\nStart writing here...';
  }

  // Save content to localStorage
  function saveContent(content: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, content);
  }

  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      saveContent(update.state.doc.toString());
    }
  });

  let editorContainer: HTMLDivElement = $state()!;
  let view: EditorView;

  function createEditor() {
    let state = EditorState.create({
      doc: loadContent(),
      extensions: [
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap
        ]),
        history(),
        appHighlighter,
        autocompletion({
          override: [dateCompletions]
        }),
        updateListener,
        EditorView.lineWrapping,
      ]
    });

    let view = new EditorView({
      state,
      parent: editorContainer,
    });

    return view;
  }
  
  onMount(() => {
    view = createEditor();
    console.log(parseContent(view.state.doc.toString()));
    return () => {
      view.destroy();
    }
  });
</script>


<div class="flex flex-col self-center w-full max-w-[800px] flex-1 pt-16 gap-4">
  <h1 class="text-5xl font-bold">Hello Training Tracker</h1>
  <div bind:this={editorContainer} class="flex-1"></div>
</div>