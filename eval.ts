import fs from "fs";

interface Message {
  role: string;
  content: string;
  visibleTo: string[];
  model?: string;
  author?: string;
}

interface MatchResult {
  timestamp: string;
  chat: Message[];
  winner: 'X' | 'O' | null;
  board: Record<string, string>;
  hadError: 'X' | 'O' | null;
  matchup: {
    X: string;
    O: string;
  };
}

interface ModelStats {
  wins: number;
  totalGames: number;
  winsAsX: number;
  winsAsO: number;
  errors: number;
  gamesAsX: number;
  gamesAsO: number;
  drawsAsX: number;
  drawsAsO: number;
  turnsToWin: number;
}

function initModelStats(): ModelStats {
  return {
    wins: 0,
    totalGames: 0,
    winsAsX: 0,
    winsAsO: 0,
    errors: 0,
    drawsAsX: 0,
    drawsAsO: 0,
    gamesAsX: 0,
    gamesAsO: 0,
    turnsToWin: 0
  };
}

function analyzeMatch(match: MatchResult) {
  return {
    winner: match.winner,
    hadError: match.hadError,
    modelAsX: match.matchup.X,
    modelAsO: match.matchup.O,
    turnsToWin: match.chat.filter((msg) => msg.model).length,
  };
}

function calculateStats(matchFiles: string[]) {
  let totalMatches = 0;
  let xWins = 0;
  let oWins = 0;
  let errors = 0;
  let draws = 0;
  const modelStats: Record<string, ModelStats> = {};

  for (const file of matchFiles) {
    const match: MatchResult = JSON.parse(fs.readFileSync(file, 'utf-8'));
    const analysis = analyzeMatch(match);
    totalMatches++;

    if (!modelStats[analysis.modelAsX]) modelStats[analysis.modelAsX] = initModelStats();
    if (!modelStats[analysis.modelAsO]) modelStats[analysis.modelAsO] = initModelStats();

    if (analysis.hadError === 'X') {
      errors++
      modelStats[analysis.modelAsX]!.errors++
    } else if (analysis.hadError === 'O') {
      errors++
      modelStats[analysis.modelAsO]!.errors++
    } else if (analysis.winner === null) {
      draws++
      modelStats[analysis.modelAsX]!.drawsAsX++
      modelStats[analysis.modelAsO]!.drawsAsO++
    }

    modelStats[analysis.modelAsX]!.totalGames++;
    modelStats[analysis.modelAsO]!.totalGames++;

    modelStats[analysis.modelAsX]!.gamesAsX++;
    modelStats[analysis.modelAsO]!.gamesAsO++;

    if (analysis.winner === 'X') {
      xWins++;
      modelStats[analysis.modelAsX]!.wins++;
      modelStats[analysis.modelAsX]!.winsAsX++;
      modelStats[analysis.modelAsX]!.turnsToWin += analysis.turnsToWin;
    }

    if (analysis.winner === 'O') {
      oWins++;
      modelStats[analysis.modelAsO]!.wins++;
      modelStats[analysis.modelAsO]!.winsAsO++;
      modelStats[analysis.modelAsO]!.turnsToWin += analysis.turnsToWin;
    }
  }

  return {
    xWinRate: xWins / totalMatches,
    oWinRate: oWins / totalMatches,
    errorRate: errors / totalMatches,
    drawRate: draws / totalMatches,
    modelStats,
    totalMatches
  };
}

function generateMarkdown(stats: ReturnType<typeof calculateStats>): string {
  let markdown = '# Tic Tac Toe Model Evaluation Results\n\n';
  
  markdown += '## Overall Statistics\n\n';
  markdown += `- X Win Rate: ${(stats.xWinRate * 100).toFixed(2)}%\n`;
  markdown += `- O Win Rate: ${(stats.oWinRate * 100).toFixed(2)}%\n`;
  markdown += `- Draw Rate: ${(stats.drawRate * 100).toFixed(2)}%\n`;
  markdown += `- Error Rate: ${(stats.errorRate * 100).toFixed(2)}%\n\n`;
  
  markdown += '## Per-Model Statistics\n';
  markdown += '*(sorted by win rate with Laplace smoothing)*\n\n';

  // Sort models by win rate using Laplace smoothing (add one win and one loss)
  const sortedModels = Object.entries(stats.modelStats)
    .sort(([, a], [, b]) => {
      const aSmoothedRate = (a.wins + 1) / (a.totalGames + 2);
      const bSmoothedRate = (b.wins + 1) / (b.totalGames + 2);
      return bSmoothedRate - aSmoothedRate;
    });

  for (const [model, modelStat] of sortedModels) {
    markdown += `### ${model}\n\n`;
    markdown += `- Overall Win Rate: ${((modelStat.wins / modelStat.totalGames) * 100).toFixed(2)}% (${modelStat.wins}/${modelStat.totalGames} games)\n`;
    markdown += `- Win Rate as X: ${modelStat.gamesAsX > 0 ? ((modelStat.winsAsX / modelStat.gamesAsX) * 100).toFixed(2) : 0}% (${modelStat.winsAsX}/${modelStat.gamesAsX} games)\n`;
    markdown += `- Win Rate as O: ${modelStat.gamesAsO > 0 ? ((modelStat.winsAsO / modelStat.gamesAsO) * 100).toFixed(2) : 0}% (${modelStat.winsAsO}/${modelStat.gamesAsO} games)\n`;
    markdown += `- Draw Rate as X: ${modelStat.gamesAsX > 0 ? ((modelStat.drawsAsX / modelStat.gamesAsX) * 100).toFixed(2) : 0}% (${modelStat.drawsAsX}/${modelStat.gamesAsX} games)\n`;
    markdown += `- Draw Rate as O: ${modelStat.gamesAsO > 0 ? ((modelStat.drawsAsO / modelStat.gamesAsO) * 100).toFixed(2) : 0}% (${modelStat.drawsAsO}/${modelStat.gamesAsO} games)\n`;
    markdown += `- Error Rate: ${((modelStat.errors / modelStat.totalGames) * 100).toFixed(2)}% (${modelStat.errors}/${modelStat.totalGames} games)\n`;
    markdown += `- Average Turns to Win: ${modelStat.wins > 0 ? (modelStat.turnsToWin / modelStat.wins).toFixed(2) : 'N/A'}\n\n`;
  }

  return markdown;
}

// Get all match files
const matchFiles = fs.readdirSync('matches')
  .filter(f => f.endsWith('.json')) // Ensure we only process json files
  .map(f => `matches/${f}`);
const stats = calculateStats(matchFiles);

// Generate markdown and write to file
const markdown = generateMarkdown(stats);
fs.writeFileSync('eval.md', markdown);
console.log('Evaluation results written to evaluation.md');