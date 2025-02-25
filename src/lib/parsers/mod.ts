// Types and interfaces for data structure
export type TimeUnit = 's' | 'min' | '';
export type LoadUnit = 'kg' | '';
export type CompletionState = 'A' | 'B' | 'C' | '';

// Numeric value with unit (for time or load)
export interface ValueWithUnit<T extends string> {
    value: number;
    unit: T;
}

export type TimeValue = ValueWithUnit<TimeUnit>;
export type LoadValue = ValueWithUnit<LoadUnit>;

// A result can be measured in time or repetitions
export type EffortResult =
    | { type: 'reps'; count: number; state: CompletionState }
    | { type: 'time'; duration: TimeValue; state: CompletionState };

// Represents an individual effort (a load with a result)
export interface Effort {
    load: LoadValue | null;  // Can be null (e.g., plank without weight)
    result: EffortResult;
    isRepeat?: boolean;      // Indicates if it's a repeat "/"
}

// Represents a training set (can be composed of multiple efforts)
export interface Set {
    efforts: Effort[];
    comment?: string;
}

// Type of target (based on repetitions or time)
export type TargetType =
    | { type: 'reps'; count: number }
    | { type: 'time'; duration: TimeValue };

// Represents a complete exercise
export interface Exercise {
    name: string;
    targetSets: number;
    target: TargetType;
    sets: Set[];
    comment?: string;
}

// Represents a training session
export interface TrainingSession {
    title: string;
    date: Date | null;
    exercises: Exercise[];
    comment?: string;
}

/**
 * Parse full content to extract training sessions
 */
export function parseContent(content: string): TrainingSession[] {
    // Split directly by section titles to handle cases with multiple "#"
    const sections: string[] = [];
    let currentSection: string[] = [];

    const lines = content.split('\n');

    // Process each line
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // If we find a title and we already started a section, close current section
        if (line.startsWith('# ') && currentSection.length > 0) {
            sections.push(currentSection.join('\n'));
            currentSection = [line];
        }
        // If we find a title and we don't have a section yet, start a new one
        else if (line.startsWith('# ')) {
            currentSection = [line];
        }
        // If we find a separator ---, close current section and start a new one
        else if (line.match(/^---+$/)) {
            if (currentSection.length > 0) {
                sections.push(currentSection.join('\n'));
                currentSection = [];
            }
        }
        // Otherwise, just add the line to current section
        else {
            currentSection.push(line);
        }
    }

    // Don't forget the last section
    if (currentSection.length > 0) {
        sections.push(currentSection.join('\n'));
    }

    // Filter empty sections and parse each section
    return sections
        .filter(section => section.trim())
        .map(parseSession);
}

/**
 * Parse an individual session
 */
function parseSession(sessionText: string): TrainingSession {
    const lines = sessionText.split('\n');
    const session: TrainingSession = {
        title: '',
        date: null,
        exercises: [],
        comment: ''
    };

    // Look for the title (starts with #)
    const titleLine = lines.find(line => line.trim().startsWith('# '));
    if (titleLine) {
        session.title = titleLine.trim().substring(2).trim();
    }

    // Look for the date (format DD/MM/YYYY or DD/MM/YYYY HH:MM)
    const dateLine = lines.find(line => {
        const trimmed = line.trim();
        return /^\d{2}\/\d{2}\/\d{4}(\s+\d{2}:\d{2})?$/.test(trimmed);
    });

    if (dateLine) {
        const dateMatch = dateLine.trim().match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
        if (dateMatch) {
            const [_, day, month, year, hours, minutes] = dateMatch;
            if (hours && minutes) {
                session.date = new Date(
                    parseInt(year),
                    parseInt(month) - 1,
                    parseInt(day),
                    parseInt(hours),
                    parseInt(minutes)
                );
            } else {
                session.date = new Date(
                    parseInt(year),
                    parseInt(month) - 1,
                    parseInt(day)
                );
            }
        }
    }

    // Extract exercises
    let currentExercise: Exercise | null = null;
    let inListMode = false;
    let listItems: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Ignore empty lines, title, and date
        if (!line || line.startsWith('# ') || /^\d{2}\/\d{2}\/\d{4}(\s+\d{2}:\d{2})?$/.test(line)) {
            continue;
        }

        // Look for exercise definitions (takes into account x and *)
        const exerciseMatch = line.match(/^(.+?)\s*\((\d+)[\*x]([^)]+)\)\s*:?(.*)$/);
        if (exerciseMatch) {
            // If we had an ongoing exercise and were in list mode, process the items
            if (currentExercise && inListMode && listItems.length > 0) {
                processListItems(currentExercise, listItems);
                listItems = [];
            }

            // Create a new exercise
            const [_, name, targetSetsStr, targetStr, setsDetailsStr] = exerciseMatch;
            currentExercise = {
                name: name.trim(),
                targetSets: parseInt(targetSetsStr),
                target: parseTarget(targetStr.trim()),
                sets: []
            };

            // Add the exercise to the session
            session.exercises.push(currentExercise);

            // Process set details if they are on the same line
            if (setsDetailsStr.trim()) {
                const setDetails = setsDetailsStr.split(',').map(s => s.trim()).filter(Boolean);
                setDetails.forEach(detail => {
                    const set = parseSet(detail, currentExercise!.target);
                    if (set) {
                        currentExercise!.sets.push(set);
                    }
                });
            }

            inListMode = false;
            continue;
        }

        // Handle lists
        if (line.startsWith('-') && currentExercise) {
            inListMode = true;
            listItems.push(line.substring(1).trim());
            continue;
        }

        // If we are in a list and the line does not start with -, 
        // check if it's a new exercise
        if (inListMode && currentExercise) {
            // First process accumulated list items
            if (listItems.length > 0) {
                processListItems(currentExercise, listItems);
                listItems = [];
            }

            // Check if it's a new exercise
            const newExerciseMatch = line.match(/^(.+?)\s*\((\d+)[\*x]([^)]+)\).*$/);
            if (newExerciseMatch) {
                i--; // Go back to process this line in the next iteration
                inListMode = false;
                continue;
            }
        }
    }

    // Process any remaining list items
    if (currentExercise && inListMode && listItems.length > 0) {
        processListItems(currentExercise, listItems);
    }

    // Post-processing: resolve repeats "/"
    for (const exercise of session.exercises) {
        processRepeatEfforts(exercise);
    }

    return session;
}

/**
 * Process efforts marked as repeats (/) to copy values from previous set
 */
function processRepeatEfforts(exercise: Exercise): void {
    if (!exercise.sets || exercise.sets.length <= 1) return;

    // For each set starting from the second one
    for (let i = 1; i < exercise.sets.length; i++) {
        const currentSet = exercise.sets[i];
        const prevSet = exercise.sets[i - 1];

        // Process efforts of the current set
        for (let j = 0; j < currentSet.efforts.length; j++) {
            const effort = currentSet.efforts[j];

            // If it's an effort marked as repeat
            if (effort.isRepeat) {
                // Copy values from the previous set if available
                if (j < prevSet.efforts.length) {
                    const prevEffort = prevSet.efforts[j];

                    // Copy the load
                    effort.load = prevEffort.load ? { ...prevEffort.load } : null;

                    // For results of type "reps"
                    if (prevEffort.result.type === 'reps' && effort.result.type === 'reps') {
                        if (effort.result.state === '') {
                            // If no state specified, copy the state as well
                            effort.result = {
                                type: 'reps',
                                count: prevEffort.result.count,
                                state: prevEffort.result.state
                            };
                        } else if (effort.result.state === 'C' && effort.result.count === 0) {
                            // If state C without value, keep the state but set count to 0
                            effort.result = {
                                type: 'reps',
                                count: 0,
                                state: effort.result.state
                            };
                        }
                        // If state A or B, we already defined the correct value in parseEffort
                    }

                    // For results of type "time"
                    else if (prevEffort.result.type === 'time' && effort.result.type === 'time') {
                        if (effort.result.state === '') {
                            // If no state specified, copy the state and duration
                            effort.result = {
                                type: 'time',
                                duration: { ...prevEffort.result.duration },
                                state: prevEffort.result.state
                            };
                        } else if (effort.result.state === 'C' && effort.result.duration.value === 0) {
                            // If state C without value, keep the state but set duration to 0
                            effort.result = {
                                type: 'time',
                                duration: { value: 0, unit: prevEffort.result.duration.unit },
                                state: effort.result.state
                            };
                        }
                        // If state A or B, we already defined the correct value in parseEffort
                    }

                    // Mark as non-repeat after copying
                    effort.isRepeat = false;
                } else {
                    // If no corresponding effort in the previous set, use default values
                    // based on the exercise target
                    if (exercise.target.type === 'reps' && effort.result.type === 'reps') {
                        if (effort.result.state === 'A' || effort.result.state === 'B') {
                            effort.result.count = exercise.target.count;
                        }
                    } else if (exercise.target.type === 'time' && effort.result.type === 'time') {
                        if (effort.result.state === 'A' || effort.result.state === 'B') {
                            effort.result.duration = { ...exercise.target.duration };
                        }
                    }
                }
            }
        }
    }
}

/**
 * Process list items for an exercise
 */
function processListItems(exercise: Exercise, items: string[]): void {
    items.forEach(item => {
        // First extract the global comment if any
        let comment = '';
        const commentMatch = item.match(/'([^']+)'/);
        if (commentMatch) {
            comment = commentMatch[1];
            item = item.replace(commentMatch[0], '').trim();
        }

        // Check if the line contains multiple sets separated by commas
        if (item.includes(',')) {
            // Split by comma and process each part as a distinct set
            const setStrings = item.split(',').map(s => s.trim()).filter(Boolean);

            // Parse each set separately
            setStrings.forEach((setStr, index) => {
                // Check for special cases like "/ C7"
                if (setStr.match(/^\s*\/\s+[ABC]/)) {
                    const efforts = parseEffort(setStr, exercise.target);
                    if (efforts && efforts.length > 0) {
                        const setWithComment = {
                            efforts,
                            comment: index === setStrings.length - 1 ? comment : undefined
                        };
                        exercise.sets.push(setWithComment);
                    }
                } else {
                    // Create a set with or without comment
                    const setWithComment = {
                        efforts: [],
                        comment: index === setStrings.length - 1 ? comment : undefined
                    };

                    // Parse the effort
                    const efforts = parseEffort(setStr, exercise.target);
                    if (efforts && efforts.length > 0) {
                        setWithComment.efforts = efforts;
                        exercise.sets.push(setWithComment);
                    }
                }
            });
        } else {
            // Standard case: a single set per line
            const set = parseSet(item, exercise.target);
            if (set) {
                // Add the comment if any
                if (comment) {
                    set.comment = comment;
                }
                exercise.sets.push(set);
            }
        }
    });
}

/**
 * Parse a target (repetitions or time)
 */
function parseTarget(targetStr: string): TargetType {
    targetStr = targetStr.trim();

    // Check if it's a time target
    const timeMatch = targetStr.match(/^(\d+)(min|s)$/);
    if (timeMatch) {
        const [_, valueStr, unit] = timeMatch;
        return {
            type: 'time',
            duration: {
                value: parseInt(valueStr),
                unit: unit as TimeUnit
            }
        };
    }

    // By default, it's a repetitions target
    return {
        type: 'reps',
        count: parseInt(targetStr) || 0
    };
}

/**
 * Parse an individual set
 */
function parseSet(setStr: string, target?: TargetType): Set | null {
    setStr = setStr.trim();
    if (!setStr) return null;

    // Handle cases of comments
    let comment = '';
    const commentMatch = setStr.match(/'([^']+)'/);
    if (commentMatch) {
        comment = commentMatch[1];
        setStr = setStr.replace(commentMatch[0], '').trim();
    }

    // If the string contains commas, we need to determine if it's:
    // 1. A drop set with completion states (like "10/5kg C7/5")
    // 2. Multiple distinct sets separated by commas (like "100kg A, /, /")

    // Check if we have commas that are not inside a drop set pattern
    if (setStr.includes(',')) {
        // First check if it's distinct sets
        // Typically, if there's a '/' alone between commas, it's distinct sets
        if (setStr.match(/,\s*\/\s*,/) || setStr.match(/,\s*\/\s*$/) || setStr.match(/^\s*\/\s*,/)) {
            // It's likely distinct sets, we only process the first one here
            const parts = setStr.split(',');
            const firstPart = parts[0].trim();

            // Recursively parse the first set without the others
            return parseSet(firstPart, target);
        }
    }

    // At this point, we are dealing with either a single set or a drop set (like "10/5kg C7/5")
    const set: Set = {
        efforts: [],
        comment: comment || undefined
    };

    // Parse the effort or efforts
    const efforts = parseEffort(setStr, target);
    if (efforts && efforts.length > 0) {
        set.efforts.push(...efforts);
    }

    return set.efforts.length > 0 ? set : null;
}

/**
 * Parse an individual effort or a group of efforts (drop sets)
 * Returns an array of efforts to handle drop sets
 */
function parseEffort(effortStr: string, target?: TargetType): Effort[] | null {
    effortStr = effortStr.trim();

    // Ignore empty strings
    if (!effortStr) return null;

    // Special case: repeat with completion state (like "/ C7")
    const repeatWithStateMatch = effortStr.match(/^\s*\/\s+([ABC])(\d*[a-z0-9]*)?/);
    if (repeatWithStateMatch) {
        const state = repeatWithStateMatch[1] as CompletionState;
        const completionValue = repeatWithStateMatch[2] || '';

        // Create a repeat effort with the specified state
        let result: EffortResult;

        if (state === 'C' && /^\d+$/.test(completionValue)) {
            // For C with a numeric value
            if (target?.type === 'time') {
                result = {
                    type: 'time',
                    duration: {
                        value: parseInt(completionValue),
                        unit: 's' as TimeUnit
                    },
                    state
                };
            } else {
                result = {
                    type: 'reps',
                    count: parseInt(completionValue),
                    state
                };
            }
        } else if (state === 'C' && completionValue.includes('s') || completionValue.includes('min')) {
            // For C with a time value
            const timeMatch = completionValue.match(/(\d+)(min|s)(\d+)?(s)?/);
            if (timeMatch) {
                const minutes = timeMatch[1] && timeMatch[2] === 'min' ? parseInt(timeMatch[1]) : 0;
                const seconds = timeMatch[3] ? parseInt(timeMatch[3]) :
                    (timeMatch[2] === 's' ? parseInt(timeMatch[1]) : 0);

                result = {
                    type: 'time',
                    duration: {
                        value: minutes * 60 + seconds,
                        unit: 's' as TimeUnit
                    },
                    state
                };
            } else {
                // Default value if the format is incorrect
                result = {
                    type: target?.type === 'time' ? 'time' : 'reps',
                    ...(target?.type === 'time' ? {
                        duration: { value: 0, unit: 's' as TimeUnit }
                    } : { count: 0 }),
                    state
                };
            }
        } else {
            // For other states (A, B)
            result = {
                type: target?.type === 'time' ? 'time' : 'reps',
                ...(target?.type === 'time' ? {
                    duration: {
                        value: target.type === 'time' ? target.duration.value : 0,
                        unit: target.type === 'time' ? target.duration.unit : 's' as TimeUnit
                    }
                } : {
                    count: target?.type === 'reps' ? target.count : 0
                }),
                state
            };
        }

        return [{
            load: null,
            result,
            isRepeat: true
        }];
    }

    // Special case: repeat from previous set without specified state
    if (effortStr === '/') {
        return [{
            load: null,
            result: {
                type: target?.type === 'time' ? 'time' : 'reps',
                ...(target?.type === 'time' ? {
                    duration: {
                        value: 0,
                        unit: (target.duration.unit as TimeUnit) || 's'
                    }
                } : { count: 0 }),
                state: '' as CompletionState
            },
            isRepeat: true
        }];
    }

    // Analyze if we have a complex drop set (multiple weights)
    if (effortStr.includes('/')) {
        // Check if it's a drop set with completion notation
        const completionMatch = effortStr.match(/^(.*?)\s*([ABC])(.*)$/);

        if (completionMatch) {
            const [_, resistancePart, stateStr, completionPart] = completionMatch;
            const state = stateStr as CompletionState;

            // Check if we have a drop set of resistances
            const resistances = resistancePart.split('/').map(r => r.trim()).filter(Boolean);

            // Check the format of the completion part
            let completions: string[] = [];

            // If the completion part contains /, it's a drop set of completion
            if (completionPart && completionPart.includes('/')) {
                completions = completionPart.split('/').map(c => c.trim()).filter(c => c !== '');
            } else if (completionPart) {
                // Otherwise, it's a single completion value
                completions = [completionPart.trim()];
            }

            // Create efforts for the drop set
            const efforts: Effort[] = [];

            // Calculate how many repetitions are left after the specified completions
            let remainingReps = 0;
            if (target && target.type === 'reps') {
                const totalCompletionReps = completions
                    .filter(c => /^\d+$/.test(c))
                    .reduce((sum, c) => sum + parseInt(c), 0);
                remainingReps = (target as any).count - totalCompletionReps;
            }

            // Create an effort for each resistance
            for (let i = 0; i < resistances.length; i++) {
                const resistance = resistances[i];

                // Extract the load
                let load: LoadValue | null = null;
                const loadMatch = resistance.match(/(\d+)(?:kg)?/);
                if (loadMatch) {
                    load = {
                        value: parseInt(loadMatch[1]),
                        unit: 'kg'
                    };
                }

                // Determine the result
                let result: EffortResult;

                // If we have a completion for this resistance
                if (i < completions.length) {
                    const completion = completions[i];

                    // Check if it's a simple numeric value
                    if (/^\d+$/.test(completion)) {
                        result = {
                            type: 'reps',
                            count: parseInt(completion),
                            state
                        };
                    } else if (completion.includes('min') || completion.includes('s')) {
                        // Case of time
                        const timeMatch = completion.match(/(\d+)(min|s)(\d+)?(s)?/);
                        if (timeMatch) {
                            const minutes = timeMatch[1] && timeMatch[2] === 'min' ? parseInt(timeMatch[1]) : 0;
                            const seconds = timeMatch[3] ? parseInt(timeMatch[3]) :
                                (timeMatch[2] === 's' ? parseInt(timeMatch[1]) : 0);

                            const totalSeconds = minutes * 60 + seconds;
                            result = {
                                type: 'time',
                                duration: {
                                    value: totalSeconds,
                                    unit: 's'
                                },
                                state
                            };
                        } else {
                            // Default case
                            result = {
                                type: 'reps',
                                count: 0, // To be determined by context
                                state
                            };
                        }
                    } else {
                        // Default case
                        result = {
                            type: 'reps',
                            count: 0, // To be determined by context
                            state
                        };
                    }
                } else if (i === resistances.length - 1 && completions.length < resistances.length && remainingReps > 0) {
                    // Last effort with remaining repetitions
                    result = {
                        type: 'reps',
                        count: remainingReps,
                        state
                    };
                } else {
                    // No specified completion
                    result = {
                        type: 'reps',
                        count: 0, // To be determined by context
                        state
                    };
                }

                efforts.push({
                    load,
                    result
                });
            }

            return efforts;
        } else {
            // Drop set without completion notation (just multiple weights)
            const resistances = effortStr.split('/').map(r => r.trim()).filter(Boolean);

            return resistances.map(resistance => {
                // Extract the load
                let load: LoadValue | null = null;
                const loadMatch = resistance.match(/(\d+)(?:kg)?/);
                if (loadMatch) {
                    load = {
                        value: parseInt(loadMatch[1]),
                        unit: resistance.includes('kg') ? 'kg' : ''
                    };
                }

                // Extract the state if it exists
                let state: CompletionState = '' as CompletionState;
                const stateMatch = resistance.match(/([ABC])/);
                if (stateMatch) {
                    state = stateMatch[1] as CompletionState;
                }

                return {
                    load,
                    result: {
                        type: 'reps',
                        count: 0, // To be determined by context
                        state
                    }
                };
            });
        }
    }

    // Standard case - single effort

    // Analyze completion state (A, B, C)
    let state: CompletionState = '' as CompletionState;
    let completionValue: string = '';

    const stateMatch = effortStr.match(/([ABC])(\d*[a-z0-9]*)?/);
    if (stateMatch) {
        state = stateMatch[1] as CompletionState;
        completionValue = stateMatch[2] || '';
        // Remove the state part to isolate the load
        effortStr = effortStr.replace(stateMatch[0], '').trim();
    }

    // Analyze load (e.g., "10kg")
    let load: LoadValue | null = null;
    const loadMatch = effortStr.match(/(\d+)(?:kg)?/);
    if (loadMatch && effortStr) {
        load = {
            value: parseInt(loadMatch[1]),
            unit: effortStr.includes('kg') ? 'kg' : ''
        };
    }

    // Determine result type (reps or time) based on target
    let result: EffortResult;

    // If the state is C and there is a value, check if it's time
    if (state === 'C' && completionValue) {
        const timeMatch = completionValue.match(/(\d+)(min|s)(\d+)?(s)?/);
        if (timeMatch) {
            // Format like "C1min30s" or "C30s"
            const minutes = timeMatch[1] && timeMatch[2] === 'min' ? parseInt(timeMatch[1]) : 0;
            const seconds = timeMatch[3] ? parseInt(timeMatch[3]) :
                (timeMatch[2] === 's' ? parseInt(timeMatch[1]) : 0);

            const totalSeconds = minutes * 60 + seconds;
            result = {
                type: 'time',
                duration: {
                    value: totalSeconds,
                    unit: 's'
                },
                state
            };
            return [{ load, result }];
        }
    }

    // If it's state A (complete success), use the exercise target
    if (state === 'A' && target) {
        if (target.type === 'reps') {
            result = {
                type: 'reps',
                count: target.count, // Use the repetitions target
                state
            };
        } else if (target.type === 'time') {
            result = {
                type: 'time',
                duration: {
                    value: target.duration.value,
                    unit: target.duration.unit
                },
                state
            };
        } else {
            // Default case if for some reason the target is not defined correctly
            result = {
                type: 'reps',
                count: 0,
                state
            };
        }
        return [{ load, result }];
    }

    // For other states (B, C without value)
    if (state === 'B' && target) {
        // For B, we also consider it a complete success but with difficulty
        if (target.type === 'reps') {
            result = {
                type: 'reps',
                count: target.count,
                state
            };
        } else if (target.type === 'time') {
            result = {
                type: 'time',
                duration: {
                    value: target.duration.value,
                    unit: target.duration.unit
                },
                state
            };
        } else {
            result = {
                type: 'reps',
                count: 0,
                state
            };
        }
    } else {
        // Default case, C without value or unspecified state
        // Determine the result based on the target
        if (target && target.type === 'time') {
            // If C with numeric value, it's probably seconds
            if (state === 'C' && /^\d+$/.test(completionValue)) {
                result = {
                    type: 'time',
                    duration: {
                        value: parseInt(completionValue),
                        unit: 's'
                    },
                    state
                };
            } else {
                // State without numeric value, we use the state simply
                result = {
                    type: 'time',
                    duration: {
                        value: 0, // Default value, will be replaced by the target
                        unit: target.duration.unit
                    },
                    state
                };
            }
        } else {
            // By default, we treat as repetitions
            const reps = state === 'C' && /^\d+$/.test(completionValue)
                ? parseInt(completionValue)
                : 0; // Default value

            result = {
                type: 'reps',
                count: reps,
                state
            };
        }
    }

    return [{ load, result }];
}

// Export main functions
export {
    parseTarget,
    parseSet,
    parseEffort,
    parseSession
};