import "dotenv/config";
import express from "express";
import cors from "cors";
import { processTranscriptRouter } from "./routes/processTranscript";
import { evaluateReviewRouter } from "./routes/evaluateReview";

const app = express();
const port = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/process-transcript", processTranscriptRouter);
app.use("/evaluate-review", evaluateReviewRouter);

app.listen(port, () => {
  console.log(`Cortex server listening on port ${port}`);
});
