import HeatRiskStore "../lib/heatRiskStore";
import Types "../types";

mixin (store : HeatRiskStore.Store) {
  public shared ({ caller }) func createHeatRiskArea(
    input : Types.HeatRiskAreaInput,
    riskScore : Nat,
    apparentTemp : Float,
    vegetationFactor : Float,
    buildingFactor : Float,
    baseTemp : Float,
    riskLevel : Text,
    recommendedShelters : Nat,
    recommendedGreenArea : Float,
    communityDensityFactor : ?Float,
  ) : async Types.HeatRiskAreaId {
    ignore caller;
    let density = switch (communityDensityFactor) {
      case (?v) v;
      case null 0.0;
    };
    store.create(
      input,
      riskScore,
      apparentTemp,
      vegetationFactor,
      buildingFactor,
      baseTemp,
      riskLevel,
      recommendedShelters,
      recommendedGreenArea,
      density,
    );
  };

  public query ({ caller }) func readHeatRiskArea(id : Types.HeatRiskAreaId) : async ?Types.HeatRiskArea {
    ignore caller;
    store.areas.get(id);
  };

  public shared ({ caller }) func updateHeatRiskArea(
    id : Types.HeatRiskAreaId,
    input : Types.HeatRiskAreaInput,
    riskScore : Nat,
    apparentTemp : Float,
    vegetationFactor : Float,
    buildingFactor : Float,
    baseTemp : Float,
    riskLevel : Text,
    recommendedShelters : Nat,
    recommendedGreenArea : Float,
    communityDensityFactor : ?Float,
  ) : async () {
    ignore caller;
    let density = switch (communityDensityFactor) {
      case (?v) v;
      case null 0.0;
    };
    store.update(
      id,
      input,
      riskScore,
      apparentTemp,
      vegetationFactor,
      buildingFactor,
      baseTemp,
      riskLevel,
      recommendedShelters,
      recommendedGreenArea,
      density,
    );
  };

  public shared ({ caller }) func deleteHeatRiskArea(id : Types.HeatRiskAreaId) : async () {
    ignore caller;
    store.delete(id);
  };

  public query ({ caller }) func listHeatRiskAreas() : async [Types.HeatRiskArea] {
    ignore caller;
    store.list();
  };
};
