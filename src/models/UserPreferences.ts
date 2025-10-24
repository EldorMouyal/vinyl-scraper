export interface UserPreferences {
  artists: string[];
  genres: string[];
  albums: string[];
}

export interface UserPreferenceRecord {
  id?: number;
  type: 'artist' | 'genre' | 'album';
  value: string;
  createdAt: Date;
}