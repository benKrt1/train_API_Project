// Mock (fake) data in the same shape that Trafikverket returns.
// Used when there is NO API key, so the app still works and the whole
// flow (input -> process -> output) can be tested without a key.

// Same schema as the real API's objecttype="TrainAnnouncement".
export const mockAnnouncements = [
  {
    AdvertisedTrainIdent: "523",
    ToLocation: [{ LocationName: "G" }],
    FromLocation: [{ LocationName: "Cst" }],
    AdvertisedTimeAtLocation: "2026-06-17T14:05:00.000+02:00",
    EstimatedTimeAtLocation: "2026-06-17T14:11:00.000+02:00",
    TrackAtLocation: "12",
    Canceled: false,
  },
  {
    AdvertisedTrainIdent: "1044",
    ToLocation: [{ LocationName: "M" }],
    FromLocation: [{ LocationName: "U" }],
    AdvertisedTimeAtLocation: "2026-06-17T14:20:00.000+02:00",
    EstimatedTimeAtLocation: null,
    TrackAtLocation: "5",
    Canceled: false,
  },
  {
    AdvertisedTrainIdent: "87",
    ToLocation: [{ LocationName: "U" }],
    FromLocation: [{ LocationName: "G" }],
    AdvertisedTimeAtLocation: "2026-06-17T14:35:00.000+02:00",
    EstimatedTimeAtLocation: "2026-06-17T14:35:00.000+02:00",
    TrackAtLocation: "8",
    Canceled: true,
  },
];

// Mock public-transport departures, already in OUR normalized shape (the
// ResRobot provider maps its raw JSON into this same shape). Used when there
// is NO RESROBOT_API_KEY so the bus/metro/tram modes still work end-to-end.
// Each entry carries a "mode" so the provider's mode filter can be tested too.
export const mockPublicTransport = [
  {
    line: "4",
    mode: "bus",
    trainNumber: "4",
    destination: "Radiohuset",
    origin: "Gullmarsplan",
    scheduledTime: "2026-06-17T14:03:00.000+02:00",
    estimatedTime: "2026-06-17T14:05:00.000+02:00",
    track: "B",
    delayMinutes: 2,
    canceled: false,
  },
  {
    line: "Röd 13",
    mode: "metro",
    trainNumber: "Röd 13",
    destination: "Ropsten",
    origin: "T-Centralen",
    scheduledTime: "2026-06-17T14:07:00.000+02:00",
    estimatedTime: "2026-06-17T14:07:00.000+02:00",
    track: "",
    delayMinutes: 0,
    canceled: false,
  },
  {
    line: "7",
    mode: "tram",
    trainNumber: "7",
    destination: "Waldemarsudde",
    origin: "Sergels torg",
    scheduledTime: "2026-06-17T14:12:00.000+02:00",
    estimatedTime: null,
    track: "",
    delayMinutes: 0,
    canceled: false,
  },
  {
    line: "172",
    mode: "bus",
    trainNumber: "172",
    destination: "Norsborg",
    origin: "Skarpnäck",
    scheduledTime: "2026-06-17T14:18:00.000+02:00",
    estimatedTime: "2026-06-17T14:18:00.000+02:00",
    track: "C",
    delayMinutes: 0,
    canceled: true,
  },
];
