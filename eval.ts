import fs from "fs";

interface Message {
  role: string;
  content: string;
  visibleTo: string[];
  model?: string;
}

interface MatchResult {
  timestamp: string;
  chat: Message[];
  winner: 'X' | 'O' | null;
  board: Record<string, string>;
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
  gamesAsX: number;
  gamesAsO: number;
  turnsToWin: number;
}

function initModelStats(): ModelStats {
  return {
    wins: 0,
    totalGames: 0,
    winsAsX: 0,
    winsAsO: 0,
    gamesAsX: 0,
    gamesAsO: 0,
    turnsToWin: 0
  };
}

function analyzeMatch(match: MatchResult) {
  let turnsToWin = 0;

  // Count turns for the winning model
  if (match.winner) {
    for (const msg of match.chat) {
      if (msg.model && msg.model === match.matchup[match.winner]) {
        turnsToWin++;
      }
    }
  }

  return {
    winner: match.winner,
    modelAsX: match.matchup.X,
    modelAsO: match.matchup.O,
    turnsToWin
  };
}

function calculateStats(matchFiles: string[]) {
  let totalMatches = 0;
  let xWins = 0;
  let oWins = 0;
  const modelStats: Record<string, ModelStats> = {};

  for (const file of matchFiles) {
    const match: MatchResult = JSON.parse(fs.readFileSync(file, 'utf-8'));
    const analysis = analyzeMatch(match);
    totalMatches++;

    if (analysis.winner === 'X') xWins++;
    if (analysis.winner === 'O') oWins++;

    // Initialize and update model stats
    if (analysis.modelAsX) {
      if (!modelStats[analysis.modelAsX]) {
        modelStats[analysis.modelAsX] = initModelStats();
      }
      const stats = modelStats[analysis.modelAsX]!;
      stats.totalGames++;
      stats.gamesAsX++;
      if (analysis.winner === 'X') {
        stats.wins++;
        stats.winsAsX++;
        stats.turnsToWin += analysis.turnsToWin;
      }
    }
    
    if (analysis.modelAsO) {
      if (!modelStats[analysis.modelAsO]) {
        modelStats[analysis.modelAsO] = initModelStats();
      }
      const stats = modelStats[analysis.modelAsO]!;
      stats.totalGames++;
      stats.gamesAsO++;
      if (analysis.winner === 'O') {
        stats.wins++;
        stats.winsAsO++;
        stats.turnsToWin += analysis.turnsToWin;
      }
    }
  }

  return {
    xWinRate: xWins / totalMatches,
    oWinRate: oWins / totalMatches,
    modelStats,
    totalMatches
  };
}

// Get all match files
const matchFiles = fs.readdirSync('matches').map(f => `matches/${f}`);
const stats = calculateStats(matchFiles);

console.log('Overall Statistics:');
console.log(`X Win Rate: ${(stats.xWinRate * 100).toFixed(2)}%`);
console.log(`O Win Rate: ${(stats.oWinRate * 100).toFixed(2)}%`);
console.log('\nPer-Model Statistics:');

for (const [model, modelStat] of Object.entries(stats.modelStats)) {
  console.log(`\n${model}:`);
  console.log(`  Overall Win Rate: ${((modelStat.wins / modelStat.totalGames) * 100).toFixed(2)}% (${modelStat.wins}/${modelStat.totalGames} games)`);
  console.log(`  Win Rate as X: ${modelStat.gamesAsX > 0 ? ((modelStat.winsAsX / modelStat.gamesAsX) * 100).toFixed(2) : 0}% (${modelStat.winsAsX}/${modelStat.gamesAsX} games)`);
  console.log(`  Win Rate as O: ${modelStat.gamesAsO > 0 ? ((modelStat.winsAsO / modelStat.gamesAsO) * 100).toFixed(2) : 0}% (${modelStat.winsAsO}/${modelStat.gamesAsO} games)`);
  console.log(`  Average Turns to Win: ${modelStat.wins > 0 ? (modelStat.turnsToWin / modelStat.wins).toFixed(2) : 'N/A'}`);
}