import { Router, Request, Response } from "express";
import { evaluateReview } from "../services/claude";

export const evaluateReviewRouter = Router();

evaluateReviewRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { question, expectedAnswer, userResponse } = req.body as {
      question: string;
      expectedAnswer: string;
      userResponse: string;
    };

    if (!question || !expectedAnswer || !userResponse) {
      res.status(400).json({ error: "Missing question, expectedAnswer, or userResponse" });
      return;
    }

    const evaluation = await evaluateReview(question, expectedAnswer, userResponse);
    res.json(evaluation);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error evaluating review:", message);
    res.status(500).json({ error: message });
  }
});
