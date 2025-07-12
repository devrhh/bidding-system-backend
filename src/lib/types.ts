export type ActiveAuctionWithTimeLeft = {
  id: number;
  name: string;
  description: string;
  startingPrice: number;
  currentHighestBid: number;
  timeLeft: number;
  timeLeftFormatted: string;
  isExpired: boolean;
  totalBids: number;
  highestBidder: {
    id: number;
    name: string;
    amount: number;
  } | null;
  auctionEndTime: Date;
};