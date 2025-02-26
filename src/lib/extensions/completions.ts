import type { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import type { TrainingSession, Exercise, Set, Effort } from "../parsers/mod";
import { parseContent } from "../parsers/mod";

export function formatDateTime(date: Date, includeTime: boolean = false): string {
    const dateStr = date.toLocaleDateString('fr-FR');
    if (!includeTime) return dateStr;

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${dateStr} ${hours}:${minutes}`;
}

/**
 * Extract unique exercises from previous sessions
 */
function extractUniqueExercises(content: string): Exercise[] {
    const sessions = parseContent(content);
    const exerciseMap = new Map<string, Exercise>();
    
    for (const session of sessions) {
        for (const exercise of session.exercises) {
            // Keep only the most recent occurrence of each exercise
            exerciseMap.set(exercise.name, exercise);
        }
    }
    
    return Array.from(exerciseMap.values());
}

export function exerciseCompletions(content: string) {
    return (context: CompletionContext): CompletionResult | null => {
        let word = context.matchBefore(/\S+/);
        if (!word) return null;
        if (word.from == word.to && !context.explicit) return null;

        const exercises = extractUniqueExercises(content);
        
        return {
            from: word.from,
            options: exercises.map(exercise => ({
                label: exercise.name,
                detail: `${exercise.targetSets}x${
                    exercise.target.type === 'reps' 
                        ? exercise.target.count 
                        : `${exercise.target.duration.value}${exercise.target.duration.unit}`
                }`,
                apply: `${exercise.name} (${exercise.targetSets}x${
                    exercise.target.type === 'reps' 
                        ? exercise.target.count 
                        : `${exercise.target.duration.value}${exercise.target.duration.unit}`
                }):`
            }))
        };
    };
}

export function dateCompletions(context: CompletionContext): CompletionResult | null {
    let word = context.matchBefore(/@\w*/);
    if (!word) return null;
    if (word.from == word.to && !context.explicit) return null;

    const today = new Date();

    return {
        from: word.from,
        options: [
            {
                label: "@Date",
                detail: "Date du jour",
                apply: formatDateTime(today)
            },
            {
                label: "@Datetime",
                detail: "Date et heure",
                apply: formatDateTime(today, true)
            }
        ]
    };
}

/**
 * Find sessions with titles that match the given prefix
 */
function findSessionsByTitlePrefix(content: string, prefix: string): TrainingSession[] {
    const sessions = parseContent(content);
    // Get sessions that match the prefix, case insensitive
    return sessions.filter(s => 
        s.title && s.title.toLowerCase().includes(prefix.toLowerCase()));
}

/**
 * Options for session stringification
 */
export interface StringifySessionOptions {
    includeDate?: boolean;
    includeComments?: boolean;
    keepMostRecentWeights?: boolean;
}

/**
 * Stringify a training session into a markdown format
 */
export function stringifySession(session: TrainingSession, options: StringifySessionOptions = {}): string {
    const {
        includeDate = false,
        includeComments = true,
        keepMostRecentWeights = true
    } = options;
    
    let result = `# ${session.title}\n`;
    
    // Add date if requested and available
    if (includeDate && session.date) {
        result += `${formatDateTime(new Date(session.date))}\n`;
    } else {
        result += `${formatDateTime(new Date())}\n`;
    }
    
    // Add session comment if available and requested
    if (includeComments && session.comment) {
        result += `${session.comment}\n`;
    }
    
    // Add exercises
    for (const exercise of session.exercises) {
        result += `${exercise.name} (${exercise.targetSets}x${
            exercise.target.type === 'reps' 
                ? exercise.target.count 
                : `${exercise.target.duration.value}${exercise.target.duration.unit}`
        })`;
        
        // Add exercise comment if available and requested
        if (includeComments && exercise.comment) {
            result += ` '${exercise.comment}'`;
        }
        
        result += `:\n`;
        
        // If we're keeping most recent weights, we'll only add empty set placeholders
        if (keepMostRecentWeights && exercise.sets.length > 0) {
            // Get the most recent set with weights
            const mostRecentSet = [...exercise.sets]
                .find(s => s.efforts.some(e => e.load !== null));
                
            if (mostRecentSet) {
                // For each target set, add a placeholder with the most recent weights
                for (let i = 0; i < exercise.targetSets; i++) {
                    result += `  - `;
                    
                    if (i == 0) {
                        // Add efforts from the most recent set
                        const effortsStr = mostRecentSet.efforts.map(effort => {
                            if (effort.load) {
                                return `${effort.load.value}${effort.load.unit || ''} `;
                            }
                            return '';
                        }).filter(Boolean).join(' / ');

                        if (effortsStr) {
                            result += effortsStr;
                        }
                    }
                    
                    result += `\n`;
                }
            } else {
                // If no sets with weights found, add empty placeholders
                for (let i = 0; i < exercise.targetSets; i++) {
                    result += `  - \n`;
                }
            }
        } else {
            // Add empty set placeholders
            for (let i = 0; i < exercise.targetSets; i++) {
                result += `  - \n`;
            }
        }
    }
    
    // Add separator
    result += `--------\n\n`;
    
    return result;
}

/**
 * Provide completions for session titles
 */
export function sessionTitleCompletions(content: string) {
    return (context: CompletionContext): CompletionResult | null => {
        // Match when user is typing a title (starting with # and some text)
        const titleMatch = context.matchBefore(/# [^\n]*/);
        if (!titleMatch) return null;
        
        // Extract the text after # as the prefix
        const prefix = titleMatch.text.substring(2);
        
        // Find sessions with titles that match the prefix
        const matchingSessions = findSessionsByTitlePrefix(content, prefix);
        if (!matchingSessions.length) return null;
        
        return {
            from: titleMatch.from + 2, // +2 to skip the "# "
            options: matchingSessions.map(session => ({
                label: session.title || "Unnamed Session",
                detail: session.exercises.length > 0 ? 
                    `${session.exercises.length} exercises` : 
                    "Empty session",
                apply: (view, completion, from, to) => {
                    // When selected, replace the current line with the stringified session
                    const stringified = stringifySession(session, { 
                        keepMostRecentWeights: true 
                    });
                    
                    // Find the start of the line
                    const line = view.state.doc.lineAt(from - 2); // -2 to include the "# "
                    
                    // Replace the entire line with the stringified session
                    view.dispatch({
                        changes: {
                            from: line.from,
                            to: line.to,
                            insert: stringified.trim()
                        }
                    });

                    // Move the cursor to the first exercise set line end
                    const firstExerciseLine = view.state.doc.lineAt(line.from + stringified.indexOf('- '));
                    view.dispatch({
                        selection: {
                            anchor: firstExerciseLine.to
                        }
                    });
                }
            }))
        };
    };
}