// Mock (fake) data in the same shape that Trafikverket returns.
// Used when there is NO API key, so the app still works and the whole
// flow (input -> process -> output) can be tested without a key.

// Same schema as the real API's objecttype="TrainAnnouncement".
export const mockAnnouncements = [
  {
    AdvertisedTrainIdent: "523",
    ToLocation: [{ LocationName: "G" }],
    AdvertisedTimeAtLocation: "2026-06-17T14:05:00.000+02:00",
    EstimatedTimeAtLocation: "2026-06-17T14:11:00.000+02:00",
    TrackAtLocation: "12",
    Canceled: false,
  },
  {
    AdvertisedTrainIdent: "1044",
    ToLocation: [{ LocationName: "M" }],
    AdvertisedTimeAtLocation: "2026-06-17T14:20:00.000+02:00",
    EstimatedTimeAtLocation: null,
    TrackAtLocation: "5",
    Canceled: false,
  },
  {
    AdvertisedTrainIdent: "87",
    ToLocation: [{ LocationName: "U" }],
    AdvertisedTimeAtLocation: "2026-06-17T14:35:00.000+02:00",
    EstimatedTimeAtLocation: "2026-06-17T14:35:00.000+02:00",
    TrackAtLocation: "8",
    Canceled: true,
  },
];

// Same schema as objecttype="TrainStation".
export const mockStations = [
  { LocationSignature: "Cst", AdvertisedLocationName: "Stockholm Central" },
  { LocationSignature: "G", AdvertisedLocationName: "Göteborg Central" },
  { LocationSignature: "M", AdvertisedLocationName: "Malmö Central" },
  { LocationSignature: "U", AdvertisedLocationName: "Uppsala Central" },
];
