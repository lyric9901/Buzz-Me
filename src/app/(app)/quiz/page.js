"use client";

import { useState } from "react";

export default function MatchQuiz() {
  const [answers, setAnswers] = useState({ q1: "", q2: "" });
  const [submitted, setSubmitted] = useState(false);

  const submitQuiz = () => {
    console.log("Preview answers:", answers);
    setSubmitted(true);
  };

  return (
    <div className="quiz p-4 space-y-4 max-w-md">
      <h1 className="text-xl font-bold">Match Quiz (Preview)</h1>

      <div>
        <label>Favorite Music Genre?</label>
        <input
          type="text"
          className="border p-1 w-full"
          value={answers.q1}
          onChange={(e) =>
            setAnswers({ ...answers, q1: e.target.value })
          }
        />
      </div>

      <div>
        <label>Ideal Hangout Place?</label>
        <input
          type="text"
          className="border p-1 w-full"
          value={answers.q2}
          onChange={(e) =>
            setAnswers({ ...answers, q2: e.target.value })
          }
        />
      </div>

      <button
        onClick={submitQuiz}
        className="bg-green-500 text-white px-4 py-2 rounded"
      >
        Submit Quiz
      </button>

      {submitted && (
        <p className="text-green-400">
          ✅ Quiz submitted (preview mode)
        </p>
      )}
    </div>
  );
}
