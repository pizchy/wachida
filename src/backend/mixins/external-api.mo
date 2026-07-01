import Array "mo:core/Array";
import Debug "mo:core/Debug";
import Float "mo:core/Float";
import Int "mo:core/Int";
import Iter "mo:core/Iter";
import Nat "mo:core/Nat";
import OutCall "mo:caffeineai-http-outcalls/outcall";
import Text "mo:core/Text";
import Types "../types";

mixin () {
  // Transform callback required by the IC for HTTP outcalls. Must be a query
  // function so the replica can call it on each subnet to sanitise the response.
  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // Geocode a free-text place query via Nominatim/OpenStreetMap.
  // Returns the raw JSON body from Nominatim in `rawJson` so the frontend can
  // parse the structured place list (Motoko has no JSON parser in core).
  public shared ({ caller }) func geocodeSearch(q : Text) : async Types.GeocodeResult {
    ignore caller;
    let trimmed = q.trim(#char ' ');
    if (trimmed == "") {
      return { rawJson = "[]"; results = [] };
    };
    let encoded = _urlEncode(trimmed);
    let url = "https://nominatim.openstreetmap.org/search?q=" # encoded # "&format=json&limit=5&accept-language=th";
    let headers = [
      { name = "User-Agent"; value = "TerraFrame/1.0 (heat-risk mapping)" },
      { name = "Accept"; value = "application/json" },
    ];
    let rawJson = try {
      await OutCall.httpGetRequest(url, headers, transform);
    } catch (_) {
      "[]";
    };
    { rawJson; results = [] };
  };

  // Fetch recent wildfire detections from NASA FIRMS for a bounding box.
  // Parses the CSV response into structured WildfirePoint records.
  public shared ({ caller }) func fetchWildfireData(bbox : Types.BBox) : async Types.WildfireResponse {
    ignore caller;
    // FIRMS area endpoint expects bbox as: west,south,east,north (lng,lat,lng,lat)
    let bboxText = bbox.minLng.toText() # "," # bbox.minLat.toText() # "," # bbox.maxLng.toText() # "," # bbox.maxLat.toText();
    // MAP_KEY left empty to use the public sample endpoint; on failure we return empty fires.
    let url = "https://firms.modaps.eosdis.nasa.gov/api/area/csv/VIIRS_SNPP/" # bboxText # "/1";
    let headers = [{ name = "Accept"; value = "text/csv" }];
    let csv = try {
      await OutCall.httpGetRequest(url, headers, transform);
    } catch (_) {
      return { fires = [] };
    };
    { fires = _parseFirmsCsv(csv) };
  };

  // ---- CSV parsing helpers (NASA FIRMS area CSV format) ----
  // Header columns include: latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,confidence,...
  // We extract: lat, lng, brightness (bright_ti4), confidence (Nat), acqDate (acq_date), satellite.

  func _parseFirmsCsv(csv : Text) : [Types.WildfirePoint] {
    let lines = csv.split(#char '\n').toArray();
    if (lines.size() < 2) { return [] };
    // Find header to locate column indices.
    let header = _parseCsvRow(lines[0]);
    let latIdx = _indexOf(header, "latitude");
    let lngIdx = _indexOf(header, "longitude");
    let brightIdx = _indexOf(header, "bright_ti4");
    let confIdx = _indexOf(header, "confidence");
    let dateIdx = _indexOf(header, "acq_date");
    let satIdx = _indexOf(header, "satellite");
    if (latIdx == null or lngIdx == null) { return [] };
    let latI = _unwrap(latIdx);
    let lngI = _unwrap(lngIdx);
    let brightI = _unwrap(brightIdx);
    let confI = _unwrap(confIdx);
    let dateI = _unwrap(dateIdx);
    let satI = _unwrap(satIdx);
    var points : [Types.WildfirePoint] = [];
    for (i in Nat.range(1, lines.size())) {
      let row = _parseCsvRow(lines[i]);
      if (row.size() > latI and row.size() > lngI) {
        let lat = _parseFloat(row[latI]);
        let lng = _parseFloat(row[lngI]);
        let brightness = if (row.size() > brightI) { _parseFloat(row[brightI]) } else { 0.0 };
        let confidence = if (row.size() > confI) { _parseConfidence(row[confI]) } else { 0 };
        let acqDate = if (row.size() > dateI) { row[dateI] } else { "" };
        let satellite = if (row.size() > satI) { row[satI] } else { "" };
        if (lat != 0.0 or lng != 0.0) {
          points := points.concat([{
            lat;
            lng;
            brightness;
            confidence;
            acqDate;
            satellite;
          }]);
        };
      };
    };
    points;
  };

  // Split a single CSV line by commas. Does not handle quoted fields containing
  // commas (FIRMS CSV does not quote fields), which is sufficient for this API.
  func _parseCsvRow(line : Text) : [Text] {
    let trimmed = line.trimEnd(#char '\r');
    trimmed.split(#char ',').toArray();
  };

  func _indexOf(arr : [Text], key : Text) : ?Nat {
    var i = 0;
    for (v in arr.vals()) {
      if (v == key) { return ?i };
      i += 1;
    };
    null;
  };

  func _unwrap(opt : ?Nat) : Nat {
    switch (opt) {
      case (?n) { n };
      case null { 0 };
    };
  };

  func _parseFloat(text : Text) : Float {
    // mo:core/Float v2.5.0 has no fromText. Parse manually: split on '.',
    // parse integer and fractional parts via Int.fromText/Nat.fromText, then
    // combine as Float.fromInt(intPart) + Float.fromInt(fracPart) / 10^digits.
    let trimmed = text.trim(#char ' ');
    if (trimmed == "") { return 0.0 };
    // Handle optional leading sign.
    var sign : Float = 1.0;
    var body : Text = trimmed;
    if (body.startsWith(#char '-')) {
      sign := -1.0;
      body := body.trimStart(#char '-');
    } else if (body.startsWith(#char '+')) {
      body := body.trimStart(#char '+');
    };
    // Split on the decimal point.
    let parts = body.split(#char '.').toArray();
    let intPart : Int = switch (parts.size()) {
      case 0 { 0 };
      case _ {
        switch (Int.fromText(parts[0])) {
          case (?n) { n };
          case null { 0 };
        };
      };
    };
    var fracValue : Float = 0.0;
    if (parts.size() >= 2) {
      let fracText = parts[1];
      switch (Nat.fromText(fracText)) {
        case (?n) {
          var divisor : Float = 1.0;
          var digits = fracText.size();
          while (digits > 0) {
            divisor := divisor * 10.0;
            digits -= 1;
          };
          fracValue := Float.fromInt(n) / divisor;
        };
        case null { fracValue := 0.0 };
      };
    };
    sign * (Float.fromInt(intPart) + fracValue);
  };

  // FIRMS confidence can be numeric (0-100) or nominal (l/n/h). Map nominal to
  // 30/60/90 respectively; unparseable becomes 0.
  func _parseConfidence(text : Text) : Nat {
    switch (text) {
      case "l" { 30 };
      case "n" { 60 };
      case "h" { 90 };
      case (_) {
        switch (Nat.fromText(text)) {
          case (?n) { n };
          case null { 0 };
        };
      };
    };
  };

  // Minimal URL-encoder for query strings: percent-encode spaces and a few
  // reserved characters. Sufficient for free-text place queries.
  func _urlEncode(text : Text) : Text {
    var out = "";
    for (c in text.chars()) {
      out := out # _encodeChar(c);
    };
    out;
  };

  func _encodeChar(c : Char) : Text {
    if (c == ' ') { "%20" }
    else if (c == '#') { "%23" }
    else if (c == '&') { "%26" }
    else if (c == '?') { "%3F" }
    else if (c == '=') { "%3D" }
    else if (c == '+') { "%2B" }
    else if (c == '/') { "%2F" }
    else if (c == ',') { "%2C" }
    else { Text.fromChar(c) };
  };
};
