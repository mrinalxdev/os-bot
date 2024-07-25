import axios from "axios";
import fs from "fs/promises";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

interface Issue {
  title: string;
  number: number;
  body: string;
  labels: { name: string }[];
  user: { login: string };
  created_at: string;
}

export class OsBot {
  private apiUrl: string;
  private token: string;
  private genAI: GoogleGenerativeAI;

  constructor(owner: string, repo: string, token: string) {
    this.apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
    this.token = token;
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
  }
  async analyzeIssue(issueNumber: number): Promise<string> {
    try {
      const issue = await this.fetchIssue(issueNumber);
      const analysis = this.generateAnalysis(issue);
      const aiInsights = await this.getAIInsights(issue);
      return analysis + aiInsights;
    } catch (error) {
      console.error("Error analyzing issue:", error);
      return "Unable to analyze the issue at this time.";
    }
  }

  private async fetchIssue(issueNumber: number): Promise<Issue> {
    try {
      const response = await axios.get(`${this.apiUrl}/issues/${issueNumber}`, {
        headers: {
          Authorization: `token ${this.token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching issue:", error);
      throw new Error("Failed to fetch issue data");
    }
  }

  private async getAIInsights(issue: Issue): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `
      Analyze the following GitHub issue and provide insights:
      Title: ${issue.title}
      Description: ${issue.body}

      Please provide:
      1. A brief summary of the issue (2-3 sentences)
      2. Potential root causes or factors contributing to the issue
      3. A blueprint or approach to solve the issue (3-5 steps)
      4. Any additional recommendations or best practices relevant to this type of issue
      `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return `\nAI Insights:\n${text}\n`;
  }
  async suggestLabels(issueNumber: number): Promise<string[]> {
    const issue = await this.fetchIssue(issueNumber);
    const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `
      Based on the following GitHub issue, suggest appropriate labels:
      Title: ${issue.title}
      Description: ${issue.body}

      Provide a list of 3-5 relevant labels, each on a new line.
      `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return text.split("\n").filter((label) => label.trim() !== "");
  }

  private generateAnalysis(issue: Issue): string {
    if (!issue) {
      return "Unable to analyze the issue: No issue data available.";
    }

    let analysis = `Issue #${issue.number}: ${issue.title}\n\n`;
    analysis += `Created by: ${issue.user?.login || "Unknown"}\n`;
    analysis += `Created at: ${new Date(issue.created_at).toLocaleString()}\n\n`;

    // Analyze labels
    if (issue.labels && issue.labels.length > 0) {
      analysis += "Labels:\n";
      issue.labels.forEach((label) => {
        analysis += `- ${label.name}\n`;
      });
      analysis += "\n";
    }

    // Analyze body content
    if (issue.body) {
      const bodyLines = issue.body.split("\n");
      const codeBlocks = this.extractCodeBlock(bodyLines);
      const mentions = this.extractMentions(issue.body);

      analysis += `Issue Description:\n${this.summarizeBody(bodyLines)}\n\n`;

      if (codeBlocks.length > 0) {
        analysis += `Code Blocks Found: ${codeBlocks.length}\n`;
        analysis +=
          "Languages detected: " +
          this.detectCodeLanguages(codeBlocks).join(", ") +
          "\n\n";
      }

      if (mentions.length > 0) {
        analysis += "Mentions:\n";
        mentions.forEach((mention) => {
          analysis += `- ${mention}\n`;
        });
        analysis += "\n";
      }
    } else {
      analysis += "No description provided for this issue.\n\n";
    }

    analysis += this.provideSuggestions(issue);
    return analysis;
  }

  async prioritizeIssue(issueNumber: number): Promise<string> {
    const issue = await this.fetchIssue(issueNumber);
    const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Analyze the following GitHub issue and suggest a priority level (Low, Medium, High, Critical):
      Title: ${issue.title}
      Description: ${issue.body}

      Provide the suggested priority level and a brief explanation for the choice.
      `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  private summarizeBody(bodyLines: string[]): string {
    if (!bodyLines || bodyLines.length === 0) {
      return "No description available.";
    }
    return bodyLines.slice(0, 5).join("\n").substring(0, 200) + "...";
  }

  private extractCodeBlock(bodyLines: string[]): string[] {
    const codeBlocks: string[] = [];

    let inCodeBlock = false;
    let currentBlock = "";

    bodyLines.forEach((line) => {
      if (line.startsWith("```")) {
        if (inCodeBlock) {
          codeBlocks.push(currentBlock.trim());
          currentBlock = "";
        }
        inCodeBlock = !inCodeBlock;
      } else if (inCodeBlock) {
        currentBlock += line + "\n";
      }
    });
    return codeBlocks;
  }

  private extractMentions(body: string): string[] {
    const mentionsRegex = /@(\w+)/g;
    return [...body.matchAll(mentionsRegex)].map((match) => match[1]);
  }

  private detectCodeLanguages(codeBlocks: string[]): string[] {
    const languages = new Set<string>();
    const languageHints: { [key: string]: string[] } = {
      javascript: ["const", "let", "var", "function"],
      python: ["def", "import", "class", "if __name__"],
      java: ["public class", "private", "protected", "import java"],
      typescript: ["interface", "type", "enum", "namespace"],
    };

    codeBlocks.forEach((block) => {
      for (const [lang, hints] of Object.entries(languageHints)) {
        if (hints.some((hint) => block.includes(hint))) {
          languages.add(lang);
          break;
        }
      }
    });

    return Array.from(languages);
  }

  private provideSuggestions(issue: Issue): string {
    let suggestions = "Suggestions:\n";

    if (!issue.body) {
      suggestions +=
        "- The issue has no description. Consider adding details about the problem or feature request.\n";
    } else if (issue.body.length < 50) {
      suggestions +=
        "- The issue description is quite short. Consider adding more details.\n";
    }

    if (!issue.body || !this.extractCodeBlock(issue.body.split("\n")).length) {
      suggestions +=
        "- No code blocks found. If applicable, consider adding relevant code snippets.\n";
    }

    if (!issue.labels || issue.labels.length === 0) {
      suggestions +=
        "- No labels applied. Adding appropriate labels can help categorize the issue.\n";
    }

    return suggestions;
  }

  async generateHtmlReport(issueNumber: number): Promise<string> {
    const issue = await this.fetchIssue(issueNumber);
    const analysis = this.generateAnalysis(issue);
    const aiInsights = await this.getAIInsights(issue);
    const suggestedLabels = await this.suggestLabels(issueNumber);
    const priority = await this.prioritizeIssue(issueNumber);

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Issue Analysis Report</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-100 p-8">
        <div class="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
          <div class="px-6 py-4">
            <h1 class="text-3xl font-bold mb-4">Issue #${issue.number} Analysis</h1>
            <h2 class="text-xl font-semibold mb-2">${issue.title}</h2>
            <p class="text-gray-600 mb-4">Created by ${issue.user.login} on ${new Date(issue.created_at).toLocaleString()}</p>

            <div class="mb-6">
              <h3 class="text-lg font-semibold mb-2">Analysis:</h3>
              <pre class="bg-gray-100 p-4 rounded">${analysis}</pre>
            </div>

            <div class="mb-6">
              <h3 class="text-lg font-semibold mb-2">AI Insights:</h3>
              <div class="bg-blue-50 p-4 rounded">${aiInsights}</div>
            </div>

            <div class="mb-6">
              <h3 class="text-lg font-semibold mb-2">Suggested Labels:</h3>
              <div class="flex flex-wrap gap-2">
                ${suggestedLabels.map((label) => `<span class="bg-green-200 text-green-800 px-2 py-1 rounded">${label}</span>`).join("")}
              </div>
            </div>

            <div class="mb-6">
              <h3 class="text-lg font-semibold mb-2">Priority:</h3>
              <p class="font-medium">${priority}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
      `;

    const filename = `issue-${issueNumber}-report.html`;
    await fs.writeFile(filename, htmlContent);
    return filename;
  }
}
