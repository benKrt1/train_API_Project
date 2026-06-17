// A small built-in lookup of common Swedish stations (name -> signature).
//
// Why this file exists: the Trafikverket "TrainStation" dataset (which maps
// names to signatures) requires a special railway agreement (Trav-avtal) and
// is NOT available with the free Open Data key. The "TrainAnnouncement"
// dataset (departures) IS available, but it only understands the short
// "LocationSignature" code (e.g. "Cst"), not full names.
//
// So we keep this curated, verified list. Each signature below was checked
// against the live API and returns real departures. Users can also type a
// signature code directly in the search box.
export const stations = [
  { name: "Stockholm Central", signature: "Cst" },
  { name: "Göteborg Central", signature: "G" },
  { name: "Uppsala Central", signature: "U" },
  { name: "Lund Central", signature: "Lu" },
  { name: "Norrköping Central", signature: "Nr" },
  { name: "Linköping Central", signature: "Lp" },
  { name: "Örebro Central", signature: "Öb" },
  { name: "Västerås Central", signature: "Vå" },
  { name: "Gävle Central", signature: "Gä" },
  { name: "Jönköping Central", signature: "Jö" },
  { name: "Eskilstuna Central", signature: "Et" },
  { name: "Sundsvall Central", signature: "Suc" },
];
