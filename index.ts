import fs from "fs";
import OpenAI from "openai";
import z from "zod";

import { TicTacToe, type PLAYER, type POSITION } from "./tictactoe";

const env = z.object({
  OPENROUTER_API_KEY: z.string(),
}).parse(process.env);

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: env.OPENROUTER_API_KEY,
});

const listTextModelIds = async () => {
  const response = await openai.models.list();
  return response.data.filter((model: any) =>
    model.architecture.input_modalities.includes('text') &&
    model.architecture.output_modalities.includes('text')
  ).map((model) => model.id);
};

const generateMatchups = async (modelIds: string[]) => {
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
      const formattedMessage = {
        role: message.role,
        content: message.content,
      }
      if (message.role === "developer") {
        // leave role as is
      } else if (message.author === player) {
        formattedMessage.role = "assistant";
      } else {
        formattedMessage.role = "user";
      }
      return formattedMessage;
    })
}

const modelNameToFileName = (modelName: string) => {
  return modelName.replaceAll("/", "_").replaceAll(".", "$");
}

const fileNameToModelName = (fileName: string) => {
  return fileName.replaceAll("_", "/").replaceAll("$", ".");
}

const main = async () => {
  // const modelIds = await listTextModelIds();
  const allMatchups = await generateMatchups([
    "x-ai/grok-3-mini-beta",
    "anthropic/claude-3.7-sonnet",
  ]);
  if (!fs.existsSync("./matches")) {
    fs.mkdirSync("./matches", { recursive: true });
  }
  const completedMatchups = fs.readdirSync("./matches")
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.split(".")?.[0]?.split("#").map((x) => x.trim()) as [string, string])
    .map(([x, o]) => ({ X: x, O: o }));
  const matchups = allMatchups.filter((matchup) => !completedMatchups.some((completedMatchup) => 
    completedMatchup.X === modelNameToFileName(matchup.X) && completedMatchup.O === modelNameToFileName(matchup.O)
  ));
  console.log({ matchups, completedMatchups });

  for (const matchup of matchups) {
    console.log(`Playing ${matchup.X} vs ${matchup.O}`);
    const ticTacToe = new TicTacToe();
    const chat: AugmentedChatMessage[] = [];
    chat.push({
      role: "system",
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
      chat.push({
        role: "developer",
        content: `It's ${turn}'s turn. Open fields: ${ticTacToe.getOpenFields().join(", ")}. The current board is: ${ticTacToe.toString()}`,
        visibleTo: ['X', 'O'],
      });
      const response = (await openai.chat.completions.create({
        model: matchup[turn],
        messages: formatChatForPlayer(chat, turn),
      }))?.choices?.[0]?.message?.content;
      if (!response) throw new Error("No response");
      chat.push({
        role: "assistant",
        content: response,
        visibleTo: [turn],
        model: matchup[turn],
      });
      const move: POSITION | undefined = response
        .split(/\W+/)
        .reverse() // we want the last mentioned move
        .filter(Boolean)
        .filter((word) => (ticTacToe.getOpenFields() as string[]).includes(word))
        .pop() as POSITION | undefined;
      if (move) {
        ticTacToe.take(move, turn);
      } 
      else {
        console.error(`No move for response, skipping turn: ${response}`);
      }
      turn = turn === 'X' ? 'O' : 'X';
      console.log({ chat, move, winner: ticTacToe.getWinner(), board: ticTacToe.getBoard() });
    }
    fs.writeFileSync(`./matches/${modelNameToFileName(matchup.X)}#${modelNameToFileName(matchup.O)}.json`, JSON.stringify({
      timestamp: new Date().toISOString(),
      chat,
      winner: ticTacToe.getWinner(),
      board: ticTacToe.getBoard(),
      matchup,
    }, null, 2));
  }
}

main();
