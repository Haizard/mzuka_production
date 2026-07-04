"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createGalleryAction } from "@/app/admin/galleries/actions";

interface CreateGalleryFormProps {
  bookingId: string;
  bookingTitle: string;
  onSuccess?: () => void;
}

export function CreateGalleryForm({
  bookingId,
  bookingTitle,
  onSuccess,
}: CreateGalleryFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState(bookingTitle);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await createGalleryAction(bookingId, title);

      if (result.success) {
        setIsOpen(false);
        setTitle(bookingTitle);
        onSuccess?.();
      } else {
        setError(result.error || "Failed to create gallery");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1 text-sm font-medium text-white transition"
      >
        <Plus className="h-4 w-4" />
        Create Gallery
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-[var(--surface)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Create Gallery</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-zinc-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Gallery Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-zinc-500 focus:border-[var(--gold)] focus:outline-none"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-lg bg-[var(--gold)] px-4 py-2 font-semibold text-black hover:bg-yellow-500 disabled:opacity-50 transition"
            >
              {isLoading ? "Creating..." : "Create Gallery"}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 rounded-lg border border-white/10 px-4 py-2 font-semibold text-white hover:bg-white/5 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
