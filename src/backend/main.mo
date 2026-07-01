import Map "mo:core/Map";

import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import MixinViews "mo:caffeineai-data-viewer/MixinViews";
import HeatRiskStore "lib/heatRiskStore";
import HeatRiskApiMixin "mixins/heat-risk-api";
import PinStore "lib/pinStore";
import PinApiMixin "mixins/pin-api";
import ExternalApiMixin "mixins/external-api";
import GovDataApiMixin "mixins/gov-data-api";
import Migration "migration";


(with migration = Migration.run)
actor {
  // Stable state: idCounter (migrated from old nextPinId) and pins map (preserved)
  var idCounter = { var next = 0 };
  var pins = Map.empty<PinStore.PinId, PinStore.Pin>();

  // Stable state: heat-risk areas (new in this version)
  var heatRiskIdCounter = { var next = 0 };
  var heatRiskAreas = Map.empty<HeatRiskStore.HeatRiskAreaId, HeatRiskStore.HeatRiskArea>();

  var accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState, null);
  include MixinViews();

  transient let store : PinStore.Store = {
    pins;
    idCounter;
  };

  transient let heatRiskStore : HeatRiskStore.Store = {
    areas = heatRiskAreas;
    idCounter = heatRiskIdCounter;
  };

  include PinApiMixin(store);
  include HeatRiskApiMixin(heatRiskStore);
  include ExternalApiMixin();
  include GovDataApiMixin();
};
