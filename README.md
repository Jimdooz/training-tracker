# Training Tracker

Training Tracker is a specialized note-taking application designed for fitness enthusiasts to easily track their workouts. It features a customized editor with syntax highlighting specifically tailored for workout notation, making it effortless to record and analyze your training progress.

## Features

- **Specialized Editor**: Text editor with syntax highlighting specifically designed for workout notation
- **Smart Parsing**: Automatically understands and structures your workout data
- **Local Storage**: Automatically saves your workouts to your browser's local storage
- **Flexible Notation**: Supports various notation styles for different types of exercises and training formats
- **Time & Rep Tracking**: Easily track both time-based exercises and repetition-based exercises

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/training-tracker.git

# Navigate to the directory
cd training-tracker

# Install dependencies
pnpm install

# Run the development server
pnpm dev
```

## Tech Stack

- Svelte 5
- TypeScript
- Vite
- TailwindCSS
- CodeMirror 6

## Workout Notation Syntax

Training Tracker uses an intuitive, flexible notation system that allows you to quickly record your workouts while preserving all important data.

### Basic Notation

```
# Workout Title
DD/MM/YYYY (optional date)

Exercise Name (sets×reps) : weight state, weight state, ...
```

### Notation Elements

- **Exercise Definition**: `Exercise Name (sets×reps)` or `Exercise Name (sets×time)`
  - Examples: `Bench Press (4x8)`, `Plank (3x1min)`

- **Completion States**:
  - `A` = All repetitions completed successfully
  - `B` = All repetitions completed but with struggle
  - `C` + number = Partial completion (e.g., `C7` means completed 7 reps)
  - `C` + time = Partial time completion (e.g., `C45s` means completed 45 seconds)

- **Set Notation**:
  - Single set: `80kg A` (80kg, all reps completed)
  - Drop set: `80/70/60kg C8/6/4` (started with 80kg for 8 reps, then 70kg for 6 reps, then 60kg for 4 reps)
  - Repeat previous set: `/` (same as previous set)
  - Repeat with different state: `/ C7` (same weight as previous set, but only 7 reps completed)

- **Comments**: Add comments in single quotes
  - Example: `100kg A 'felt strong today'`

### Example Workouts

```
# Push Day
20/02/2025

Bench Press (4x8) : 45kg A, / C7, 40kg C6, 35kg A
Incline Press (4x10):
- 25kg A
- 30kg A
- 25kg A
- / C8
Cable Flyes (3x12):
- 10kg C10
- 10/5kg C7/5 'shoulders felt tight'
- 7.5/5kg C4/2
```

```
# Leg Day
27/02/2025

Squats (4x10) :
- 100kg A, /, /, / 'increase weight next time'
Hip Thrust (4x12):
- 120kg A, /, /, /
Standing Calf Raises (4*12):
- 0kg A, /, /,/
Plank (4*1min) : A, /, /, C55s 'core fatigue'
```

## Data Structure

When parsed, your workout data is structured as follows:

```typescript
interface TrainingSession {
  title: string;
  date: Date | null;
  exercises: Exercise[];
  comment?: string;
}

interface Exercise {
  name: string;
  targetSets: number;
  target: TargetType; // reps or time
  sets: Set[];
  comment?: string;
}

interface Set {
  efforts: Effort[];
  comment?: string;
}

interface Effort {
  load: LoadValue | null;
  result: EffortResult;
  isRepeat?: boolean;
}
```

## Future Plans

- Exercise Statistics & Charts
- Exercise Auto-Completion
- Workout Generation
- Export/Import functionality
- Mobile App

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.