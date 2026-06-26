"use client";

import type { BookingStatus } from "@prisma/client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Calendar, DollarSign, User } from "lucide-react";
import { getAllBookings, getBookingStats, updateBookingStatusAction } from "./actions";
import { CreateGalleryForm } from "@/components/create-gallery-form";

interface BookingWithClient {
  id: string;
  title: string;
  serviceType: string;
  scheduledAt: Date;
  status: string;
  paymentStatus: string;
  client: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  package: {
    name: string;
    priceCents: number;
  } | null;
  gallery?: {
    id: string;
  } | null;
}

interface Stats {
  total: number;
  requested: number;
  confirmed: number;
  completed: number;
  paid: number;
  unpaid: number;
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<BookingWithClient[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filter, setFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [bookingsResult, statsResult] = await Promise.all([
      getAllBookings({
        status: filter === "ALL" ? undefined : (filter as BookingStatus),
      }),
      getBookingStats(),
    ]);

    if (bookingsResult.success) {
      setBookings(bookingsResult.bookings);
    }
    if (statsResult.success) {
      setStats(statsResult.stats);
    }
    setIsLoading(false);
  }, [filter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    const result = await updateBookingStatusAction(bookingId, newStatus);
    if (result.success) {
      // Reload data
      loadData();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "REQUESTED":
        return "bg-blue-500/10 text-blue-300";
      case "CONFIRMED":
        return "bg-emerald-500/10 text-emerald-300";
      case "IN_PROGRESS":
        return "bg-yellow-500/10 text-yellow-300";
      case "COMPLETED":
        return "bg-purple-500/10 text-purple-300";
      case "CANCELLED":
        return "bg-red-500/10 text-red-300";
      default:
        return "bg-zinc-500/10 text-zinc-300";
    }
  };

  const getPaymentColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-emerald-500/10 text-emerald-300";
      case "DEPOSIT_PAID":
        return "bg-blue-500/10 text-blue-300";
      case "UNPAID":
        return "bg-red-500/10 text-red-300";
      default:
        return "bg-zinc-500/10 text-zinc-300";
    }
  };

  return (
    <main className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {[
            { label: "Total", value: stats.total },
            { label: "Pending", value: stats.requested },
            { label: "Confirmed", value: stats.confirmed },
            { label: "Completed", value: stats.completed },
            { label: "Paid", value: stats.paid },
            { label: "Unpaid", value: stats.unpaid },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-white/10 bg-[var(--surface)] p-4"
            >
              <p className="text-xs text-zinc-400">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {["ALL", "REQUESTED", "CONFIRMED", "IN_PROGRESS", "COMPLETED"].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              filter === status
                ? "bg-[var(--gold)] text-black"
                : "border border-white/10 text-zinc-300 hover:border-white/20"
            }`}
          >
            {status === "IN_PROGRESS" ? "In Progress" : status}
          </button>
        ))}
      </div>

      {/* Bookings Table */}
      <div className="overflow-x-auto">
        <div className="rounded-lg border border-white/10 bg-[var(--surface)]">
          {isLoading ? (
            <div className="p-8 text-center text-zinc-400">Loading bookings...</div>
          ) : bookings.length === 0 ? (
            <div className="p-8 text-center text-zinc-400">No bookings found</div>
          ) : (
            <div className="divide-y divide-white/10">
              {bookings.map((booking) => (
                <div key={booking.id}>
                  <button
                    onClick={() =>
                      setExpandedId(expandedId === booking.id ? null : booking.id)
                    }
                    className="w-full p-4 text-left hover:bg-white/5 transition flex items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">{booking.title}</h3>
                      <p className="text-sm text-zinc-400 truncate">{booking.client.name}</p>
                    </div>

                    <div className="hidden sm:flex items-center gap-3">
                      <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${getStatusColor(booking.status)}`}>
                        {booking.status === "IN_PROGRESS" ? "In Progress" : booking.status}
                      </span>
                      <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${getPaymentColor(booking.paymentStatus)}`}>
                        {booking.paymentStatus === "DEPOSIT_PAID" ? "Deposit Paid" : booking.paymentStatus}
                      </span>
                    </div>

                    <ChevronDown
                      className={`h-4 w-4 text-zinc-400 transition ${
                        expandedId === booking.id ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {expandedId === booking.id && (
                    <div className="border-t border-white/10 p-4 bg-white/5 space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-zinc-500 uppercase mb-1">Service Type</p>
                          <p className="text-white capitalize">{booking.serviceType}</p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500 uppercase mb-1">Date</p>
                          <p className="text-white flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {new Date(booking.scheduledAt).toLocaleDateString()}
                          </p>
                        </div>
                        {booking.package && (
                          <div>
                            <p className="text-xs text-zinc-500 uppercase mb-1">Package</p>
                            <p className="text-white">{booking.package.name}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-zinc-500 uppercase mb-1">Amount</p>
                          <p className="text-white flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            {booking.package
                              ? (booking.package.priceCents / 100).toFixed(2)
                              : "TBD"}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-zinc-500 uppercase mb-2">Client Contact</p>
                        <p className="text-white flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {booking.client.email}
                        </p>
                        {booking.client.phone && (
                          <p className="text-white text-sm mt-1">{booking.client.phone}</p>
                        )}
                      </div>

                      <div className="pt-4 border-t border-white/10 space-y-3">
                        <p className="text-xs text-zinc-500 uppercase">Actions</p>
                        <div className="flex flex-wrap gap-2">
                          <select
                            onChange={(e) => handleStatusChange(booking.id, e.target.value)}
                            value={booking.status}
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm text-white focus:border-[var(--gold)] focus:outline-none"
                          >
                            <option value="REQUESTED">Pending Review</option>
                            <option value="CONFIRMED">Confirm</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Complete</option>
                            <option value="CANCELLED">Cancel</option>
                          </select>

                          {booking.gallery ? (
                            <Link
                              href={`/admin/galleries`}
                              className="rounded-lg bg-purple-600 hover:bg-purple-700 px-3 py-1 text-sm text-white transition"
                            >
                              View Gallery
                            </Link>
                          ) : (
                            <CreateGalleryForm
                              bookingId={booking.id}
                              bookingTitle={booking.title}
                              onSuccess={loadData}
                            />
                          )}

                          <Link
                            href={`/admin/bookings/${booking.id}`}
                            className="rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1 text-sm text-white transition"
                          >
                            Full Details
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
