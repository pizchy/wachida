import PinStore "../lib/pinStore";
import Types "../types";

mixin (store : PinStore.Store) {
  public shared ({ caller }) func createPin(input : Types.PinInput) : async Types.PinId {
    ignore caller;
    store.create(input);
  };

  public query ({ caller }) func readPin(id : Types.PinId) : async Types.Pin {
    ignore caller;
    store.read(id);
  };

  public shared ({ caller }) func updatePin(id : Types.PinId, input : Types.PinInput) : async () {
    ignore caller;
    store.update(id, input);
  };

  public shared ({ caller }) func deletePin(id : Types.PinId) : async () {
    ignore caller;
    store.delete(id);
  };

  public query ({ caller }) func listPins() : async [Types.Pin] {
    ignore caller;
    store.list();
  };
};
