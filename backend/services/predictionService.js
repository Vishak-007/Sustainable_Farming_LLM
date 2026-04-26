import { spawn } from "child_process";
import { getCropPriceHistory } from "./marketPriceService.js";
import path from "path";
import { fileURLToPath } from "url";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const predictCropPrice = async (cropName) => {
  try {
    // 1. Fetch real historical prices
    const historicalPrices = await getCropPriceHistory(cropName);

    // 2. Prepare input data for the Python script
    const formattedCrop = cropName.charAt(0).toUpperCase() + cropName.slice(1).toLowerCase();

    const inputData = {
      crop: formattedCrop,
      last_10_day_prices: historicalPrices,
      demand: "medium",
      supply: "medium",
      rainfall: "medium",
      season: "Summer"
    };

    // 3. Write JSON to a temp file to avoid Windows shell quote-escaping issues
    //    (passing JSON via argv breaks on PowerShell with nested quotes)
    const tmpFile = path.join(tmpdir(), `predict_${Date.now()}.json`);
    writeFileSync(tmpFile, JSON.stringify(inputData), "utf-8");

    const pythonScriptPath = path.resolve(__dirname, "../../price_prediction.py");

    return new Promise((resolve, reject) => {
      // Use 'python' on Windows; falls back gracefully on macOS/Linux
      const pyProcess = spawn("python", [pythonScriptPath, "--json-file", tmpFile]);

      let stdoutData = "";
      let stderrData = "";

      pyProcess.stdout.on("data", (data) => { stdoutData += data.toString(); });
      pyProcess.stderr.on("data", (data) => { stderrData += data.toString(); });

      pyProcess.on("close", (code) => {
        // Always clean up the temp file
        try { unlinkSync(tmpFile); } catch (_) {}

        if (code !== 0) {
          console.error(`Python script exited with code ${code}`);
          console.error(stderrData);
          return reject(new Error("Failed to execute python model."));
        }
        try {
          const result = JSON.parse(stdoutData.trim());
          if (result.error) {
            reject(new Error(result.error));
          } else {
            resolve({
              inputs: inputData,
              prediction: result
            });
          }
        } catch (e) {
          console.error("Error parsing python output:", e);
          console.error("Raw stdout:", stdoutData);
          reject(new Error("Invalid output from prediction script."));
        }
      });
    });

  } catch (error) {
    console.error("Error in predictCropPrice:", error.message);
    throw error;
  }
};
