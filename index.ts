type PLAYER = "X" | "O";
type FIELD_CONTENT = " " | PLAYER;

type POSITION = "TOP_LEFT" | "TOP_CENTER" | "TOP_RIGHT" | "MIDDLE_LEFT" | "MIDDLE_CENTER" | "MIDDLE_RIGHT" | "BOTTOM_LEFT" | "BOTTOM_CENTER" | "BOTTOM_RIGHT";

class TicTacToe {
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

  private board = TicTacToe.EMPTY_BOARD;

  constructor() {}

  public reset() {
    this.board = TicTacToe.EMPTY_BOARD;
  }

  public move(position: POSITION, player: PLAYER) {
    if (this.board[position] !== " ") throw new Error("POSITION_ALREADY_OCCUPIED");
    this.board[position] = player;
  }
  
  public getWinner(): PLAYER | null {
    const lines = [
      ["TOP_LEFT", "TOP_CENTER", "TOP_RIGHT"],
      ["MIDDLE_LEFT", "MIDDLE_CENTER", "MIDDLE_RIGHT"],
      ["BOTTOM_LEFT", "BOTTOM_CENTER", "BOTTOM_RIGHT"],
    ];

    for (const line of lines) {
      const [a, b, c] = line;
      if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
        return this.board[a];
      }
    }

    const columns = [
      ["TOP_LEFT", "MIDDLE_LEFT", "BOTTOM_LEFT"],
      ["TOP_CENTER", "MIDDLE_CENTER", "BOTTOM_CENTER"],
      ["TOP_RIGHT", "MIDDLE_RIGHT", "BOTTOM_RIGHT"],
    ];

    for (const column of columns) {
      const [a, b, c] = column;
      if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
        return this.board[a];
      }
    }
    
    const diagonals = [
      ["TOP_LEFT", "MIDDLE_CENTER", "BOTTOM_RIGHT"],
      ["TOP_RIGHT", "MIDDLE_CENTER", "BOTTOM_LEFT"],
    ];

    for (const diagonal of diagonals) {
      const [a, b, c] = diagonal;
      if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
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
  <board>
${Object.entries(this.board).map(([key, value]) => `    <${key}>${value}</${key}>`).join("\n")}
  </board>
  <meta>
    <winner>${this.getWinner()}</winner>
    <is-full>${this.isFull()}</is-full>
  </meta>
</tic-tac-toe>`;
  }
}

const main = () => {
  const ticTacToe = new TicTacToe();
  ticTacToe.move("TOP_LEFT", "X");
  ticTacToe.move("TOP_CENTER", "O");
  ticTacToe.move("TOP_RIGHT", "X");
  console.log(ticTacToe.toString());
}

main();