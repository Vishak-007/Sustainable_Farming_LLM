import { spawn } from "child_process";
import { getCropPriceHistory } from "./marketPriceService.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const predictCropPrice = async (cropName) => {
  try {
    // 1. Fetch real historical prices
    const historicalPrices = await getCropPriceHistory(cropName);

    // 2. Prepare the input data for Python script
    // Note: Python script expects 10 days of prices explicitly
    const formattedCrop = cropName.charAt(0).toUpperCase() + cropName.slice(1).toLowerCase();

    // Ensure the crop name is one of the supported ones or Python will fall back gracefully or throw.
    const inputData = {
      crop: formattedCrop,
      last_10_day_prices: historicalPrices,

      demand: "medium",

      demand: "medium", 

      supply: "medium",
      rainfall: "medium",
      season: "Summer"
    };

    // 3. Spawn Python process
    // The python script sits at the root directory of the project, which is two levels up from services
    const pythonScriptPath = path.resolve(__dirname, "../../price_prediction.py");


    return new Promise((resolve, reject) => {
      // Use 'python' for Windows
      const pyProcess = spawn("python", [pythonScriptPath, "--json", JSON.stringify(inputData)]);


    
    return new Promise((resolve, reject) => {
      // Use 'python' for Windows
      const pyProcess = spawn("python", [pythonScriptPath, "--json", JSON.stringify(inputData)]);
      

      let stdoutData = "";
      let stderrData = "";

      pyProcess.stdout.on("data", (data) => {
        stdoutData += data.toString();
      });

      pyProcess.stderr.on("data", (data) => {
        stderrData += data.toString();
      });

      pyProcess.on("close", (code) => {
        if (code !== 0) {
          console.error(`Python script exited with code ${code}`);
          console.error(stderrData);
          return reject(new Error("Failed to execute python model."));
        }
        try {
          // Parse the JSON output from python script
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
