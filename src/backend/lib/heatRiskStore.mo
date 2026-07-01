import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Types "../types";

module {
  public type HeatRiskAreaId = Types.HeatRiskAreaId;
  public type HeatRiskArea = Types.HeatRiskArea;
  public type HeatRiskAreaInput = Types.HeatRiskAreaInput;

  public func compare(area1 : HeatRiskArea, area2 : HeatRiskArea) : Order.Order {
    Nat.compare(area1.id, area2.id);
  };

  public type IdCounter = { var next : HeatRiskAreaId };

  public type Store = {
    areas : Map.Map<HeatRiskAreaId, HeatRiskArea>;
    idCounter : IdCounter;
  };

  public func newStore() : Store {
    {
      areas = Map.empty();
      idCounter = { var next = 0 };
    };
  };

  public func generateId(self : Store) : HeatRiskAreaId {
    let id = self.idCounter.next;
    self.idCounter.next += 1;
    id;
  };

  public func create(
    self : Store,
    input : HeatRiskAreaInput,
    riskScore : Nat,
    apparentTemp : Float,
    vegetationFactor : Float,
    buildingFactor : Float,
    baseTemp : Float,
    riskLevel : Text,
    recommendedShelters : Nat,
    recommendedGreenArea : Float,
    communityDensityFactor : Float,
  ) : HeatRiskAreaId {
    let id = generateId(self);
    let area : HeatRiskArea = {
      input with
      id;
      riskScore;
      apparentTemp;
      vegetationFactor;
      buildingFactor;
      baseTemp;
      riskLevel;
      recommendedShelters;
      recommendedGreenArea;
      communityDensityFactor;
      createdAt = Time.now();
    };
    self.areas.add(id, area);
    id;
  };

  public func read(self : Store, id : HeatRiskAreaId) : HeatRiskArea {
    switch (self.areas.get(id)) {
      case (null) { Runtime.trap("ไม่พบพื้นที่ความเสี่ยง") };
      case (?area) { area };
    };
  };

  public func update(
    self : Store,
    id : HeatRiskAreaId,
    input : HeatRiskAreaInput,
    riskScore : Nat,
    apparentTemp : Float,
    vegetationFactor : Float,
    buildingFactor : Float,
    baseTemp : Float,
    riskLevel : Text,
    recommendedShelters : Nat,
    recommendedGreenArea : Float,
    communityDensityFactor : Float,
  ) : () {
    switch (self.areas.get(id)) {
      case (null) { Runtime.trap("ไม่พบพื้นที่ความเสี่ยง") };
      case (?existing) {
        let updated : HeatRiskArea = {
          input with
          id = existing.id;
          riskScore;
          apparentTemp;
          vegetationFactor;
          buildingFactor;
          baseTemp;
          riskLevel;
          recommendedShelters;
          recommendedGreenArea;
          communityDensityFactor;
          createdAt = existing.createdAt;
        };
        self.areas.add(id, updated);
      };
    };
  };

  public func delete(self : Store, id : HeatRiskAreaId) : () {
    if (not self.areas.containsKey(id)) {
      Runtime.trap("ไม่พบพื้นที่ความเสี่ยง");
    };
    self.areas.remove(id);
  };

  public func list(self : Store) : [HeatRiskArea] {
    self.areas.values().toArray().sort();
  };
};
