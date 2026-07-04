// ── Event types ───────────────────────────────────────────────────────────────
export const EVENT_TYPES = [
  "Wedding", "Engagement", "Birthday", "Graduation", "Anniversary",
  "Conference", "Corporate Event", "Product Shoot", "Fashion Shoot",
  "Concert", "Family Session", "Portrait Session", "Funeral", "Other",
];

// ── Photography services ──────────────────────────────────────────────────────
export const PHOTO_SERVICES = [
  { id: "event_photography",   label: "Event Photography" },
  { id: "portrait_photography",label: "Portrait Photography" },
  { id: "drone_photography",   label: "Drone Photography" },
  { id: "studio_photography",  label: "Studio Photography" },
  { id: "product_photography", label: "Product Photography" },
];

// ── Video services ────────────────────────────────────────────────────────────
export const VIDEO_SERVICES = [
  { id: "event_video",          label: "Event Video" },
  { id: "documentary",          label: "Documentary" },
  { id: "highlight_video",      label: "Highlight Video" },
  { id: "full_ceremony",        label: "Full Ceremony Recording" },
  { id: "drone_video",          label: "Drone Video" },
  { id: "live_streaming",       label: "Live Streaming" },
];

// ── Additional services ───────────────────────────────────────────────────────
export const ADDITIONAL_SERVICES = [
  { id: "photo_booth",          label: "Photo Booth" },
  { id: "instant_printing",     label: "Instant Printing" },
  { id: "same_day_edit",        label: "Same Day Edit" },
  { id: "interview_recording",  label: "Interview Recording" },
  { id: "audio_recording",      label: "Audio Recording" },
];

// ── Photo deliverables ────────────────────────────────────────────────────────
export const PHOTO_DELIVERABLES = [
  { id: "edited_photos",  label: "Edited Photos" },
  { id: "raw_photos",     label: "RAW Photos" },
  { id: "printed_photos", label: "Printed Photos" },
  { id: "album",          label: "Photo Album" },
];

// ── Video deliverables ────────────────────────────────────────────────────────
export const VIDEO_DELIVERABLES = [
  { id: "full_video",      label: "Full Video" },
  { id: "highlight_reel",  label: "Highlight Video" },
  { id: "trailer",         label: "Trailer" },
  { id: "instagram_reel",  label: "Instagram Reel" },
  { id: "tiktok_version",  label: "TikTok Version" },
];

// ── Photo specs ───────────────────────────────────────────────────────────────
export const IMAGE_QUALITIES    = ["Standard", "High Resolution", "4K Export", "Ultra High Resolution"];
export const EDITING_STYLES     = ["Natural", "Bright", "Dark & Moody", "Vintage", "Luxury", "Cinematic"];
export const COLOR_STYLES       = ["Natural", "Warm", "Cold", "Black & White"];

// ── Video specs ───────────────────────────────────────────────────────────────
export const VIDEO_RESOLUTIONS  = ["1080p", "2K", "4K", "6K", "8K"];
export const FRAME_RATES        = ["24fps", "30fps", "60fps", "120fps"];
export const VIDEO_ORIENTATIONS = ["Landscape", "Portrait", "Both"];
export const VIDEO_STYLES       = ["Documentary", "Cinematic", "Traditional", "Luxury", "Social Media"];

// ── Coverage hours ────────────────────────────────────────────────────────────
export const COVERAGE_HOURS = [2, 3, 4, 5, 6, 8, 10, 12];

// ── Pricing rules (cents per unit) ───────────────────────────────────────────
export const PRICING_RULES = {
  EXTRA_HOUR_CENTS:           5000,  // $50/hr default overtime
  DRONE_CENTS:               15000,  // $150
  SECOND_PHOTOGRAPHER_CENTS: 10000,  // $100
  LIVE_STREAM_CENTS:         20000,  // $200
  SAME_DAY_EDIT_CENTS:       15000,  // $150
  PHOTO_BOOTH_CENTS:         10000,  // $100
  ALBUM_CENTS:               20000,  // $200
  EXPRESS_DELIVERY_CENTS:     8000,  // $80
  URGENT_DELIVERY_CENTS:     15000,  // $150
};

// ── 16-stage booking pipeline ─────────────────────────────────────────────────
export const BOOKING_PIPELINE = [
  { value: "INQUIRY",            label: "Inquiry",            colour: "text-zinc-400"  },
  { value: "QUOTATION_SENT",     label: "Quotation Sent",     colour: "text-blue-400"  },
  { value: "AWAITING_DEPOSIT",   label: "Awaiting Deposit",   colour: "text-amber-400" },
  { value: "CONFIRMED",          label: "Confirmed",          colour: "text-emerald-400"},
  { value: "CREW_ASSIGNED",      label: "Crew Assigned",      colour: "text-violet-400"},
  { value: "EQUIPMENT_PREPARED", label: "Equipment Prepared", colour: "text-indigo-400"},
  { value: "EVENT_DAY",          label: "Event Day",          colour: "text-yellow-400"},
  { value: "MEDIA_UPLOADING",    label: "Media Uploading",    colour: "text-orange-400"},
  { value: "EDITING",            label: "Editing",            colour: "text-pink-400"  },
  { value: "QUALITY_REVIEW",     label: "Quality Review",     colour: "text-rose-400"  },
  { value: "READY_FOR_DELIVERY", label: "Ready for Delivery", colour: "text-teal-400"  },
  { value: "CUSTOMER_NOTIFIED",  label: "Customer Notified",  colour: "text-cyan-400"  },
  { value: "DELIVERED",          label: "Delivered",          colour: "text-emerald-400"},
  { value: "COMPLETED",          label: "Completed",          colour: "text-emerald-500"},
  { value: "ARCHIVED",           label: "Archived",           colour: "text-zinc-500"  },
  { value: "CANCELLED",          label: "Cancelled",          colour: "text-red-400"   },
] as const;
