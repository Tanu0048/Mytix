"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  QrCode, 
  Search, 
  LogOut, 
  Flashlight, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Sparkles, 
  RefreshCw, 
  UserCheck, 
  DoorOpen,
  Camera,
  ArrowRight,
  ShieldCheck,
  Check
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import api from "@/lib/api";
import { Html5Qrcode } from "html5-qrcode";

// Web Audio synthesizer for gate turnstile sounds (No external MP3 required)
function playGateSound(type: "SUCCESS" | "ERROR") {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === "SUCCESS") {
      // Pleasant high-pitched double chime (Pass)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.12); // D6
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else {
      // Low buzz tone (Duplicate / Error)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.setValueAtTime(130, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    }
  } catch (e) {
    // Audio context may be restricted by autoplay policy until user gesture
  }
}

export default function MobileScannerPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [activeTab, setActiveTab] = useState<"SCAN" | "SEARCH">("SCAN");
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [gateName, setGateName] = useState<string>("Gate 1");
  const [stats, setStats] = useState<{
    checkedInCount: number;
    totalIssuedTickets: number;
    checkInRatePercent: string;
  } | null>(null);

  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{
    status: "VALID" | "ALREADY_USED" | "INVALID" | "CANCELLED";
    granted: boolean;
    title: string;
    message: string;
    attendeeName?: string;
    ticketType?: string;
    seat?: string;
    previouslyUsedAt?: string;
    previouslyUsedGate?: string;
  } | null>(null);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanLockRef = useRef<boolean>(false);

  // Manual Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);

  // 1. Initial Authentication & Events Load
  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    if (user.assignedGate) {
      setGateName(user.assignedGate);
    }

    loadAccessibleEvents();
  }, [user]);

  const loadAccessibleEvents = async () => {
    try {
      const res = await api.get("/scan/events");
      if (res.data?.data && res.data.data.length > 0) {
        setEvents(res.data.data);
        const initialId = user?.assignedEvent?.id || res.data.data[0].id;
        setSelectedEventId(initialId);
        loadStats(initialId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadStats = async (eventId: string) => {
    if (!eventId) return;
    try {
      const res = await api.get(`/scan/stats/${eventId}`);
      if (res.data?.data) {
        setStats(res.data.data);
      }
    } catch (err) {
      // Non-critical telemetry
    }
  };

  // 2. Camera QR Scanner Initialization
  useEffect(() => {
    if (activeTab !== "SCAN" || !selectedEventId) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [activeTab, selectedEventId]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      if (scannerRef.current) {
        await stopCamera();
      }

      const html5QrCode = new Html5Qrcode("qr-camera-viewport");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0
        },
        onQrCodeSuccess,
        () => {} // Ignore continuous non-detection frames
      );

      setIsScanning(true);
    } catch (err: any) {
      console.warn("Camera start error:", err);
      setCameraError(
        "Camera permission is required. Please tap 'Allow' when your browser asks for camera access."
      );
      setIsScanning(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        // Ignored
      }
    }
    setIsScanning(false);
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !isScanning) return;
    try {
      const nextTorch = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch } as any]
      });
      setTorchOn(nextTorch);
    } catch (err) {
      alert("Flashlight/torch is not supported on this device's browser.");
    }
  };

  // 3. Scan Execution & Result Handling
  const onQrCodeSuccess = async (decodedText: string) => {
    if (scanLockRef.current) return; // Prevent double rapid firing
    scanLockRef.current = true;

    try {
      const res = await api.post("/scan", {
        qrToken: decodedText,
        gate: gateName,
        deviceId: "mobile-safari-chrome"
      });

      const data = res.data?.data;
      if (data?.granted) {
        if (soundEnabled) playGateSound("SUCCESS");
        if (navigator.vibrate) navigator.vibrate([100]);

        setScanResult({
          status: "VALID",
          granted: true,
          title: "ENTRY GRANTED",
          message: data.message || "Valid Ticket - Welcome!",
          attendeeName: data.attendeeName,
          ticketType: data.ticketTypeName,
          seat: data.seat
        });

        // Update stats
        if (selectedEventId) loadStats(selectedEventId);

        // Auto-dismiss valid card in 1.8 seconds for high-speed gate flow
        setTimeout(() => {
          setScanResult(null);
          scanLockRef.current = false;
        }, 1800);
      } else {
        if (soundEnabled) playGateSound("ERROR");
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

        setScanResult({
          status: data?.result === "ALREADY_USED" ? "ALREADY_USED" : "INVALID",
          granted: false,
          title: data?.result === "ALREADY_USED" ? "ALREADY CHECKED IN" : "ENTRY DENIED",
          message: data?.message || "Invalid ticket or wrong event.",
          attendeeName: data?.attendeeName,
          previouslyUsedAt: data?.previouslyUsedAt,
          previouslyUsedGate: data?.previouslyUsedGate
        });

        // Keep error visible for 3 seconds so staff can see reason
        setTimeout(() => {
          setScanResult(null);
          scanLockRef.current = false;
        }, 3000);
      }
    } catch (err: any) {
      if (soundEnabled) playGateSound("ERROR");
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

      const errMessage = err.response?.data?.message || err.response?.data?.error?.message || "Invalid QR code format.";
      setScanResult({
        status: "INVALID",
        granted: false,
        title: "UNRECOGNIZED TICKET",
        message: errMessage
      });

      setTimeout(() => {
        setScanResult(null);
        scanLockRef.current = false;
      }, 3000);
    }
  };

  // 4. Manual Search Handlers
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !searchQuery.trim() || searchQuery.length < 2) return;
    setIsSearching(true);
    try {
      const res = await api.get(`/scan/search?eventId=${selectedEventId}&query=${encodeURIComponent(searchQuery.trim())}`);
      setSearchResults(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleManualCheckIn = async (ticketId: string) => {
    setCheckingInId(ticketId);
    try {
      const res = await api.post("/scan/manual-checkin", {
        ticketId,
        gate: gateName
      });
      if (res.data?.data?.success) {
        if (soundEnabled) playGateSound("SUCCESS");
        // Update ticket in local search results
        setSearchResults(prev => prev.map(t => t.id === ticketId ? { ...t, status: "USED", usedGate: gateName } : t));
        if (selectedEventId) loadStats(selectedEventId);
      } else {
        alert(res.data?.data?.message || "Failed to check in.");
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Error checking in ticket.");
    } finally {
      setCheckingInId(null);
    }
  };

  const handleLogout = async () => {
    await stopCamera();
    logout();
    router.push("/login");
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full max-w-lg mx-auto bg-[#070b13] text-white flex flex-col justify-between relative select-none overflow-hidden touch-manipulation pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
      
      {/* ================= TOP HEADER (Event & Gate Bar) ================= */}
      <header className="px-3.5 py-2.5 sm:px-4 sm:py-3 bg-[#0d131f] border-b border-slate-800/90 space-y-2.5 shrink-0 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
              M
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-400 truncate">
                  Turnstile Scanner
                </p>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              </div>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-300 truncate">
                Staff: <span className="text-white font-extrabold">{user?.staffId || user?.name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleLogout}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1 text-[11px] font-bold active:scale-95"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Exit</span>
            </button>
          </div>
        </div>

        {/* Event Selector & Gate Badge */}
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                loadStats(e.target.value);
              }}
              className="w-full bg-[#161f31] border border-slate-700/80 rounded-xl px-2.5 py-2 text-xs font-bold text-white outline-none focus:border-amber-400 truncate"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id} className="bg-slate-900 text-white">
                  {ev.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700/60 text-slate-200 text-xs font-black shrink-0">
            <DoorOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="truncate max-w-[85px]">{gateName}</span>
          </div>
        </div>

        {/* Check-In Progress Bar */}
        {stats && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold">
              <span className="text-slate-400">Venue Capacity:</span>
              <span className="text-amber-400 font-extrabold">
                {stats.checkedInCount} / {stats.totalIssuedTickets} ({stats.checkInRatePercent})
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div 
                className="h-full bg-linear-to-r from-amber-500 to-amber-300 transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(100, parseFloat(stats.checkInRatePercent) || 0)}%` }}
              />
            </div>
          </div>
        )}
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 flex flex-col p-3 sm:p-4 relative overflow-hidden min-h-0">
        
        {/* TAB 1: CAMERA SCANNER */}
        {activeTab === "SCAN" && (
          <div className="flex-1 flex flex-col justify-between space-y-3 min-h-0">
            
            {/* Camera Frame Container */}
            <div className="relative flex-1 w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-black border-2 border-slate-800 flex items-center justify-center min-h-0 shadow-inner">
              
              {/* HTML5 QR Code Video Target */}
              <div id="qr-camera-viewport" className="w-full h-full object-cover [&>video]:w-full [&>video]:h-full [&>video]:object-cover" />

              {/* Glowing Corner Overlays & Target Frame */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-[min(250px,70vw)] h-[min(250px,70vw)] border-2 border-amber-400/40 rounded-3xl shadow-[0_0_40px_rgba(251,191,36,0.15)] flex items-center justify-center">
                  
                  {/* Neon Amber Targeting Corners */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl-xl" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr-xl" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl-xl" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br-xl" />

                  {/* Animated Laser Scanning Line */}
                  {isScanning && !scanResult && (
                    <div className="w-full h-0.5 bg-linear-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_rgba(251,191,36,0.8)] animate-pulse" />
                  )}
                </div>
              </div>

              {/* Camera Error / Permission Fallback */}
              {cameraError && (
                <div className="absolute inset-0 bg-slate-950/95 p-5 flex flex-col items-center justify-center text-center space-y-3 z-10">
                  <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                    <Camera className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm text-white">Camera Permission Needed</h4>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xs">{cameraError}</p>
                  <button
                    onClick={startCamera}
                    className="px-5 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs hover:bg-amber-300 transition active:scale-95 cursor-pointer"
                  >
                    Allow Camera & Retry
                  </button>
                </div>
              )}

              {/* Instant Scan Result Popup Banner (Tap-To-Dismiss for fast gate flow) */}
              {scanResult && (
                <div 
                  onClick={() => {
                    setScanResult(null);
                    scanLockRef.current = false;
                  }}
                  className={`absolute inset-0 z-20 flex flex-col items-center justify-center p-5 text-center animate-in fade-in duration-150 cursor-pointer ${
                    scanResult.granted 
                      ? "bg-emerald-950/95 border-4 border-emerald-400" 
                      : scanResult.status === "ALREADY_USED"
                        ? "bg-rose-950/95 border-4 border-rose-500"
                        : "bg-amber-950/95 border-4 border-amber-400"
                  }`}
                >
                  <div className="space-y-2.5 max-w-xs">
                    {scanResult.granted ? (
                      <div className="w-16 h-16 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                        <Check className="w-10 h-10 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-rose-500 text-white flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(244,63,94,0.5)]">
                        <XCircle className="w-10 h-10 stroke-[2.5]" />
                      </div>
                    )}

                    <h2 className="text-2xl font-black tracking-tight text-white uppercase">
                      {scanResult.title}
                    </h2>

                    {scanResult.attendeeName && (
                      <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-1">
                        <p className="text-sm font-extrabold text-white">{scanResult.attendeeName}</p>
                        {scanResult.ticketType && (
                          <p className="text-xs font-bold text-amber-300">{scanResult.ticketType}</p>
                        )}
                        {scanResult.seat && (
                          <p className="text-[11px] font-semibold text-slate-300">Seat: {scanResult.seat}</p>
                        )}
                      </div>
                    )}

                    {scanResult.previouslyUsedAt && (
                      <div className="p-2.5 rounded-xl bg-rose-900/40 border border-rose-500/30 text-rose-200 text-xs space-y-0.5">
                        <p className="font-bold">Scanned at: {new Date(scanResult.previouslyUsedAt).toLocaleTimeString()}</p>
                        {scanResult.previouslyUsedGate && (
                          <p className="text-[11px] text-rose-300">Gate: {scanResult.previouslyUsedGate}</p>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-slate-200 font-medium">
                      {scanResult.message}
                    </p>

                    <p className="text-[11px] font-extrabold text-white/70 pt-2 underline decoration-dashed">
                      Tap anywhere to scan next
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* Viewfinder Bottom Controls (Torch & Audio) - Large Touch Targets */}
            <div className="grid grid-cols-2 gap-2.5 shrink-0">
              <button
                type="button"
                onClick={toggleTorch}
                className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold border transition cursor-pointer active:scale-95 ${
                  torchOn 
                    ? "bg-amber-400 text-slate-950 border-amber-400 shadow-md"
                    : "bg-slate-900/90 text-slate-300 border-slate-800 hover:bg-slate-800"
                }`}
              >
                <Flashlight className="w-4 h-4 shrink-0" />
                <span>Torch {torchOn ? "ON" : "OFF"}</span>
              </button>

              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold border transition cursor-pointer active:scale-95 ${
                  soundEnabled 
                    ? "bg-slate-900/90 text-slate-300 border-slate-800"
                    : "bg-rose-950/60 text-rose-300 border-rose-800"
                }`}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <VolumeX className="w-4 h-4 text-rose-400 shrink-0" />}
                <span>Sound {soundEnabled ? "ON" : "MUTE"}</span>
              </button>
            </div>

          </div>
        )}

        {/* TAB 2: MANUAL SEARCH & CHECK-IN */}
        {activeTab === "SEARCH" && (
          <div className="flex-1 flex flex-col space-y-3 min-h-0">
            
            {/* Search Input with 16px font to prevent mobile Safari auto-zoom */}
            <form onSubmit={handleSearch} className="flex gap-2 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Guest name or Order ID..."
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="w-full bg-[#161f31] border border-slate-700/80 rounded-2xl pl-10 pr-8 py-3 text-base sm:text-xs font-semibold text-white outline-none focus:border-amber-400 transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition shrink-0 cursor-pointer active:scale-95"
              >
                {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Search"}
              </button>
            </form>

            {/* Results List (Touch Scrollable) */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-0">
              {searchResults.length === 0 ? (
                <div className="py-12 sm:py-16 text-center text-slate-500 space-y-2">
                  <UserCheck className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs font-bold text-slate-400">Search Attendees by Name or Order ID</p>
                  <p className="text-[11px] text-slate-600 max-w-xs mx-auto">
                    Use this lookup if an attendee's phone battery died or their screen is cracked.
                  </p>
                </div>
              ) : (
                searchResults.map((ticket) => (
                  <div 
                    key={ticket.id}
                    className="p-3.5 rounded-2xl bg-[#0f172a] border border-slate-800 flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs font-extrabold text-white truncate">{ticket.attendeeName}</p>
                      <p className="text-[11px] font-bold text-amber-400 truncate">{ticket.ticketTypeName}</p>
                      {ticket.seat && (
                        <p className="text-[10px] text-slate-400">Seat: {ticket.seat}</p>
                      )}
                    </div>

                    <div className="shrink-0">
                      {ticket.status === "USED" ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-[11px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                          Checked In
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={checkingInId === ticket.id}
                          onClick={() => handleManualCheckIn(ticket.id)}
                          className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition cursor-pointer active:scale-95 shadow-xs"
                        >
                          {checkingInId === ticket.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            "Check In"
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

      </main>

      {/* ================= BOTTOM NAVIGATION TABS (Safe Area Padded) ================= */}
      <nav className="p-2.5 sm:p-3 bg-[#0d131f] border-t border-slate-800/90 grid grid-cols-2 gap-2 shrink-0 z-30">
        <button
          type="button"
          onClick={() => setActiveTab("SCAN")}
          className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black transition cursor-pointer active:scale-95 ${
            activeTab === "SCAN"
              ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20"
              : "bg-slate-900 text-slate-400 hover:text-white"
          }`}
        >
          <QrCode className="w-4 h-4 shrink-0" />
          <span>Camera Scanner</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("SEARCH")}
          className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black transition cursor-pointer active:scale-95 ${
            activeTab === "SEARCH"
              ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20"
              : "bg-slate-900 text-slate-400 hover:text-white"
          }`}
        >
          <Search className="w-4 h-4 shrink-0" />
          <span>Manual Lookup</span>
        </button>
      </nav>

    </div>
  );
}
