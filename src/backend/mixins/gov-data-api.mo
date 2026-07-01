import Time "mo:core/Time";
import Types "../types";

mixin () {
  // Endpoint ของแหล่งข้อมูลรัฐบาล — เปลี่ยนค่าคงที่นี้เมื่อ API จริงพร้อมใช้งาน
  // โดยไม่ต้องแก้ไข logic อื่น ๆ ใน mixin
  // เมื่อค่านี้เป็นสตริงว่าง ฟังก์ชันจะคืน fallback envelope ทันทีโดยไม่เรียก HTTP
  transient let GOV_DATA_URL = "";

  // ดึงข้อมูลรัฐบาลแบบเรียลไทม์ผ่าน HTTP outcall
  // ปัจจุบันยังไม่มี API จริง — คืนค่า fallback ว่าง (points = [], source = "mock",
  // fetchedAt = 0) เพื่อให้ frontend ทำงานได้ทันทีและแยกแยะสถานะข้อมูลได้
  // ใช้ transform ที่ประกาศใน ExternalApiMixin (IC กำหนดให้มี transform เดียวต่อ canister)
  // โดยเรียกตรงจากเนื้อหา actor เช่นเดียวกับ geocodeSearch/fetchWildfireData
  public shared ({ caller }) func fetchGovData(q : Text) : async Types.GovDataResponse {
    ignore (caller, q);
    // เมื่อยังไม่มี endpoint จริง คืน fallback envelope ทันทีโดยไม่ throw
    if (GOV_DATA_URL == "") {
      return {
        success = false;
        points = [];
        source = "mock";
        fetchedAt = 0;
        error = "ยังไม่ได้เชื่อมต่อ API ของรัฐบาล";
      };
    };
    // เมื่อตั้งค่า GOV_DATA_URL เป็น endpoint จริงแล้ว ระบบจะดึงข้อมูลผ่าน HTTP outcall
    // โดยไม่ต้องแก้ไข logic อื่น — เพียงเปลี่ยนค่าคงที่ด้านบน
    // TODO(gov-data): เมื่อเชื่อมต่อ endpoint จริงของรัฐบาล ให้ย้ายการเรียก
    // OutCall.httpGetRequest ไปยัง mixins/external-api.mo (ซึ่งมี transform callback
    // เดียวที่ IC อนุญาตต่อ canister) แล้วเรียกผ่าน public func จากไฟล์นั้นแทน
    // หรือย้าย fetchGovData ไปรวมใน ExternalApiMixin เพื่อใช้ transform ที่มีอยู่ได้โดยตรง
    // ตอนนี้ยังไม่มี endpoint จริง (ตาม doNotBuild) จึงคืน fallback envelope ทันที
    {
      success = false;
      points = [];
      source = "mock";
      fetchedAt = Time.now();
      error = "ยังไม่ได้เชื่อมต่อ API ของรัฐบาล";
    };
  };
};
