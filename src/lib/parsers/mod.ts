type Session = {
    title: string,
    date?: Date,
    comment: string,
    exercises: Exercise[],
}

type ResistanceType = 'kg';

type Exercise = {
    name: string,
    comment: string,
    objective: exerciseObjective,
    sets: exerciseSet[],
}

type exerciseObjective = {
    quantity: Quantity,
    resistance: Resistance,
}

type Quantity = {
    type: 'reps' | 'time',
    value: number,
}

type Resistance = {
    type: ResistanceType,
    value: number,
}

type exerciseSet = {
    efforts: exerciseEffort[],
}

type exerciseEffort = {
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

type ExplorationState = EmptyState | ExerciseState;

type EmptyState = {
    type: 'empty',
}

type ExerciseState = {
    type: 'exercise',
    name: string,
    objective: string,
    sets: string[],
}

function parseSession(session: string) {
    const lines = session.split('\n');
    const content: Session = {
        title: '',
        comment: '',
        exercises: [],
    }

    let state: ExplorationState = {
        type: 'empty',
    }

    function treatState(state: ExplorationState) : ExplorationState {
        switch (state.type) {
            case 'exercise':
                console.log(state);
                const set = state.sets.map(set => set.trim()).map(set => {
                    const [parmA, paramB, ...rest] = set.split(' ');
                    return {
                    }
                })
                console.log(set)
                break;
            default:
        }

        return { type: 'empty' };
    }

    function newState(oldState: ExplorationState, newState: ExplorationState) {
        treatState(oldState);
        return newState;
    }

    for (const line of lines) {
        // Check title
        if (!content.title && line.startsWith('#')) {
            content.title = line.replace('#', '').trim();
            continue;
        } 

        // Check date dd/mm/yyyy
        const dateMatch = line.match(/\d{2}\/\d{2}\/\d{4}/);
        const dateTimeMatch = line.match(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
        if (dateTimeMatch) {
            const [date, time] = dateTimeMatch[0].split(' ');
            const [day, month, year] = date.split('/');
            const [hours, minutes] = time.split(':');
            content.date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
            continue;
        } else if (dateMatch) {
            const [day, month, year] = dateMatch[0].split('/');
            content.date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            continue;
        }

        // Check comment
        // @TODO

        // Check exercise
        const exerciseMatch = /(?<EXERCICE>.*) \((?<OBJECTIVE>.*)\).*:(?<SET>.*)?/gm.exec(line);
        if (exerciseMatch) {
            state = newState(state, {
                type: 'exercise',
                name: exerciseMatch.groups!.EXERCICE,
                objective: exerciseMatch.groups!.OBJECTIVE,
                sets: exerciseMatch.groups!.SET?.split(',') ?? [],
            });
            continue;
        }

        if (state.type === 'exercise') {
            if (line.trim().startsWith('-')) {
                state.sets.push(...line.trim().replace('-', '').trim().split(','));
                continue;
            } else {
                state = treatState(state);
            }
        }
    }

    state = treatState(state);

    return content;
}

export function parseContent(content: string) {
    const sessionsChunks = extractSessions(content);
    const sessions = sessionsChunks.map(parseSession);
    console.log(sessions);
}