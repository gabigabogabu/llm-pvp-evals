import fs from "fs";
import OpenAI from "openai";
import type { ChatCompletion, ChatCompletionCreateParamsNonStreaming } from "openai/resources.mjs";
import type { RequestOptions } from "openai/core.mjs";
import _ from "lodash";
import z from "zod";

import { TicTacToe, type PLAYER, type POSITION } from "./tictactoe";
import { models } from "./models";

const env = z.object({
  OPENROUTER_API_KEY: z.string(),
}).parse(process.env);

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: env.OPENROUTER_API_KEY,
});

const generateMatchups = async (modelIds: Set<string>) => {
  const matchups = [];
  for (const modelId of modelIds) {
    for (const otherModelId of modelIds) {
      matchups.push({
        X: modelId,
        O: otherModelId,
      });
    }
  }
  return matchups;
}

const getCompletedMatchups = () => {
  return fs.readdirSync("./matches")
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.split(".")?.[0]?.split("#").map((x) => x.trim()) as [string, string])
    .map(([x, o]) => ({ X: x, O: o }));
}

type AugmentedChatMessage =
  OpenAI.Chat.ChatCompletionMessageParam &
  {
    visibleTo: PLAYER[];
    author?: PLAYER;
    model?: string;
  };

const formatChatForPlayer = (chat: AugmentedChatMessage[], player: PLAYER): OpenAI.Chat.ChatCompletionMessageParam[] => {
  return chat
    .filter((message) => message.visibleTo.includes(player))
    .map((message) => {
      if (message.role === "developer") {
        return {
          role: "system",
          content: String(message.content || ''),
        };
      } else if (message.author === player) {
        return {
          role: "assistant",
          content: String(message.content || ''),
        };
      } else {
        return {
          role: "user",
          content: String(message.content || ''),
        };
      }
    });
}

const modelNameToFileName = (modelName: string) => {
  return modelName.replaceAll("/", "_").replaceAll(".", "$");
}

const fileNameToModelName = (fileName: string) => {
  return fileName.replaceAll("_", "/").replaceAll("$", ".");
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const retryChatCompletion = async (
  body: ChatCompletionCreateParamsNonStreaming,
  options?: RequestOptions): Promise<ChatCompletion> => {
  const maxRetries = 3;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await openai.chat.completions.create(body, options);
      if (!response.choices?.[0]?.message?.content && !((response?.choices?.[0]?.message as { reasoning?: string })?.reasoning)) {
        console.log('no content or reasoning, retrying', response, body, options);
        continue;
      }
      return response;
    } catch (error: any) {
      console.error('failed to get chat completion', error, body, options);
      if (error?.response?.status === 429) {
        // Get reset time from headers if available
        const resetTime = error?.response?.headers?.['x-ratelimit-reset'];
        if (resetTime) {
          const waitTime = Math.max(parseInt(resetTime) - Date.now(), 1000); // At least 1 second
          console.log(`Rate limited. Waiting ${waitTime}ms until ${new Date(parseInt(resetTime)).toISOString()} before retry...`, error);
          await sleep(waitTime);
          continue;
        }
        // If no reset time available, wait 60 seconds
        console.log('Rate limited. Waiting 60 seconds', error);
        await sleep(60000);
        continue;
      }
      throw error; // Re-throw other errors
    }
  }
  throw new Error(`Failed to get response after ${maxRetries} retries`);
}

const gameStep = async (ticTacToe: TicTacToe, chat: AugmentedChatMessage[], turn: PLAYER, matchup: { X: string, O: string }) => {
  chat.push({
    role: "developer",
    content: `It's ${turn}'s turn. Open fields: ${ticTacToe.getOpenFields().join(", ")}. The current board is: ${ticTacToe.toString()}`,
    visibleTo: ['X', 'O'],
  });
  
  const response = await retryChatCompletion({
    model: matchup[turn],
    messages: formatChatForPlayer(chat, turn),
  });

  // some models reason but don't respond
  const message = ((response?.choices?.[0]?.message as { reasoning?: string })?.reasoning || '') + (response?.choices?.[0]?.message?.content || '');
  if (message === null || message === undefined) 
    throw new Error(`No response: ${JSON.stringify(response)}`);
  
  chat.push({
    role: "assistant",
    content: message,
    visibleTo: [turn],
    model: matchup[turn],
    author: turn,
  });
  const move: POSITION | undefined = message
    .split(/\W+/)
    .reverse() // we want the last mentioned move
    .filter(Boolean)
    .filter((word) => (ticTacToe.getOpenFields() as string[]).includes(word))
    .pop() as POSITION | undefined;
  if (move) {
    ticTacToe.take(move, turn);
  } else {
    console.error(`No move for response, skipping turn: ${message}`);
  }
  console.log({ chat, move, winner: ticTacToe.getWinner(), board: ticTacToe.getBoard() });
}

const playMatchup = async (matchup: { X: string, O: string }) => {
  console.log(`Playing ${matchup.X} vs ${matchup.O}`);
  const ticTacToe = new TicTacToe();
  const chat: AugmentedChatMessage[] = [];
  let hadError: PLAYER | null = null;
  chat.push({
    role: "developer",
    content: `You are playing Tic Tac Toe. You play by responding with the field you want to take. The last field you mention will be taken as your move. The fields are: ${ticTacToe.getOpenFields().join(", ")}.`,
    visibleTo: ['X', 'O'],
  });
  chat.push({
    role: "developer",
    content: `You are X. Your opponent is O.`,
    visibleTo: ['X'],
  });
  chat.push({
    role: "developer",
    content: `You are O. Your opponent is X.`,
    visibleTo: ['O'],
  });

  let turn: PLAYER = 'X';

  while (!ticTacToe.isFull() && !ticTacToe.getWinner()) {
    try {
      await gameStep(ticTacToe, chat, turn, matchup);
      turn = turn === 'X' ? 'O' : 'X';
    } catch (error) {
      // TODO if throttled, wait and retry
      chat.push({
        role: "developer",
        content: `Error playing matchup: ${error}`,
        visibleTo: ['X', 'O'],
      });
      hadError = turn;
      break;
    }
  }
  fs.writeFileSync(`./matches/${modelNameToFileName(matchup.X)}#${modelNameToFileName(matchup.O)}.json`, JSON.stringify({
    timestamp: new Date().toISOString(),
    chat,
    hadError,
    winner: ticTacToe.getWinner(),
    board: ticTacToe.getBoard(),
    matchup,
  }, null, 2));
}

const main = async () => {
  const allMatchups = await generateMatchups(models);
  if (!fs.existsSync("./matches")) {
    fs.mkdirSync("./matches", { recursive: true });
  }
  const completedMatchups = getCompletedMatchups();
  const matchups = _.shuffle(allMatchups).filter((matchup) => !completedMatchups.some((completedMatchup) => 
    completedMatchup.X === modelNameToFileName(matchup.X) && completedMatchup.O === modelNameToFileName(matchup.O)
  ));
  console.log({ matchups, completedMatchups });

  for (const matchup of matchups) {
    await playMatchup(matchup);
  }
}

if (require.main === module) {
  main();
}
