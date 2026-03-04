import express from "express";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Google Sheets submission via Apps Script (Free & Easy)
  app.post("/api/order", async (req, res) => {
    try {
      const scriptUrl = process.env.GOOGLE_SCRIPT_URL;

      if (!scriptUrl || scriptUrl.includes("XXXXX")) {
        console.warn("GOOGLE_SCRIPT_URL not configured or still using placeholder.");
        return res.json({ success: true, message: "Order processed (Sheet not configured)" });
      }

      // Forward the data to Google Apps Script
      const response = await fetch(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Apps Script returned ${response.status}: ${errorText}`);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error recording order:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
