import Time "mo:core/Time";

module {
  public type PinId = Nat;

  public type Pin = {
    id : PinId;
    title : Text;
    description : Text;
    latitude : Float;
    longitude : Float;
    createdAt : Time.Time;
  };

  public type PinInput = {
    title : Text;
    description : Text;
    latitude : Float;
    longitude : Float;
  };

  // ===== Heat-risk domain (hyperlocal risk forecasting) =====
  public type HeatRiskAreaId = Nat;

  public type HeatRiskArea = {
    id : HeatRiskAreaId;
    title : Text;
    latitude : Float;
    longitude : Float;
    radiusMeters : Float;
    riskScore : Nat;
    apparentTemp : Float;
    vegetationFactor : Float;
    buildingFactor : Float;
    baseTemp : Float;
    riskLevel : Text;
    recommendedShelters : Nat;
    recommendedGreenArea : Float;
    communityDensityFactor : Float;
    createdAt : Time.Time;
  };

  public type HeatRiskAreaInput = {
    title : Text;
    latitude : Float;
    longitude : Float;
    radiusMeters : Float;
    communityDensityFactor : ?Float;
  };

  // ===== External API domain (geocoding + wildfire detection) =====

  // Bounding box for area-based queries (wildfire fetch).
  public type BBox = {
    minLat : Float;
    minLng : Float;
    maxLat : Float;
    maxLng : Float;
  };

  // A single geocoded place result. The backend returns the raw Nominatim JSON
  // in `GeocodeResult.rawJson` for the frontend to parse into `GeocodePlace`
  // records (Motoko core has no JSON parser).
  public type GeocodePlace = {
    name : Text;
    lat : Float;
    lng : Float;
    country : Text;
  };

  public type GeocodeResult = {
    rawJson : Text;
    results : [GeocodePlace];
  };

  // A single wildfire detection point parsed from NASA FIRMS CSV.
  public type WildfirePoint = {
    lat : Float;
    lng : Float;
    brightness : Float;
    confidence : Nat;
    acqDate : Text;
    satellite : Text;
  };

  public type WildfireResponse = {
    fires : [WildfirePoint];
  };

  // ===== Government data domain (real-time gov API plugin) =====

  // จุดข้อมูลเดี่ยวจากแหล่งข้อมูลรัฐบาล (เช่น กรมอุตุนิยมวิทยา, กรมป่าไม้)
  public type GovDataPoint = {
    lat : Float;
    lng : Float;
    value : Float;
    name : Text;
    source : Text;
  };

  // การตอบกลับจาก fetchGovData — เมื่อยังไม่มี API จริง จะคืนค่า fallback
  // ที่ success = false, points = [], source = "mock", fetchedAt = 0, error = ""
  // เพื่อให้ frontend แยกแยะสถานะข้อมูลได้
  public type GovDataResponse = {
    success : Bool;
    points : [GovDataPoint];
    source : Text;
    fetchedAt : Int;
    error : Text;
  };
};
