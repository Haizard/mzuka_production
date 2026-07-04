"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, ChevronLeft, Check, Camera, Video,
  Users, Clock, Package, Star, AlertTriangle, Calculator,
} from "lucide-react";
import { createBookingAction } from "@/app/client/actions";
import {
  EVENT_TYPES, PHOTO_SERVICES, VIDEO_SERVICES, ADDITIONAL_SERVICES,
  PHOTO_DELIVERABLES, VIDEO_DELIVERABLES,
  IMAGE_QUALITIES, EDITING_STYLES, COLOR_STYLES,
  VIDEO_RESOLUTIONS, FRAME_RATES, VIDEO_ORIENTATIONS, VIDEO_STYLES,
  COVERAGE_HOURS, PRICING_RULES,
} from "@/lib/booking-constants";

interface ServicePackage { id: string; name: string; description: string; priceCents: number; durationMin?: number | null }

const STEPS = [
  { id: 1, label: "Event",    icon: Star },
  { id: 2, label: "Services", icon: Camera },
  { id: 3, label: "Crew",     icon: Users },
  { id: 4, label: "Specs",    icon: Video },
  { id: 5, label: "Delivery", icon: Package },
  { id: 6, label: "Review",   icon: Check },
];

function usd(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

function MultiCheck({ options, selected, onToggle, cols = 2 }: {
  options: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  cols?: number;
}) {
  return (
    <div className={`grid gap-2 grid-cols-${cols}`}>
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onToggle(o.id)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition ${
            selected.includes(o.id)
              ? "border-[var(--gold)]/60 bg-[var(--gold)]/10 text-white"
              : "border-white/10 text-zinc-400 hover:border-white/20"
          }`}>
          <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${selected.includes(o.id) ? "bg-[var(--gold)] border-[var(--gold)]" : "border-white/20"}`}>
            {selected.includes(o.id) && <Check className="h-3 w-3 text-black" />}
          </span>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return <label className="block text-sm font-medium text-zinc-200 mb-1.5">{children}{required && <span className="text-red-400 ml-1">*</span>}</label>;
}

function Input({ value, onChange, type = "text", placeholder, required }: {
  value: string | number; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <input
      type={type} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} required={required}
      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-zinc-600 focus:border-[var(--gold)] focus:outline-none transition"
    />
  );
}

function Select({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void;
  options: string[] | { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-white/10 bg-[var(--surface)] px-4 py-2.5 text-white focus:border-[var(--gold)] focus:outline-none transition">
      {placeholder && <option value="">{placeholder}</option>}
      {(options as ({ value: string; label: string } | string)[]).map((o) =>
        typeof o === "string"
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
      )}
    </select>
  );
}

export function BookingForm({ packages }: { packages: ServicePackage[] }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ── Form state ────────────────────────────────────────────────────────────
  const [title, setTitle]             = useState("");
  const [eventType, setEventType]     = useState("");
  const [serviceType, setServiceType] = useState("");
  const [packageId, setPackageId]     = useState("");
  const [location, setLocation]       = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [endTime, setEndTime]         = useState("");
  const [guestCount, setGuestCount]   = useState("");
  const [venueType, setVenueType]     = useState("");
  const [altPhone, setAltPhone]       = useState("");
  const [organization, setOrg]        = useState("");
  const [billingAddress, setBilling]  = useState("");

  const [photoServices, setPhotoServices]         = useState<string[]>([]);
  const [videoServices, setVideoServices]         = useState<string[]>([]);
  const [additionalServices, setAdditionalServices] = useState<string[]>([]);
  const [photoDeliverables, setPhotoDeliverables] = useState<string[]>(["edited_photos"]);
  const [videoDeliverables, setVideoDeliverables] = useState<string[]>(["highlight_reel"]);

  const [crewPhotographers, setCrewPhotographers] = useState(1);
  const [crewVideographers, setCrewVideographers] = useState(0);
  const [crewDroneOps, setCrewDroneOps]           = useState(0);
  const [crewAssistants, setCrewAssistants]       = useState(0);
  const [includedHours, setIncludedHours]         = useState(8);

  const [imageQuality, setImageQuality]       = useState("High Resolution");
  const [editingStyle, setEditingStyle]       = useState("Natural");
  const [colorStyle, setColorStyle]           = useState("Natural");
  const [videoResolution, setVideoResolution] = useState("4K");
  const [frameRate, setFrameRate]             = useState("30fps");
  const [videoOrientation, setVideoOrientation] = useState("Landscape");
  const [videoStyle, setVideoStyle]           = useState("Cinematic");

  const [deliveryDeadline, setDeliveryDeadline] = useState<"STANDARD"|"EXPRESS"|"URGENT">("STANDARD");
  const [specialRequests, setSpecialRequests]   = useState("");
  const [notes, setNotes]                       = useState("");

  // ── Auto-pricing ──────────────────────────────────────────────────────────
  const deliveryFee =
    deliveryDeadline === "EXPRESS" ? PRICING_RULES.EXPRESS_DELIVERY_CENTS :
    deliveryDeadline === "URGENT"  ? PRICING_RULES.URGENT_DELIVERY_CENTS  : 0;

  const selectedPkg = packages.find((p) => p.id === packageId);
  let estimate = selectedPkg?.priceCents ?? 0;
  if (additionalServices.includes("drone_photography") || videoServices.includes("drone_video")) estimate += PRICING_RULES.DRONE_CENTS;
  if (additionalServices.includes("live_streaming"))  estimate += PRICING_RULES.LIVE_STREAM_CENTS;
  if (additionalServices.includes("same_day_edit"))   estimate += PRICING_RULES.SAME_DAY_EDIT_CENTS;
  if (additionalServices.includes("photo_booth"))     estimate += PRICING_RULES.PHOTO_BOOTH_CENTS;
  if (crewPhotographers > 1) estimate += PRICING_RULES.SECOND_PHOTOGRAPHER_CENTS * (crewPhotographers - 1);
  estimate += deliveryFee;

  const toggle = (arr: string[], setArr: (a: string[]) => void) => (id: string) =>
    setArr(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  const canNext = () => {
    if (step === 1) return title.trim().length >= 3 && eventType && scheduledAt;
    if (step === 2) return photoServices.length > 0 || videoServices.length > 0;
    return true;
  };

  const submit = async () => {
    if (!title.trim() || !scheduledAt) { setError("Event title and date are required"); return; }
    setSubmitting(true);
    setError("");
    const res = await createBookingAction({
      title, eventType, serviceType: serviceType || eventType,
      packageId: packageId || undefined, location, scheduledAt, endTime,
      guestCount: guestCount ? parseInt(guestCount) : undefined,
      venueType, alternatePhone: altPhone, organization, billingAddress,
      services: { photography: photoServices, video: videoServices, additional: additionalServices },
      deliverables: { photos: photoDeliverables, videos: videoDeliverables },
      photoSpec: { quality: imageQuality, editingStyle, colorStyle },
      videoSpec: { resolution: videoResolution, frameRate, orientation: videoOrientation, style: videoStyle },
      crewPhotographers, crewVideographers, crewDroneOps, crewAssistants,
      includedHours, deliveryDeadline, specialRequests, notes,
    });
    setSubmitting(false);
    if (res.success) {
      router.push(`/client/bookings/${res.bookingId}`);
    } else {
      setError(res.error ?? "Failed to submit booking");
    }
  };

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1 flex-1">
            <button
              type="button"
              onClick={() => step > s.id && setStep(s.id)}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition ${
                step === s.id ? "bg-[var(--gold)] text-black" :
                step > s.id ? "bg-emerald-600/30 text-emerald-300 cursor-pointer" :
                "text-zinc-600 cursor-default"
              }`}>
              <s.icon className="h-3 w-3" />
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && <div className={`flex-1 h-px ${step > s.id ? "bg-emerald-600/40" : "bg-white/10"}`} />}
          </div>
        ))}
      </div>

      {/* ── STEP 1: Event Information ── */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Event Information</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel required>Event Title</FieldLabel>
              <Input value={title} onChange={setTitle} placeholder="e.g. John & Mary Wedding 2026" required />
            </div>
            <div>
              <FieldLabel required>Event Type</FieldLabel>
              <Select value={eventType} onChange={setEventType} options={EVENT_TYPES} placeholder="Select event type…" />
            </div>
            <div>
              <FieldLabel>Service Package</FieldLabel>
              <Select value={packageId} onChange={setPackageId}
                options={[{ value: "", label: "Custom / No Package" }, ...packages.map((p) => ({ value: p.id, label: `${p.name} — ${usd(p.priceCents)}` }))]} />
            </div>
            <div>
              <FieldLabel required>Event Date & Start Time</FieldLabel>
              <Input type="datetime-local" value={scheduledAt} onChange={setScheduledAt} required />
            </div>
            <div>
              <FieldLabel>Expected End Time</FieldLabel>
              <Input type="datetime-local" value={endTime} onChange={setEndTime} />
            </div>
            <div>
              <FieldLabel>Venue / Location</FieldLabel>
              <Input value={location} onChange={setLocation} placeholder="e.g. Serena Hotel, Nairobi" />
            </div>
            <div>
              <FieldLabel>Indoor / Outdoor</FieldLabel>
              <Select value={venueType} onChange={setVenueType}
                options={["Indoor", "Outdoor", "Both"]} placeholder="Select…" />
            </div>
            <div>
              <FieldLabel>Number of Guests</FieldLabel>
              <Input type="number" value={guestCount} onChange={setGuestCount} placeholder="e.g. 150" />
            </div>
            <div>
              <FieldLabel>Organization / Company</FieldLabel>
              <Input value={organization} onChange={setOrg} placeholder="Optional — for corporate bookings" />
            </div>
            <div>
              <FieldLabel>Alternate Phone</FieldLabel>
              <Input value={altPhone} onChange={setAltPhone} placeholder="+254 700 000 000" />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>Billing Address</FieldLabel>
              <Input value={billingAddress} onChange={setBilling} placeholder="Optional — for invoice generation" />
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Services ── */}
      {step === 2 && (
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-white">Services Requested</h3>
          <div>
            <p className="text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2"><Camera className="h-4 w-4 text-[var(--gold)]" /> Photography</p>
            <MultiCheck options={PHOTO_SERVICES} selected={photoServices} onToggle={toggle(photoServices, setPhotoServices)} />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2"><Video className="h-4 w-4 text-[var(--gold)]" /> Videography</p>
            <MultiCheck options={VIDEO_SERVICES} selected={videoServices} onToggle={toggle(videoServices, setVideoServices)} />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2"><Star className="h-4 w-4 text-[var(--gold)]" /> Additional Services</p>
            <MultiCheck options={ADDITIONAL_SERVICES} selected={additionalServices} onToggle={toggle(additionalServices, setAdditionalServices)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-zinc-300 mb-2">Photo Deliverables</p>
              <MultiCheck options={PHOTO_DELIVERABLES} selected={photoDeliverables} onToggle={toggle(photoDeliverables, setPhotoDeliverables)} cols={1} />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-300 mb-2">Video Deliverables</p>
              <MultiCheck options={VIDEO_DELIVERABLES} selected={videoDeliverables} onToggle={toggle(videoDeliverables, setVideoDeliverables)} cols={1} />
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: Crew & Coverage ── */}
      {step === 3 && (
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-white">Crew & Coverage</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Photographers", crewPhotographers, setCrewPhotographers],
              ["Videographers", crewVideographers, setCrewVideographers],
              ["Drone Operators", crewDroneOps, setCrewDroneOps],
              ["Assistants", crewAssistants, setCrewAssistants],
            ].map(([label, val, setter]) => (
              <div key={label as string}>
                <FieldLabel>{label as string}</FieldLabel>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => (setter as (n: number) => void)(Math.max(0, (val as number) - 1))}
                    className="w-10 h-10 rounded-lg border border-white/10 text-white hover:bg-white/10 transition text-xl font-bold">−</button>
                  <span className="text-2xl font-bold text-white w-8 text-center">{val as number}</span>
                  <button type="button" onClick={() => (setter as (n: number) => void)((val as number) + 1)}
                    className="w-10 h-10 rounded-lg border border-white/10 text-white hover:bg-white/10 transition text-xl font-bold">+</button>
                </div>
              </div>
            ))}
          </div>
          <div>
            <FieldLabel>Included Coverage Hours</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {COVERAGE_HOURS.map((h) => (
                <button key={h} type="button" onClick={() => setIncludedHours(h)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${includedHours === h ? "border-[var(--gold)] bg-[var(--gold)]/10 text-white" : "border-white/10 text-zinc-400 hover:border-white/20"}`}>
                  {h}h
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-xs text-blue-300">Overtime rate: {usd(PRICING_RULES.EXTRA_HOUR_CENTS)}/hour beyond included hours — calculated automatically on event day.</p>
          </div>
        </div>
      )}

      {/* ── STEP 4: Specs ── */}
      {step === 4 && (
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-white">Photo & Video Specifications</h3>
          <div>
            <p className="text-sm font-semibold text-[var(--gold)] mb-3 flex items-center gap-2"><Camera className="h-4 w-4" /> Photo Specifications</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div><FieldLabel>Image Quality</FieldLabel><Select value={imageQuality} onChange={setImageQuality} options={IMAGE_QUALITIES} /></div>
              <div><FieldLabel>Editing Style</FieldLabel><Select value={editingStyle} onChange={setEditingStyle} options={EDITING_STYLES} /></div>
              <div><FieldLabel>Color Style</FieldLabel><Select value={colorStyle} onChange={setColorStyle} options={COLOR_STYLES} /></div>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--gold)] mb-3 flex items-center gap-2"><Video className="h-4 w-4" /> Video Specifications</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div><FieldLabel>Resolution</FieldLabel><Select value={videoResolution} onChange={setVideoResolution} options={VIDEO_RESOLUTIONS} /></div>
              <div><FieldLabel>Frame Rate</FieldLabel><Select value={frameRate} onChange={setFrameRate} options={FRAME_RATES} /></div>
              <div><FieldLabel>Orientation</FieldLabel><Select value={videoOrientation} onChange={setVideoOrientation} options={VIDEO_ORIENTATIONS} /></div>
              <div><FieldLabel>Style</FieldLabel><Select value={videoStyle} onChange={setVideoStyle} options={VIDEO_STYLES} /></div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 5: Delivery & Notes ── */}
      {step === 5 && (
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-white">Delivery & Special Requests</h3>
          <div>
            <FieldLabel>Delivery Timeline</FieldLabel>
            <div className="grid gap-3 sm:grid-cols-3">
              {([
                { v: "STANDARD", label: "Standard", desc: "7–14 business days", fee: 0 },
                { v: "EXPRESS",  label: "Express",  desc: "3–5 business days",  fee: PRICING_RULES.EXPRESS_DELIVERY_CENTS },
                { v: "URGENT",   label: "Urgent",   desc: "24–48 hours",        fee: PRICING_RULES.URGENT_DELIVERY_CENTS },
              ] as const).map((d) => (
                <button key={d.v} type="button" onClick={() => setDeliveryDeadline(d.v)}
                  className={`p-4 rounded-lg border text-left transition ${deliveryDeadline === d.v ? "border-[var(--gold)] bg-[var(--gold)]/10" : "border-white/10 hover:border-white/20"}`}>
                  <p className="font-semibold text-white">{d.label}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{d.desc}</p>
                  {d.fee > 0 && <p className="text-xs text-amber-400 mt-1">+{usd(d.fee)}</p>}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-500 mt-2">Delivery is always through the secure online gallery on this platform — download via presigned links after payment.</p>
          </div>
          <div>
            <FieldLabel>Special Requests</FieldLabel>
            <textarea value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} rows={4}
              placeholder="Bride preparation, family portraits, no flash inside church, VIP guest photos, special entrance…"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-zinc-600 focus:border-[var(--gold)] focus:outline-none transition resize-none" />
          </div>
          <div>
            <FieldLabel>Additional Notes</FieldLabel>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="Anything else we should know…"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-zinc-600 focus:border-[var(--gold)] focus:outline-none transition resize-none" />
          </div>
        </div>
      )}

      {/* ── STEP 6: Review ── */}
      {step === 6 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Review Your Booking</h3>
          <div className="rounded-lg border border-white/10 bg-[var(--surface)] divide-y divide-white/10">
            {[
              ["Event", title],
              ["Type", eventType],
              ["Date", scheduledAt ? new Date(scheduledAt).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "—"],
              ["Time", scheduledAt ? new Date(scheduledAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) + (endTime ? ` → ${new Date(endTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}` : "") : "—"],
              ["Location", location || "—"],
              ["Package", selectedPkg?.name ?? "Custom"],
              ["Coverage", `${includedHours}h included`],
              ["Crew", `${crewPhotographers} photographer${crewPhotographers !== 1 ? "s" : ""}, ${crewVideographers} videographer${crewVideographers !== 1 ? "s" : ""}${crewDroneOps > 0 ? `, ${crewDroneOps} drone` : ""}`],
              ["Delivery", deliveryDeadline],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm px-4 py-2.5">
                <span className="text-zinc-500">{k}</span>
                <span className="text-white text-right max-w-[60%]">{v}</span>
              </div>
            ))}
          </div>

          {/* Quote breakdown */}
          <div className="rounded-lg border border-[var(--gold)]/20 bg-[var(--gold)]/5 p-4">
            <p className="text-sm font-semibold text-[var(--gold)] mb-3 flex items-center gap-2">
              <Calculator className="h-4 w-4" /> Estimated Quote
            </p>
            <div className="space-y-1.5 text-sm">
              {selectedPkg && <div className="flex justify-between"><span className="text-zinc-400">Package: {selectedPkg.name}</span><span className="text-white">{usd(selectedPkg.priceCents)}</span></div>}
              {(additionalServices.includes("drone_photography") || videoServices.includes("drone_video")) && <div className="flex justify-between"><span className="text-zinc-400">Drone</span><span className="text-white">+{usd(PRICING_RULES.DRONE_CENTS)}</span></div>}
              {additionalServices.includes("live_streaming") && <div className="flex justify-between"><span className="text-zinc-400">Live Streaming</span><span className="text-white">+{usd(PRICING_RULES.LIVE_STREAM_CENTS)}</span></div>}
              {additionalServices.includes("same_day_edit") && <div className="flex justify-between"><span className="text-zinc-400">Same Day Edit</span><span className="text-white">+{usd(PRICING_RULES.SAME_DAY_EDIT_CENTS)}</span></div>}
              {crewPhotographers > 1 && <div className="flex justify-between"><span className="text-zinc-400">Extra Photographer ×{crewPhotographers - 1}</span><span className="text-white">+{usd(PRICING_RULES.SECOND_PHOTOGRAPHER_CENTS * (crewPhotographers - 1))}</span></div>}
              {deliveryFee > 0 && <div className="flex justify-between"><span className="text-zinc-400">{deliveryDeadline} Delivery</span><span className="text-white">+{usd(deliveryFee)}</span></div>}
              <div className="flex justify-between pt-2 border-t border-[var(--gold)]/20 font-bold">
                <span className="text-[var(--gold)]">Estimated Total</span>
                <span className="text-[var(--gold)]">{usd(estimate)}</span>
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-2">Final quote confirmed by admin after review. 50% deposit required to confirm.</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
              <AlertTriangle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <button type="button" onClick={() => setStep((s) => s - 1)} disabled={step === 1}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 text-sm text-zinc-400 hover:text-white disabled:opacity-0 transition">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        {step < 6 ? (
          <button type="button" onClick={() => setStep((s) => s + 1)} disabled={!canNext()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--gold)] text-black text-sm font-semibold hover:bg-yellow-400 disabled:opacity-40 transition">
            Next <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button type="button" onClick={submit} disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--gold)] text-black text-sm font-bold hover:bg-yellow-400 disabled:opacity-50 transition">
            {submitting ? "Submitting…" : "Submit Booking"}
          </button>
        )}
      </div>
    </div>
  );
}
