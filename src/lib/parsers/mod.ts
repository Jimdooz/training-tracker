type Session = {
    title: string,
    date: Date,
    comment: string,
    exercises: Exercise[],
}

type ResistanceType = 'kg';

type Exercise = {
    name: string,
    comment: string,
    objective: ExerciceObjective,
    sets: ExerciceSet[],
}

type ExerciceObjective = {
    reps: number,
    resistance: number,
    type: ResistanceType, 
}

type ExerciceSet = {
    efforts: ExerciceEffort[],
}

type ExerciceEffort = {
    reps: number,
    resistance: number,
    type: ResistanceType, 
}

function extractSessions(content: string): string[] {
    const sessions: string[] = [];
    const lines = content.split('\n');
    let currentSession: string[] = [];

    let pushCurrentSession = () => {
        if (!currentSession.length) return;
        sessions.push(currentSession.join('\n').trim());
        currentSession = [];
    }

    for (const line of lines) {
        if (line.startsWith('---')) {
            pushCurrentSession();
            continue;
        } else if (line.startsWith('#')) {
            pushCurrentSession();
        }
        currentSession.push(line);
    }

    if (currentSession.length > 0) {
        sessions.push(currentSession.join('\n').trim());
    }

    return sessions;
}

export function parseContent(content: string) {
    const sessionsChunks = extractSessions(content);
    console.log(sessionsChunks);
}