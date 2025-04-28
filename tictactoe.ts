export type PLAYER = "X" | "O";
export type FIELD_CONTENT = " " | PLAYER;

export type POSITION = "TOP_LEFT" | "TOP_CENTER" | "TOP_RIGHT" | "MIDDLE_LEFT" | "MIDDLE_CENTER" | "MIDDLE_RIGHT" | "BOTTOM_LEFT" | "BOTTOM_CENTER" | "BOTTOM_RIGHT";

export class TicTacToe {
  private static readonly EMPTY_BOARD: Record<POSITION, FIELD_CONTENT> = {
    "TOP_LEFT": " ",
    "TOP_CENTER": " ",
    "TOP_RIGHT": " ",
    "MIDDLE_LEFT": " ",
    "MIDDLE_CENTER": " ",
    "MIDDLE_RIGHT": " ",
    "BOTTOM_LEFT": " ",
    "BOTTOM_CENTER": " ",
    "BOTTOM_RIGHT": " ",
  }

  private board = {...TicTacToe.EMPTY_BOARD};

  constructor() {}

  public take(position: POSITION, player: PLAYER) {
    if (this.board[position] !== " ") throw new Error("POSITION_ALREADY_OCCUPIED");
    this.board[position] = player;
  }

  public getOpenFields(): POSITION[] {
    return Object.keys(this.board).filter((key) => this.board[key as POSITION] === " ") as POSITION[];
  }
  
  public getWinner(): PLAYER | null {
    const winConditions = [
      // rows
      ["TOP_LEFT", "TOP_CENTER", "TOP_RIGHT"],
      ["MIDDLE_LEFT", "MIDDLE_CENTER", "MIDDLE_RIGHT"],
      ["BOTTOM_LEFT", "BOTTOM_CENTER", "BOTTOM_RIGHT"],
      // columns
      ["TOP_LEFT", "MIDDLE_LEFT", "BOTTOM_LEFT"],
      ["TOP_CENTER", "MIDDLE_CENTER", "BOTTOM_CENTER"],
      ["TOP_RIGHT", "MIDDLE_RIGHT", "BOTTOM_RIGHT"],
      // diagonals
      ["TOP_LEFT", "MIDDLE_CENTER", "BOTTOM_RIGHT"],
      ["TOP_RIGHT", "MIDDLE_CENTER", "BOTTOM_LEFT"],
    ];

    for (const condition of winConditions) {
      const [a, b, c] = condition;
      if (this.board[a] !== " " && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
        return this.board[a];
      }
    }
    return null;
  }

  public isFull(): boolean {
    return Object.values(this.board).every((value) => value !== " ");
  }

  public toString(): string {
    return `<tic-tac-toe>
${Object.entries(this.board).map(([key, value]) => `  <${key}>${value}</${key}>`).join("\n")}
</tic-tac-toe>`;
  }
  
  public getBoard(): Record<POSITION, FIELD_CONTENT> {
    return this.board;
  }
}

if (require.main === module) {
  const ticTacToe = new TicTacToe();
  ticTacToe.take("TOP_LEFT", "X");
  ticTacToe.take("TOP_CENTER", "X");
  ticTacToe.take("TOP_RIGHT", "X");
  console.log(ticTacToe.toString());
  console.log(ticTacToe.getWinner());
}