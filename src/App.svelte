<script lang="ts">
  import {EditorState, EditorSelection, Range} from "@codemirror/state"
  import {drawSelection, EditorView, keymap, Decoration, type DecorationSet, ViewPlugin, ViewUpdate} from "@codemirror/view"
  import {defaultKeymap} from "@codemirror/commands"
  import { onMount } from 'svelte';

  let editorContainer: HTMLDivElement = $state()!;
  let view: EditorView;

  interface HighlightConfig {
    regex: RegExp;
    decoration: Decoration;
    matchGroupName?: string;
  }

  const kgMark = Decoration.mark({
    class: "text-blue-400 font-bold"
  });

  const weightMark = Decoration.mark({ class: "bg-blue-200 text-blue-500 px-1 rounded font-bold border-blue-500" });
  const classAMark = Decoration.mark({ class: "bg-green-200 text-green-500 px-1 rounded font-bold border-green-500" });
  const classBMark = Decoration.mark({ class: "bg-orange-200 text-orange-500 px-1 rounded font-bold border-yellow-500" });
  const classCMark = Decoration.mark({ class: "bg-red-200 text-red-500 px-1 rounded font-bold border-red-500" });

  const highlightConfigs: HighlightConfig[] = [
    { regex: /kg/g, decoration: kgMark },
    { regex: /[0-9]+kg/g, decoration: weightMark },
    { regex: /(?:^|[^\w])(?<M>A[0-9]*(?:\/\d*)*)(?:[^\w]|$)/g, decoration: classAMark, matchGroupName: 'M' },
    { regex: /(?:^|[^\w])(?<M>B[0-9]*(?:\/\d*)*)(?:[^\w]|$)/g, decoration: classBMark, matchGroupName: 'M' },
    { regex: /(?:^|[^\w])(?<M>C[0-9]*(?:\/\d*)*)(?:[^\w]|$)/g, decoration: classCMark, matchGroupName: 'M' },
  ];

  const appHighlighter = ViewPlugin.fromClass(class {
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
      const text = view.state.doc.toString();
      const decorations: Range<Decoration>[] = [];

      highlightConfigs.forEach(config => {
        const matches = this.findMatches(text, config);
        decorations.push(...matches);
      });
      
      decorations.sort((a, b) => a.from - b.from);
      return Decoration.set(decorations);
    }

    findMatches(text: string, config: HighlightConfig): Range<Decoration>[] {
      const decorations: Range<Decoration>[] = [];
      let match;
      
      while ((match = config.regex.exec(text)) !== null) {
        const from = config.matchGroupName 
          ? match.index + 1
          : match.index;
        const to = config.matchGroupName 
          ? from + match.groups![config.matchGroupName].length
          : from + match[0].length;
        
        decorations.push(config.decoration.range(from, to));
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
      doc: "Hello Training Tracker\ncoucou tout le monde\n20kg",
      extensions: [
        myKeyExtension,
        keymap.of(defaultKeymap),
        appHighlighter,
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
  <div bind:this={editorContainer} class="flex-1"></div>
</div>