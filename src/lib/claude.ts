/**
 * Claude API helper for AI-powered viva generation and scoring.
 * All calls use claude-sonnet-4-20250514.
 */
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

const MODEL = "claude-sonnet-4-20250514";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GeneratedQuestion {
  question: string;
  type: "SHORT_ANSWER" | "MCQ";
  options: string[] | null;
  correctAnswer: string;
  conceptTested: string;
}

export interface ShortAnswerScore {
  score: number; // 0, 1, or 2
  feedback: string;
}

// ---------------------------------------------------------------------------
// Viva Question Generation
// ---------------------------------------------------------------------------

export async function generateVivaQuestions(
  assignmentTitle: string,
  assignmentDescription: string,
  studentCode: string,
  testResults: { passed: boolean; status: string }[]
): Promise<GeneratedQuestion[]> {
  const passCount = testResults.filter((t) => t.passed).length;
  const totalCount = testResults.length;

  const systemPrompt = `You are an expert CS instructor evaluating a student's understanding of their own code. Your job is to generate viva voce questions that test whether the student actually wrote and understands the code they submitted.

You MUST respond with ONLY a valid JSON array. No markdown, no explanation, no code fences. Just the raw JSON array.`;

  const userPrompt = `Assignment: ${assignmentTitle}
Description: ${assignmentDescription}

Student's submitted code:
\`\`\`
${studentCode}
\`\`\`

Test results: ${passCount}/${totalCount} test cases passed.
${testResults.map((t, i) => `  Test ${i + 1}: ${t.passed ? "PASSED" : "FAILED"} (${t.status})`).join("\n")}

Generate exactly 4 viva questions as a JSON array. Each question must be one of these types:
1. Logic explanation — "Why did you use X approach?" (type: SHORT_ANSWER)
2. Edge case — "What happens if input is empty/negative/etc?" (type: SHORT_ANSWER)
3. Modification — "How would you change your code to handle Y?" (type: SHORT_ANSWER)
4. MCQ on a concept used in the code (type: MCQ, with exactly 4 options)

Response format — return ONLY this JSON array:
[
  {
    "question": "...",
    "type": "SHORT_ANSWER",
    "options": null,
    "correctAnswer": "brief expected answer or key concept",
    "conceptTested": "e.g. time complexity, recursion, edge handling"
  },
  {
    "question": "...",
    "type": "MCQ",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "the correct option text",
    "conceptTested": "..."
  }
]`;

  // Attempt with retry
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      console.log(`[Claude] Generating viva questions (attempt ${attempt + 1})...`);

      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const content = response.content[0];
      if (content.type !== "text") {
        console.error("[Claude] Unexpected content type:", content.type);
        continue;
      }

      // Parse JSON — strip any markdown fences if Claude adds them
      let jsonStr = content.text.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }

      const questions: GeneratedQuestion[] = JSON.parse(jsonStr);

      // Validate structure
      if (!Array.isArray(questions) || questions.length === 0) {
        console.error("[Claude] Invalid response structure");
        continue;
      }

      return questions.slice(0, 4).map((q) => ({
        question: q.question,
        type: q.type === "MCQ" ? "MCQ" : "SHORT_ANSWER",
        options: q.type === "MCQ" ? q.options : null,
        correctAnswer: q.correctAnswer || "",
        conceptTested: q.conceptTested || "",
      }));
    } catch (error) {
      console.error(`[Claude] Attempt ${attempt + 1} failed:`, error);
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  // Fallback if both attempts fail
  console.warn("[Claude] All attempts failed. Returning fallback questions.");
  return [
    {
      question: "Explain the main logic of your solution in your own words.",
      type: "SHORT_ANSWER",
      options: null,
      correctAnswer: "Clear explanation of the algorithm used",
      conceptTested: "code comprehension",
    },
    {
      question: "What edge cases did you consider in your solution?",
      type: "SHORT_ANSWER",
      options: null,
      correctAnswer: "Discussion of boundary conditions",
      conceptTested: "edge case handling",
    },
    {
      question: "How would you optimize your solution for larger inputs?",
      type: "SHORT_ANSWER",
      options: null,
      correctAnswer: "Discussion of time/space complexity improvements",
      conceptTested: "optimization",
    },
    {
      question: "What is the time complexity of your solution?",
      type: "MCQ",
      options: ["O(1)", "O(n)", "O(n log n)", "O(n²)"],
      correctAnswer: "O(n)",
      conceptTested: "time complexity",
    },
  ];
}

// ---------------------------------------------------------------------------
// Short Answer Scoring
// ---------------------------------------------------------------------------

export async function scoreShortAnswer(
  question: string,
  conceptTested: string,
  studentAnswer: string
): Promise<ShortAnswerScore> {
  const systemPrompt = `You are a CS instructor grading a student's viva answer. Score the answer 0 (wrong), 1 (partial understanding), or 2 (correct and complete). Respond with ONLY a JSON object: { "score": 0|1|2, "feedback": "brief explanation" }`;

  const userPrompt = `Question: ${question}
Concept being tested: ${conceptTested}
Student's answer: ${studentAnswer}

Score this answer 0-2 and provide brief feedback.`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 256,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return { score: 0, feedback: "Unable to evaluate response." };
    }

    let jsonStr = content.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const result = JSON.parse(jsonStr);
    return {
      score: Math.min(2, Math.max(0, Number(result.score) || 0)),
      feedback: result.feedback || "No feedback provided.",
    };
  } catch (error) {
    console.error("[Claude] Score error:", error);
    return { score: 0, feedback: "AI evaluation failed. Manual review required." };
  }
}

// ---------------------------------------------------------------------------
// Assignment Generation (AI-assisted)
// ---------------------------------------------------------------------------

export interface GeneratedAssignment {
  title: string;
  description: string;
  starterCode: string;
  testCases: { input: string; expectedOutput: string; isHidden: boolean }[];
  hints: string[];
}

export async function generateAssignment(
  difficulty: string,
  concepts: string[],
  priorAssignments: string[],
  language: string = "python"
): Promise<GeneratedAssignment> {
  const systemPrompt = `You are an expert CS instructor creating coding assignments. Respond with ONLY valid JSON. No markdown, no explanation.`;

  const userPrompt = `Create a ${difficulty} level coding assignment in ${language}.

Concepts to test: ${concepts.join(", ")}
Prior assignments in this course: ${priorAssignments.join(", ") || "None yet"}

Return JSON:
{
  "title": "Assignment title",
  "description": "Clear problem description with examples",
  "starterCode": "starter code template with TODO comments",
  "testCases": [
    { "input": "test input", "expectedOutput": "expected output", "isHidden": false },
    { "input": "hidden test", "expectedOutput": "expected", "isHidden": true }
  ],
  "hints": ["hint 1", "hint 2"]
}

Include at least 3 visible and 2 hidden test cases.`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unexpected content type");

    let jsonStr = content.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("[Claude] Assignment generation failed:", error);
    return {
      title: "Practice Problem",
      description: `A ${difficulty} level problem covering: ${concepts.join(", ")}`,
      starterCode: `# TODO: Implement your solution\n`,
      testCases: [{ input: "", expectedOutput: "", isHidden: false }],
      hints: ["Think about edge cases"],
    };
  }
}

// ---------------------------------------------------------------------------
// Remedial Assignment Generation
// ---------------------------------------------------------------------------

export async function generateRemedialAssignment(
  originalTitle: string,
  originalDescription: string,
  studentScore: number,
  language: string = "python"
): Promise<GeneratedAssignment> {
  const systemPrompt = `You are an expert CS instructor. A student scored ${studentScore}% on an assignment. Create an easier version to help them learn. Respond with ONLY valid JSON.`;

  const userPrompt = `Original assignment:
Title: ${originalTitle}
Description: ${originalDescription}

The student scored only ${studentScore}%. Generate a simpler version that:
- Breaks the problem into smaller steps
- Provides more starter code
- Has simpler test cases
- Includes hints for each step

Return JSON with same structure:
{ "title": "Practice: ${originalTitle}", "description": "...", "starterCode": "...", "testCases": [...], "hints": [...] }`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unexpected content type");

    let jsonStr = content.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("[Claude] Remedial generation failed:", error);
    return {
      title: `Practice: ${originalTitle}`,
      description: `A simpler version of:\n${originalDescription}`,
      starterCode: `# Practice version - follow the steps\n# Step 1: ...\n`,
      testCases: [{ input: "", expectedOutput: "", isHidden: false }],
      hints: ["Start with the simplest case first"],
    };
  }
}

// ---------------------------------------------------------------------------
// Peer Review Rubric Generation
// ---------------------------------------------------------------------------

export async function generatePeerRubric(
  assignmentDescription: string
): Promise<{ criterion: string; maxScore: number }[]> {
  const systemPrompt = `You are a CS instructor. Generate a peer review rubric. Respond with ONLY a JSON array.`;

  const userPrompt = `Assignment: ${assignmentDescription}

Generate a rubric for peer code review as a JSON array:
[
  { "criterion": "Correctness", "maxScore": 3 },
  { "criterion": "Code Readability", "maxScore": 2 },
  ...
]

Include 3-5 criteria. Max total score should be around 10.`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unexpected");

    let jsonStr = content.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    return JSON.parse(jsonStr);
  } catch {
    return [
      { criterion: "Correctness", maxScore: 3 },
      { criterion: "Readability", maxScore: 2 },
      { criterion: "Edge cases handled", maxScore: 2 },
      { criterion: "Code efficiency", maxScore: 2 },
    ];
  }
}

// ---------------------------------------------------------------------------
// Study Suggestion for Weak Concepts
// ---------------------------------------------------------------------------

export async function generateStudySuggestion(
  concept: string,
  context: string = ""
): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: "You are a helpful CS tutor. Give a brief, actionable study suggestion in 2-3 sentences.",
      messages: [{
        role: "user",
        content: `A student is weak in: "${concept}". ${context ? `Context: ${context}` : ""}\n\nGive a brief study suggestion with a specific practice exercise they can try.`,
      }],
    });

    const content = response.content[0];
    return content.type === "text" ? content.text.trim() : "Review the fundamentals of this concept.";
  } catch {
    return `Practice more problems related to ${concept}. Focus on understanding the core principles before tackling complex variations.`;
  }
}
