import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, "..");

const env = process.env.NODE_ENV || "development";
const envPath = path.join(rootDir, `.env.${env}`);

dotenv.config({ path: envPath });

console.log(`Running in ${env} mode, loaded env from: ${envPath}`);
