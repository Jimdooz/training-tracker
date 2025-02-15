<script lang="ts">
  import {EditorState, EditorSelection, Range} from "@codemirror/state"
  import {drawSelection, EditorView, keymap, Decoration, type DecorationSet, ViewPlugin, ViewUpdate} from "@codemirror/view"
  import {defaultKeymap} from "@codemirror/commands"
  import { onMount } from 'svelte';

  let editorContainer: HTMLDivElement = $state()!;
  let view: EditorView;

  // Définir le style pour le mot "coucou" avec Tailwind
  const kgMark = Decoration.mark({
    class: "text-neutral-500"
  });

  const weightMark = Decoration.mark({
    class: "border px-1 rounded font-bold border-blue-500"
  });

  // Créer un plugin qui recherche et surligne les occurrences de "coucou"
  const coucouHighlighter = ViewPlugin.fromClass(class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.createDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.createDecorations(update.view);
      }
    }

    createDecorations(view: EditorView) {
      const decorations: Range<Decoration>[] = [
        ...this.highlightKg(view),
        ...this.highlightWeight(view)
      ];
      
      // Sort decorations by 'from' position
      decorations.sort((a, b) => a.from - b.from);
      
      return Decoration.set(decorations);
    }

    highlightKg(view: EditorView) {
      const decorations: Range<Decoration>[] = [];
      const text = view.state.doc.toString();
      let match;
      const regex = /kg/g;
      
      while ((match = regex.exec(text)) !== null) {
        const from = match.index;
        const to = from + match[0].length;
        decorations.push(kgMark.range(from, to));
      }

      return decorations;
    }

    highlightWeight(view: EditorView) {
      const decorations: Range<Decoration>[] = [];
      const text = view.state.doc.toString();
      let match;
      const regex = /[0-9]+kg/g;
      
      while ((match = regex.exec(text)) !== null) {
        const from = match.index;
        const to = from + match[0].length;
        decorations.push(weightMark.range(from, to));
      }

      return decorations;
    }
  }, {
    decorations: v => v.decorations
  });

  function createEditor() {
    let myKeyExtension = keymap.of([
      {
        key: "Alt-c",
        run: view => {
          view.dispatch(view.state.replaceSelection("?"))
          return true
        }
      }
    ])
    
    let state = EditorState.create({
      doc: "Hello Training Tracker\ncoucou tout le monde\ncoucou",
      extensions: [
        myKeyExtension,
        keymap.of(defaultKeymap),
        coucouHighlighter,
        // Le EditorView.theme n'est plus nécessaire car on utilise Tailwind
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
    return () => {
      view.destroy();
    }
  });
</script>


<div class="flex flex-col self-center w-full max-w-[800px] flex-1 p-4 pt-16 gap-4">
  <h1 class="text-5xl font-bold">Hello Training Tracker</h1>
  <div bind:this={editorContainer} class="flex-1 shadow rounded-xl border overflow-hidden"></div>
</div>