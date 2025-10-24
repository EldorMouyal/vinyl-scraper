export interface VinylListing {
  id: string;
  title: string;
  titleDisplay: string;
  artist: string;
  artistDisplay: string;
  price: number;
  currency: string;
  condition: string;
  shippingFee?: number;
  seller: string;
  sellerDisplay: string;
  url: string;
  source: string;
  dateFound: Date;
  lastSeen: Date;
  isShipsToIsrael: boolean;
  uniqueKey: string;
  isActive: boolean;
}

export interface PriceHistory {
  id?: number;
  listingId: string;
  price: number;
  dateRecorded: Date;
}