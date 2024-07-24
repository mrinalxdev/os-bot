import axios from "axios";

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

  constructor(owner: string, repo: string, token: string) {
    this.apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
    this.token = token;
  }
  async analyzeIssue(issueNumber: number): Promise<string> {
    try {
      const issue = await this.fetchIssue(issueNumber);
      return this.generateAnalysis(issue);
    } catch (error) {
      console.error("Error analyzing issue :", error);
      return "Unable to analyze the issue at this time.";
    }
  }

  private async fetchIssue(issueNumber: number): Promise<Issue> {
    const response = await axios.get(`${this.apiUrl}/issues/${issueNumber}`, {
      headers: {
        Authorization: `token ${this.token}`,
        Accept: "applicatio",
      },
    });
    return response.data;
  }

  private generateAnalysis(issue: Issue): string {
    let analysis = `Issue #${issue.number}: ${issue.title}\n\n`;
    analysis += `Created by : ${issue.user.login}\n`;
    analysis += `Created at : ${new Date(issue.created_at).toLocaleString()}\n\n`;

    if (issue.labels.length > 0) {
      analysis += "Labels:\n";
      issue.labels.forEach((label) => {
        analysis += `- ${label.name}\n`;
      });
      analysis += "\n";
    }

    // analyzing body contents, first extracting the codeblocks
    // than extracting the mentions
    // TODO : func detecCodeLanguage and func provideSuggestions
    const bodyLines = issue.body.split("\n");
    const codeBlocks = this.extractCodeBlock(bodyLines);
    const mentions = this.extractMentions(issue.body);

    analysis += `Issue Description:\n${this.summarizeBody(bodyLines)}\n\n`;

    if (codeBlocks.length > 0) {
      analysis += `Code Blocks Found : ${codeBlocks.length}\n`;
      analysis +=
        "Languages detected : " +
        this.detecCodeLanguages(codeBlocks).join(", ") +
        "\n\n";
    }

    if (mentions.length > 0) {
      analysis += "Mention:\n";
      mentions.forEach((mention) => {
        analysis += `-${mention}\n`;
      });
      analysis += "\n";
    }
    analysis += this.provideSuggestions(issue);

    return analysis;
  }

  private summarizeBody(bodyLines: string[]): string {
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
}
