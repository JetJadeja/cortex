import express from "express";
import cors from "cors";
import { processRecordingRouter } from "./routes/processRecording";
import { evaluateReviewRouter } from "./routes/evaluateReview";
import { reviewRouter } from "./routes/review";
import { chatRouter } from "./routes/chat";
import { getPendingSessions } from "./services/recording";
import { enqueueProcessing } from "./lib/processing-queue";

const app = express();
const port = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/process-recording", processRecordingRouter);
app.use("/evaluate-review", evaluateReviewRouter);
app.use("/review", reviewRouter);
app.use("/chat", chatRouter);

async function start() {
  try {
    const pending = await getPendingSessions();
    if (pending.length > 0) {
      console.log(`Recovering ${pending.length} pending session(s)`);
      for (const session of pending) {
        enqueueProcessing(session.user_id, session.id, session.transcript);
      }
    }
  } catch (err) {
    console.error("Failed to recover pending sessions:", err);
  }

  app.listen(port, () => {
    console.log(`Cortex server listening on port ${port}`);
  });
}

start();
