/**
 * GET /api/receipt/[paymentId]
 *
 * Returns a printable HTML receipt for a given payment.
 * Accessible by the booking's client or any admin.
 * Add ?download=1 to trigger browser download prompt.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params;
  const user = await getCurrentUser();

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      booking: {
        include: {
          client: { select: { id: true, name: true, email: true, phone: true } },
          package: { select: { name: true, priceCents: true } },
        },
      },
    },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  // Auth: client owns the booking, or admin/staff
  const isOwner = user?.id === payment.booking.clientId;
  const isAdmin = user && ["FOUNDER", "ADMIN", "STAFF"].includes(user.role);
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const b = payment.booking;
  const client = b.client;
  const amount = (payment.amountCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: (payment.currency ?? "USD").toUpperCase(),
  });
  const paid = payment.updatedAt ?? payment.createdAt;
  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const fmtTime = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const receiptNumber = `MG-${payment.id.slice(-8).toUpperCase()}`;

  const statusColour =
    payment.status === "PAID" ? "#10b981" :
    payment.status === "DEPOSIT_PAID" ? "#3b82f6" :
    payment.status === "REFUNDED" ? "#f59e0b" : "#6b7280";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Receipt ${receiptNumber} — Muzuka Gilbert</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f5f5f0;
      color: #1a1a1a;
      padding: 32px 16px;
    }
    .page {
      max-width: 640px;
      margin: 0 auto;
      background: #fff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.12);
    }

    /* ── Header ── */
    .header {
      background: linear-gradient(135deg, #1a1810 0%, #2d2610 100%);
      padding: 36px 40px 28px;
      border-bottom: 3px solid #d4af37;
    }
    .brand { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
    .brand-logo { width: 60px; height: 60px; border-radius: 10px; object-fit: contain; background: rgba(212,175,55,0.1); border: 1px solid rgba(212,175,55,0.3); }
    .brand-text { }
    .brand-name { font-size: 20px; font-weight: 700; color: #d4af37; letter-spacing: 0.5px; }
    .brand-tagline { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 2px; }
    .header-meta { display: flex; justify-content: space-between; align-items: flex-end; }
    .receipt-title { font-size: 28px; font-weight: 800; color: #fff; }
    .receipt-number { font-size: 13px; color: #888; font-family: monospace; margin-top: 2px; }
    .receipt-status {
      display: inline-block;
      padding: 5px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: ${statusColour}22;
      color: ${statusColour};
      border: 1px solid ${statusColour}44;
    }

    /* ── Body ── */
    .body { padding: 32px 40px; }

    .section { margin-bottom: 28px; }
    .section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #888;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid #eee;
    }

    .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .row .label { color: #666; }
    .row .value { font-weight: 500; color: #1a1a1a; text-align: right; max-width: 60%; }

    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 14px 16px;
      background: #d4af3710;
      border: 1px solid #d4af3730;
      border-radius: 8px;
      font-size: 18px;
      font-weight: 800;
      color: #b8860b;
      margin-top: 12px;
    }

    .note {
      font-size: 12px;
      color: #888;
      line-height: 1.6;
      padding: 14px;
      background: #f9f9f7;
      border-radius: 6px;
      border-left: 3px solid #d4af37;
    }

    /* ── Footer ── */
    .footer {
      background: #f5f5f0;
      border-top: 1px solid #eee;
      padding: 20px 40px;
      text-align: center;
      font-size: 11px;
      color: #999;
      line-height: 1.6;
    }

    /* ── Print actions ── */
    .actions {
      text-align: center;
      margin-bottom: 24px;
      display: flex;
      gap: 10px;
      justify-content: center;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 22px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      text-decoration: none;
    }
    .btn-primary { background: #d4af37; color: #1a1a1a; }
    .btn-secondary { background: #f0ece3; color: #444; border: 1px solid #ddd; }
    .btn:hover { opacity: 0.88; }

    @media print {
      body { background: #fff; padding: 0; }
      .actions { display: none !important; }
      .page { box-shadow: none; border-radius: 0; }
    }
  </style>
</head>
<body>
  <div class="actions">
    <button class="btn btn-primary" onclick="window.print()">🖨️ Print Receipt</button>
    <a class="btn btn-secondary" href="/client/bookings/${b.id}">← Back to Booking</a>
  </div>

  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="brand">
        <img src="/brand/company-logo.jpg" alt="Muzuka Gilbert" class="brand-logo" onerror="this.style.display='none'" />
        <div class="brand-text">
          <div class="brand-name">Muzuka Gilbert</div>
          <div class="brand-tagline">Luxury Photography &amp; Videography</div>
        </div>
      </div>
      <div class="header-meta">
        <div>
          <div class="receipt-title">Receipt</div>
          <div class="receipt-number">${receiptNumber}</div>
        </div>
        <span class="receipt-status">${payment.status.replace("_", " ")}</span>
      </div>
    </div>

    <!-- Body -->
    <div class="body">

      <!-- Payment info -->
      <div class="section">
        <div class="section-title">Payment Details</div>
        <div class="row"><span class="label">Receipt No.</span><span class="value" style="font-family:monospace">${receiptNumber}</span></div>
        <div class="row"><span class="label">Date</span><span class="value">${fmtDate(paid)}</span></div>
        <div class="row"><span class="label">Time</span><span class="value">${fmtTime(paid)}</span></div>
        <div class="row"><span class="label">Payment Status</span><span class="value" style="color:${statusColour};font-weight:700">${payment.status.replace("_", " ")}</span></div>
      </div>

      <!-- Client info -->
      <div class="section">
        <div class="section-title">Billed To</div>
        <div class="row"><span class="label">Name</span><span class="value">${escHtml(client.name)}</span></div>
        <div class="row"><span class="label">Email</span><span class="value">${escHtml(client.email)}</span></div>
        ${client.phone ? `<div class="row"><span class="label">Phone</span><span class="value">${escHtml(client.phone)}</span></div>` : ""}
      </div>

      <!-- Booking info -->
      <div class="section">
        <div class="section-title">Service Details</div>
        <div class="row"><span class="label">Booking</span><span class="value">${escHtml(b.title)}</span></div>
        <div class="row"><span class="label">Service</span><span class="value">${escHtml(b.serviceType)}</span></div>
        ${b.package ? `<div class="row"><span class="label">Package</span><span class="value">${escHtml(b.package.name)}</span></div>` : ""}
        <div class="row"><span class="label">Event Date</span><span class="value">${fmtDate(b.scheduledAt)}</span></div>
        ${b.location ? `<div class="row"><span class="label">Location</span><span class="value">${escHtml(b.location)}</span></div>` : ""}
      </div>

      <!-- Amount -->
      <div class="section">
        <div class="section-title">Amount Paid</div>
        ${b.package ? `<div class="row"><span class="label">Package Price</span><span class="value">${(b.package.priceCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}</span></div>` : ""}
        <div class="total-row">
          <span>Amount Paid</span>
          <span>${amount}</span>
        </div>
        ${payment.status === "DEPOSIT_PAID" ? `
        <p class="note" style="margin-top:12px;">
          This is a <strong>deposit receipt</strong>. The remaining balance is due before or on the event date. 
          Full gallery access will be granted upon complete payment.
        </p>` : ""}
        ${payment.status === "PAID" ? `
        <p class="note" style="margin-top:12px;">
          ✅ Payment complete. Your private gallery will be delivered after your session is processed.
        </p>` : ""}
      </div>

    </div>

    <!-- Footer -->
    <div class="footer">
      <p><strong>Thank you for choosing Muzuka Gilbert!</strong></p>
      <p style="margin-top:4px;">"We don't just take pictures. We create masterpieces that tell your story."</p>
      <p style="margin-top:8px;">For questions: info@muzukagilbert.com · Nairobi, Kenya</p>
      <p style="margin-top:4px; color:#bbb;">© ${new Date().getFullYear()} Muzuka Gilbert. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

  const isDownload = req.nextUrl.searchParams.get("download") === "1";
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...(isDownload
        ? { "Content-Disposition": `attachment; filename="receipt-${receiptNumber}.html"` }
        : {}),
    },
  });
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
