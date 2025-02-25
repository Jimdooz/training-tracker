import type { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import type { TrainingSession, Exercise } from "../parsers/mod";
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