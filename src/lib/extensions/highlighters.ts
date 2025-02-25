import type { Range } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin, ViewUpdate, type DecorationSet } from "@codemirror/view";

/**
 * Type for RegExp match with indices
 * This extends the standard RegExpExecArray with the indices property
 */
interface RegExpMatchWithIndices extends RegExpExecArray {
    indices?: {
        groups?: Record<string, [number, number]>;
        [index: number]: [number, number];
    };
}

/**
 * Configuration for highlighting with support for multiple named capture groups
 */
interface HighlightConfig {
    /** Regular expression to match text */
    regex: RegExp;
    /** 
     * Decoration for the entire match (legacy support) or
     * map of named capture groups to their respective decorations
     */
    decoration: Decoration | Record<string, Decoration>;
    /** 
     * Optional match group name for legacy single-group highlighting
     * Not needed when using decoration as a Record
     */
    matchGroupName?: string;
}

// Define decorations for different syntax elements
/**
 * Decoration styles for different syntax elements
 */
// For units alone (when they appear without values)
const typeMark = Decoration.mark({ class: "text-blue-400 font-bold" });
// For weights and measurements (including their units)
const weightMark = Decoration.mark({ class: "bg-blue-100 text-blue-500 px-1 rounded font-bold border border-blue-300" });
// For repeat symbols (/)
const sameMark = Decoration.mark({ class: "text-neutral-400" });
// For completion status indicators
const classAMark = Decoration.mark({ class: "bg-green-200 text-green-500 px-1 rounded font-bold border border-green-300" });
const classBMark = Decoration.mark({ class: "bg-orange-200 text-orange-500 px-1 rounded font-bold border border-yellow-500" });
const classCMark = Decoration.mark({ class: "bg-red-200 text-red-500 px-1 rounded font-bold border border-red-300" });
// For date formatting
const dateMark = Decoration.mark({ class: "text-neutral-400 font-bold" });
// For section titles
const titleMark = Decoration.mark({ class: "text-xl font-bold" });
// For repetition patterns
const repMark = Decoration.mark({ class: "text-neutral-500" });
// For units when they appear separate from values
const unitMark = Decoration.mark({ class: "text-cyan-500 font-bold" });

const commentMark = Decoration.mark({ class: "text-neutral-400" });

// Highlight configurations with enhanced multi-group support
const highlightConfigs: HighlightConfig[] = [
    // Simple unit highlighting when units appear alone
    // { regex: /\b(?<M>kg|min|s)\b/gd, decoration: unitMark, matchGroupName: 'M' },

    // Weight or time values with units (combined in one decoration)
    { regex: /\s(?<M>(\/?(-?\d+)(kg|min|s)?)*(\/?(-?\d+)(kg|min|s)))(\s|$)/gd, decoration: weightMark, matchGroupName: 'M' },

    // Specific time formats like 2min30s
    // { regex: /\b(?<M>\d+min\d+s)\b/gd, decoration: weightMark, matchGroupName: 'M' },

    // Separator for repeats
    { regex: /\B(?<M>\/)\B/gd, decoration: sameMark, matchGroupName: 'M' },

    // Class A indicators with values, units and trailing slash
    { regex: /\b(?<M>A\d*(?:\/\d*)*(?:kg|min|s)?(?:\/)?)\b/gd, decoration: classAMark, matchGroupName: 'M' },

    // Class B indicators with values, units and trailing slash
    { regex: /\b(?<M>B((\d+(?:kg|min|s)?)+)?(\/(\d*(?:kg|min|s)?)*)*)\b/gd, decoration: classBMark, matchGroupName: 'M' },

    // Class C indicators with values, units and trailing slash
    { regex: /(?<M>C((\d+(?:kg|min|s)?)+)(\/(\d*(?:kg|min|s)?)*)*)/gd, decoration: classCMark, matchGroupName: 'M' },

    // Date formats
    { regex: /\d{2}\/\d{2}\/\d{4}/gd, decoration: dateMark },
    { regex: /\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/gd, decoration: dateMark },

    // Section titles
    { regex: /# .*/gd, decoration: titleMark },

    // Rep patterns like (3x10)
    { regex: /(?<M>\(.+((x|\*).+)\))/gd, decoration: repMark, matchGroupName: 'M' },


    // Comments between '' and ""
    { regex: /(?<M>'[^']*')/gd, decoration: commentMark, matchGroupName: 'M' },
    { regex: /(?<M>"[^"]*")/gd, decoration: commentMark, matchGroupName: 'M' },
];

/**
 * Custom highlighter for training tracking syntax
 */
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

    /**
     * Find matches for a highlight configuration
     * Supports both legacy single group and new multi-group configurations
     */
    findMatches(text: string, config: HighlightConfig): Range<Decoration>[] {
        const decorations: Range<Decoration>[] = [];
        let match: RegExpMatchWithIndices | null;

        while ((match = config.regex.exec(text) as RegExpMatchWithIndices | null) !== null) {
            // Handle the case where decoration is a mapping of group names to decorations
            if (typeof config.decoration === 'object' && !(config.decoration instanceof Decoration)) {
                // For each named capture group in the regex
                const decorationMap = config.decoration as Record<string, Decoration>;
                Object.entries(match.groups || {}).forEach(([groupName, groupValue]) => {
                    // If we have a decoration for this group and the group has a value
                    if (decorationMap[groupName] && groupValue !== undefined) {
                        // Check if we have indices (requires d flag in regex)
                        if (match.indices?.groups?.[groupName]) {
                            const [from, to] = match.indices.groups[groupName];
                            decorations.push(decorationMap[groupName].range(from, to));
                        } else {
                            // Fallback when indices aren't available: use whole match
                            // This is not ideal, but provides some backward compatibility
                            const from = match.index;
                            const to = from + match[0].length;
                            decorations.push(decorationMap[groupName].range(from, to));
                        }
                    }
                });
            }
            // Legacy case: decoration is a single Decoration instance
            else if (config.decoration instanceof Decoration) {
                const from = match.index;
                let to: number;

                // If a specific match group is specified, use its bounds
                if (config.matchGroupName && match.groups?.[config.matchGroupName] !== undefined) {
                    if (match.indices?.groups?.[config.matchGroupName]) {
                        const [groupFrom, groupTo] = match.indices.groups[config.matchGroupName];
                        decorations.push(config.decoration.range(groupFrom, groupTo));
                        continue;
                    } else {
                        // Fallback when indices aren't available
                        to = from + (match.groups[config.matchGroupName] as string).length;
                        decorations.push(config.decoration.range(from, to));
                        continue;
                    }
                }

                // Otherwise, use the whole match
                to = from + match[0].length;
                decorations.push(config.decoration.range(from, to));
            }
        }

        return decorations;
    }
}, {
    decorations: v => v.decorations
});