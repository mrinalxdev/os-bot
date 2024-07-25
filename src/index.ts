import { OsBot } from "./os-bot";
import dotenv from "dotenv";
dotenv.config();

const owner = process.env.GITHUB_REPO_OWNER;
const repo = process.env.GITHUB_REPO_NAME;
const token = process.env.GITHUB_TOKEN;

console.log("GITHUB_REPO_OWNER:", process.env.GITHUB_REPO_OWNER);
console.log("GITHUB_REPO_NAME:", process.env.GITHUB_REPO_NAME);

if (!owner || !repo || !token) {
  console.error("Missing Environment variable");
  process.exit(1);
}

const bot = new OsBot(owner, repo, token);
async function main() {
  const issueNumber = 2; // Change this to the issue number you want to analyze

  console.log("Analyzing issue...");
  const analysis = await bot.analyzeIssue(issueNumber);
  console.log(analysis);

  console.log("\nSuggesting labels...");
  const suggestedLabels = await bot.suggestLabels(issueNumber);
  console.log("Suggested labels:", suggestedLabels);

  console.log("\nPrioritizing issue...");
  const priority = await bot.prioritizeIssue(issueNumber);
  console.log("Suggested priority:", priority);
  const htmlFilename = await bot.generateHtmlReport(issueNumber);
  console.log(`Html report generated : ${htmlFilename}`);
  console.log(
    "Analysis complete. Open the HTML file in your browser to view the report.",
  );
}

main().catch(console.error);
