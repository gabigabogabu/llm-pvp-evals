import _ from 'lodash';

type Card = {
  rank: string;
  suit: string;
  value: number;
}

const CARDS: Card[] = ['HEART', 'DIAMOND', 'CLUB', 'SPADE'].map((suit) => ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'JACK', 'QUEEN', 'KING', 'ACE'].map((rank) => ({
  rank,
  suit,
  value: rank === 'ACE' ? 14 : rank === 'KING' ? 13 : rank === 'QUEEN' ? 12 : rank === 'JACK' ? 11 : parseInt(rank),
}))).flat();
console.log(CARDS);
console.log(CARDS.length);

/**
 * Royal flush: 10-J-Q-K-A, same suit
 * @param cards 
 */
const isRoyalFlush = (cards: typeof CARDS): boolean => {
}

/**
 * Straight flush: Five consecutive cards, same suit
 * @param cards 
 */
const isStraightFlush = (cards: typeof CARDS): boolean => {
}

/**
 * Four of a kind: Four cards of the same rank
 * @param cards 
 */
const isFourOfAKind = (cards: typeof CARDS): boolean => {
}

/**
 * Full house: Three cards of one rank, two cards of another rank
 * @param cards 
 */
const isFullHouse = (cards: typeof CARDS): boolean => {
}

/**
 * Flush: All cards of the same suit
 * @param cards 
 */
const isFlush = (cards: typeof CARDS): boolean => {
}

/**
 * Straight: Five consecutive cards, mixed suits
 * @param cards 
 */
const isStraight = (cards: typeof CARDS): boolean => {
}

/**
 * Three of a kind: Three cards of the same rank
 * @param cards 
 */
const isThreeOfAKind = (cards: typeof CARDS): boolean => {
}

/**
 * Two pair: Two cards of one rank, two cards of another rank
 * @param cards 
 */
const isTwoPair = (cards: typeof CARDS): boolean => {
}

/**
 * One pair: Two cards of the same rank
 * @param cards 
 */
const isOnePair = (cards: typeof CARDS): boolean => {
}

class HoleCards {
  cards: Card[];

  constructor(first: Card, second: Card) {
    this.cards = [first, second];
  }
}

class CommunityCards {
  cards: Card[];

  constructor() {
    this.cards = [];
  }

  showCards() {
    return this.cards;
  }

  addCard(card: Card) {
    this.cards.push(card);
  }

  returnCards() {
    const cards = this.cards;
    this.cards = [];
    return cards;
  }
}

class Player {
  holeCards: HoleCards | null;
  chips: number; 

  constructor(chips: number) {
    this.holeCards = null;
    this.chips = chips;
  }

  giveHoleCards(cards: HoleCards) {
    this.holeCards = cards;
  }

  returnHoleCards() {
    const cards = this.holeCards;
    this.holeCards = null;
    return cards;
  }
}

class Game {
  players: Player[];
  communityCards: CommunityCards | null; 
  deck: Card[];
  pot: number;
  
  constructor(players: Player[]) {
    this.players = players;
    this.communityCards = null;
    this.deck = _.shuffle(CARDS);
    this.pot = 0;
  }

  blinds(small: number, big: number) {
    this.players[0].chips -= small;
    this.players[1].chips -= big;
    this.pot += small + big;
  }

  preFlop() {
    this.players.forEach((player) => {
      player.giveHoleCards(new HoleCards(this.deck.pop() as Card, this.deck.pop() as Card));
    });
  }

  flop() {
    this.communityCards = new CommunityCards([this.deck.pop() as Card, this.deck.pop() as Card, this.deck.pop() as Card]);
  }

  private dealCommunityCard() {
    this.communityCards.addCard(this.deck.pop() as Card);
  }

  turn() {
    this.dealCommunityCard();
  }

  river() {
    this.dealCommunityCard();
  }
  
}