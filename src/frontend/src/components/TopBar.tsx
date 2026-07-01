import { Button } from "@/components/ui/button";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { LogIn, LogOut, User } from "lucide-react";

export function TopBar() {
  const { identity, login, clear, isLoggingIn, isInitializing } =
    useInternetIdentity();

  const isLoggedIn = !!identity && !identity.getPrincipal().isAnonymous();
  const principalText = isLoggedIn
    ? `${identity.getPrincipal().toText().slice(0, 5)}...${identity.getPrincipal().toText().slice(-3)}`
    : null;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-16"
      style={{
        background: "rgba(7, 10, 16, 0.85)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(43, 52, 67, 0.6)",
      }}
    >
      <div className="flex items-center gap-2.5" data-ocid="topbar.link">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
          style={{
            background: "linear-gradient(135deg, #3A87FF, #67D5FF)",
            color: "#070A10",
          }}
        >
          T
        </div>
        <span
          className="font-bold text-sm text-white"
          style={{ letterSpacing: "0.2em" }}
        >
          TERRAFRAME
        </span>
      </div>

      <nav className="hidden md:flex items-center gap-7">
        {["สำรวจ", "ฟีเจอร์", "เลเยอร์", "เอกสาร"].map((item) => (
          <button
            key={item}
            type="button"
            className="text-xs font-medium tracking-wide transition-colors py-3 px-2"
            style={{
              color: "#AAB4C3",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#E8EDF6";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#AAB4C3";
            }}
            data-ocid="topbar.link"
          >
            {item}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        {isLoggedIn ? (
          <>
            <div
              className="flex items-center gap-1.5 px-3 h-11 rounded text-sm"
              style={{
                background: "rgba(43, 52, 67, 0.5)",
                border: "1px solid rgba(58, 135, 255, 0.3)",
                color: "#67D5FF",
              }}
            >
              <User size={15} />
              <span>{principalText}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clear}
              className="text-sm h-11 px-5 gap-1.5"
              style={{
                color: "#AAB4C3",
                border: "1px solid rgba(43, 52, 67, 0.6)",
              }}
              data-ocid="topbar.logout.button"
            >
              <LogOut size={15} />
              ออกจากระบบ
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            onClick={login}
            disabled={isLoggingIn || isInitializing}
            className="text-sm h-11 px-5 font-semibold gap-1.5"
            style={{
              background: "linear-gradient(135deg, #3A87FF, #67D5FF)",
              color: "#070A10",
              border: "none",
            }}
            data-ocid="topbar.login.button"
          >
            <LogIn size={15} />
            {isLoggingIn ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Button>
        )}
      </div>
    </header>
  );
}
