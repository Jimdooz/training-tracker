import type { CompletionContext, CompletionResult } from "@codemirror/autocomplete";


function formatDateTime(date: Date, includeTime: boolean = false): string {
    const dateStr = date.toLocaleDateString('fr-FR');
    if (!includeTime) return dateStr;

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${dateStr} ${hours}:${minutes}`;
}

export function dateCompletions(context: CompletionContext): CompletionResult | null {
    let word = context.matchBefore(/@\w*/)
    if (!word) return null
    if (word.from == word.to && !context.explicit) return null

    const today = new Date()

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
    }
}