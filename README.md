# QuizArena

A real-time classroom quiz platform powered by Firebase. Teachers control rounds from the admin panel while students play live on their devices.

## Question Types

All answer input is **selection-based** (no typing required):

| Type | Description | Input Method |
|------|-------------|--------------|
| `multiple_choice` | Classic A/B/C/D questions | Click an option card |
| `true_false` | Evaluate statements | Click True or False |
| `fill_in` | Text with blanks to complete | Dropdown selects |

## File Structure

```
├── index.html          # Player interface
├── admin.html          # Teacher control panel
├── script.js           # Player game engine
├── style.css           # Shared styles
├── firebase.js         # Firebase config
└── data/
    └── questions.json  # All tests/quizzes
```

## Question Format (`data/questions.json`)

The file is an array of test objects. Each test has an `id`, `title`, `type`, and type-specific fields:

### Multiple Choice

```json
{
  "id": 2,
  "title": "World Capitals",
  "type": "multiple_choice",
  "questions": [
    {
      "question": "What is the capital of France?",
      "options": ["London", "Paris", "Berlin", "Madrid"],
      "answer": 1,
      "explanation": "Paris has been the capital since the 10th century."
    }
  ]
}
```

- `answer` is the **zero-based index** of the correct option.

### True / False

```json
{
  "id": 3,
  "title": "Science Quick Check",
  "type": "true_false",
  "questions": [
    {
      "statement": "The Sun revolves around the Earth.",
      "answer": false,
      "explanation": "The Earth revolves around the Sun."
    }
  ]
}
```

### Fill in the Blanks

```json
{
  "id": 1,
  "title": "English Articles",
  "type": "fill_in",
  "text": "I made ___ cup of coffee and read ___ newspaper.",
  "blanks": [
    {
      "options": ["a", "an", "the", "—"],
      "answer": "a",
      "explanation": "'A' introduces a nonspecific cup."
    },
    {
      "options": ["a", "an", "the", "—"],
      "answer": "the",
      "explanation": "'The' refers to a specific newspaper."
    }
  ]
}
```

- Each `___` in the text corresponds to one entry in `blanks`.
- `answer` can be a string or an **array of strings** for multiple accepted answers.

## How to Use

1. **Deploy** all files to any static host (GitHub Pages, Netlify, Firebase Hosting, etc.)
2. Open `admin.html` to control rounds (select a test, set duration, start)
3. Students open `index.html`, enter their name, and wait
4. When the teacher starts a round, all students see the quiz simultaneously
5. Results appear in real-time on both the admin and player leaderboards

## Adding New Questions

Edit `data/questions.json` and add a new object to the array with a unique `id`. Follow the format for whichever type you want. No code changes needed.
