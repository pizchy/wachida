import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

interface NewPinDialogProps {
  open: boolean;
  lat: number;
  lng: number;
  onConfirm: (title: string, description: string) => void;
  onCancel: () => void;
}

export function NewPinDialog({
  open,
  lat,
  lng,
  onConfirm,
  onCancel,
}: NewPinDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleConfirm = () => {
    onConfirm(title || "หมุดใหม่", description);
    setTitle("");
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent
        className="max-w-sm"
        style={{
          background: "rgba(20, 25, 34, 0.98)",
          border: "1px solid rgba(43, 52, 67, 0.8)",
          color: "#E8EDF6",
        }}
        data-ocid="new_pin.dialog"
      >
        <DialogHeader>
          <DialogTitle style={{ color: "#E8EDF6" }}>ปักหมุดใหม่</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <p className="text-xs font-mono" style={{ color: "#AAB4C3" }}>
            {lat.toFixed(4)}°, {lng.toFixed(4)}°
          </p>
          <div className="space-y-1">
            <Label className="text-xs" style={{ color: "#AAB4C3" }}>
              ชื่อ
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="กรอกชื่อหมุด"
              className="bg-white/5 border-white/10 text-white text-sm"
              data-ocid="new_pin.title.input"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs" style={{ color: "#AAB4C3" }}>
              คำอธิบาย
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="คำอธิบายเพิ่มเติม..."
              rows={2}
              className="bg-white/5 border-white/10 text-white text-sm resize-none"
              data-ocid="new_pin.description.textarea"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="text-xs"
            style={{ color: "#AAB4C3" }}
            data-ocid="new_pin.cancel_button"
          >
            ยกเลิก
          </Button>
          <Button
            onClick={handleConfirm}
            className="text-xs"
            style={{
              background: "linear-gradient(135deg, #3A87FF, #67D5FF)",
              color: "#070A10",
              border: "none",
            }}
            data-ocid="new_pin.confirm_button"
          >
            สร้างหมุด
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
