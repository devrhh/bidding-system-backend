export interface BidUpdateData {
  auctionId: number;
  newHighestBid: number;
  bidderId: number;
  bidderName: string;
  timeLeft: number;
  timeLeftFormatted: string;
  totalBids: number;
}

export interface AuctionUpdateData {
  auctionId: number;
  name: string;
  currentHighestBid: number;
  timeLeft: number;
  timeLeftFormatted: string;
  totalBids: number;
  isExpired: boolean;
}

export interface NewAuctionData {
  auctionId: number;
  name: string;
  description: string;
  startingPrice: number;
  auctionEndTime: Date;
  timeLeft: number;
  timeLeftFormatted: string;
}

export interface UserCountData {
  auctionId: number;
  count: number;
}

// WebSocket event names
export const WEBSOCKET_EVENTS = {
  BID_UPDATE: 'bidUpdate',
  GLOBAL_BID_UPDATE: 'globalBidUpdate',
  AUCTION_UPDATE: 'auctionUpdate',
  GLOBAL_AUCTION_UPDATE: 'globalAuctionUpdate',
  NEW_AUCTION: 'newAuction',
  USER_COUNT: 'userCount',
  JOIN_AUCTION: 'joinAuction',
  LEAVE_AUCTION: 'leaveAuction',
} as const; 