You are an expert at analyzing educational content. Given the following transcript from a learning session, extract the key information and generate review materials.

## Transcript

{{transcript}}

## Instructions

Analyze the transcript above and produce a JSON response with the following structure:

- **summary**: A concise 2-3 sentence summary of what was covered.
- **keyPoints**: An array of the most important facts, concepts, or ideas mentioned (5-10 items).
- **reviewItems**: An array of question-answer pairs that test understanding of the material. Each item should have a "question" and "answer" field. Generate 5-8 review items that cover the most important concepts.

Focus on factual, testable content. Questions should be specific enough that there is a clear correct answer, but open enough to test real understanding rather than rote memorization.

Respond with valid JSON only, no additional text.
