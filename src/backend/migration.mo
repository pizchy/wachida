import Map "mo:core/Map";
import Time "mo:core/Time";

module {
  // ===== Old types (copied from .old/src/backend/types.mo) =====
  // The previous version's HeatRiskArea already included communityDensityFactor,
  // so the old and new HeatRiskArea shapes are identical.
  public type OldHeatRiskAreaId = Nat;
  public type OldHeatRiskArea = {
    id : OldHeatRiskAreaId;
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

  public type OldPinId = Nat;
  public type OldPin = {
    id : OldPinId;
    title : Text;
    description : Text;
    latitude : Float;
    longitude : Float;
    createdAt : Time.Time;
  };

  public type OldIdCounter = { var next : Nat };

  public type OldUserRole = { #admin; #user; #guest };

  public type OldAccessControlState = {
    var adminAssigned : Bool;
    userRoles : Map.Map<Principal, OldUserRole>;
  };

  // Previous actor stable signature, taken from
  // .old/src/backend/dist/backend.most. The previous actor exposed only the
  // separate vars (accessControlState, heatRiskAreas, heatRiskIdCounter,
  // idCounter, pins) as stable fields — there were no `store` or
  // `heatRiskStore` composite stable fields.
  public type OldActor = {
    accessControlState : OldAccessControlState;
    var heatRiskAreas : Map.Map<OldHeatRiskAreaId, OldHeatRiskArea>;
    var heatRiskIdCounter : OldIdCounter;
    var idCounter : OldIdCounter;
    var pins : Map.Map<OldPinId, OldPin>;
  };

  // ===== New types =====
  public type NewPinId = Nat;
  public type NewPin = {
    id : NewPinId;
    title : Text;
    description : Text;
    latitude : Float;
    longitude : Float;
    createdAt : Time.Time;
  };

  public type NewHeatRiskArea = OldHeatRiskArea;

  public type NewAccessControlState = {
    var adminAssigned : Bool;
    userRoles : Map.Map<Principal, OldUserRole>;
  };

  // New actor stable state — same shape as the old actor. The new gov-data
  // mixin adds no stable fields, so the migration is a stable-compatible
  // identity migration.
  public type NewActor = {
    var accessControlState : NewAccessControlState;
    var heatRiskAreas : Map.Map<OldHeatRiskAreaId, NewHeatRiskArea>;
    var heatRiskIdCounter : OldIdCounter;
    var idCounter : OldIdCounter;
    var pins : Map.Map<NewPinId, NewPin>;
  };

  public func run(old : OldActor) : NewActor {
    {
      var accessControlState = old.accessControlState;
      var heatRiskAreas = old.heatRiskAreas;
      var heatRiskIdCounter = old.heatRiskIdCounter;
      var idCounter = old.idCounter;
      var pins = old.pins;
    };
  };
};
