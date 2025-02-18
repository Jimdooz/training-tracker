import type { Range } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin, ViewUpdate, type DecorationSet } from "@codemirror/view";

interface HighlightConfig {
    regex: RegExp;
    decoration: Decoration;
    matchGroupName?: string;
}

const kgMark = Decoration.mark({ class: "text-blue-400 font-bold" });
const weightMark = Decoration.mark({ class: "bg-blue-200 text-blue-500 px-1 rounded font-bold border-blue-500" });
const sameMark = Decoration.mark({ class: "text-neutral-400" });
const classAMark = Decoration.mark({ class: "bg-green-200 text-green-500 px-1 rounded font-bold border-green-500" });
const classBMark = Decoration.mark({ class: "bg-orange-200 text-orange-500 px-1 rounded font-bold border-yellow-500" });
const classCMark = Decoration.mark({ class: "bg-red-200 text-red-500 px-1 rounded font-bold border-red-500" });
const dateMark = Decoration.mark({ class: "text-neutral-400 font-bold" });
const titleMark = Decoration.mark({ class: "text-xl font-bold" });
const repMark = Decoration.mark({ class: "text-blue-400 font-bold" });

const highlightConfigs: HighlightConfig[] = [
    { regex: /kg/g, decoration: kgMark },
    { regex: /\d+(\/\d+)*kg/g, decoration: weightMark },
    { regex: /\B(?<M>\/)\B/g, decoration: sameMark, matchGroupName: 'M' },
    { regex: /\b(?<M>A[0-9]*(?:\/\d*)*)\b/g, decoration: classAMark, matchGroupName: 'M' },
    { regex: /\b(?<M>B[0-9]*(?:\/\d*)*)\b/g, decoration: classBMark, matchGroupName: 'M' },
    { regex: /\b(?<M>C[0-9]*(?:\/\d*)*)\b/g, decoration: classCMark, matchGroupName: 'M' },
    { regex: /\d{2}\/\d{2}\/\d{4}/g, decoration: dateMark },
    { regex: /\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/g, decoration: dateMark },
    { regex: /# .*/g, decoration: titleMark },
    { regex: /(?<M>\(\d+x\d+\))/g, decoration: repMark, matchGroupName: 'M' },
];

export const appHighlighter = ViewPlugin.fromClass(class {
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
            const from = match.index;
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