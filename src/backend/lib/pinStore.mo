import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Types "../types";

module {
  public type PinId = Types.PinId;
  public type Pin = Types.Pin;
  public type PinInput = Types.PinInput;

  public func compare(pin1 : Pin, pin2 : Pin) : Order.Order {
    Nat.compare(pin1.id, pin2.id);
  };

  public type IdCounter = { var next : PinId };

  public type Store = {
    pins : Map.Map<PinId, Pin>;
    idCounter : IdCounter;
  };

  public func newStore() : Store {
    {
      pins = Map.empty();
      idCounter = { var next = 0 };
    };
  };

  public func generateId(self : Store) : PinId {
    let id = self.idCounter.next;
    self.idCounter.next += 1;
    id;
  };

  public func create(self : Store, input : PinInput) : PinId {
    let id = generateId(self);
    let pin : Pin = {
      input with
      id;
      createdAt = Time.now();
    };
    self.pins.add(id, pin);
    id;
  };

  public func read(self : Store, id : PinId) : Pin {
    switch (self.pins.get(id)) {
      case (null) { Runtime.trap("Pin not found") };
      case (?pin) { pin };
    };
  };

  public func update(self : Store, id : PinId, input : PinInput) : () {
    switch (self.pins.get(id)) {
      case (null) { Runtime.trap("Pin not found") };
      case (?existingPin) {
        let updatedPin : Pin = {
          input with
          id = existingPin.id;
          createdAt = existingPin.createdAt;
        };
        self.pins.add(id, updatedPin);
      };
    };
  };

  public func delete(self : Store, id : PinId) : () {
    if (not self.pins.containsKey(id)) {
      Runtime.trap("Pin not found");
    };
    self.pins.remove(id);
  };

  public func list(self : Store) : [Pin] {
    self.pins.values().toArray().sort();
  };
};
