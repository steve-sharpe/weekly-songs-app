export type PlaylistTrack = {
  id: number;
  title: string;
  trackTitle: string;
  artistName: string;
  photoUrl: string | null;
  albumName: string | null;
  releaseYear: number | null;
  genre: string | null;
  durationSeconds: number | null;
  mimeType: string;
  streamUrl: string;
  webViewLink: string | null;
};

export type WeeklyPlaylist = {
  weekStart: string;
  cycleNumber: number;
  createdAt: string;
  tracks: PlaylistTrack[];
};
