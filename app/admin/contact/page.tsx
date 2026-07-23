"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type GuestBookingSlot = {
  dateKey: string;
  dateLabel: string;
  featureGuestName: string;
  musicalGuestName: string;
};

function getSettingsErrorMessage(status: number, fallback: string): string {
  if (status === 401) {
    return "Unauthorized: admin secret does not match this environment. Check ADMIN_SECRET and restart dev server after changes.";
  }

  if (status === 500 && fallback.includes("ADMIN_SECRET is not set")) {
    return "Server misconfigured: ADMIN_SECRET is not set for this environment.";
  }

  if (status === 500 && fallback.includes("Missing database connection string")) {
    return "Database is not configured for this environment. Set DATABASE_URL (or POSTGRES_URL / POSTGRES_PRISMA_URL / NEON_DATABASE_URL), then restart the server.";
  }

  return fallback;
}

export default function ContactAdminPage() {
  const [adminSecret, setAdminSecret] = useState("");
  const [guestBookingSlots, setGuestBookingSlots] = useState<GuestBookingSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingGuestBookingSlots, setSavingGuestBookingSlots] = useState(false);
  const [message, setMessage] = useState("");
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);

  const loadContactSettingsForSecret = useCallback(async (secretInput: string) => {
    const secret = secretInput.trim();

    if (!secret) {
      throw new Error("Enter admin secret first.");
    }

    window.localStorage.setItem("admin_secret", secret);

    const settingsResponse = await fetch("/api/admin/settings", {
      headers: {
        "x-admin-secret": secret,
      },
    });

    const settingsBody = (await settingsResponse.json()) as {
      guestBookingSlots?: GuestBookingSlot[];
      error?: string;
    };

    if (!settingsResponse.ok) {
      if (settingsResponse.status === 401) {
        window.localStorage.removeItem("admin_secret");
      }

      throw new Error(
        getSettingsErrorMessage(
          settingsResponse.status,
          settingsBody.error || "Failed to load contact form settings.",
        ),
      );
    }

    setGuestBookingSlots(settingsBody.guestBookingSlots ?? []);
    setHasLoadedSettings(true);
    setMessage("Contact form booking slots loaded.");
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("admin_secret");
    if (!saved) {
      return;
    }

    const normalizedSaved = saved.trim();
    if (!normalizedSaved) {
      return;
    }

    setAdminSecret(normalizedSaved);
    setLoading(true);
    setMessage("");
    loadContactSettingsForSecret(normalizedSaved)
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "Unknown error");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [loadContactSettingsForSecret]);

  const bookedCount = useMemo(
    () =>
      guestBookingSlots.reduce((total, slot) => {
        return total + (slot.featureGuestName.trim() ? 1 : 0) + (slot.musicalGuestName.trim() ? 1 : 0);
      }, 0),
    [guestBookingSlots],
  );

  const openCount = useMemo(() => {
    const totalSlots = guestBookingSlots.length * 2;
    return Math.max(0, totalSlots - bookedCount);
  }, [bookedCount, guestBookingSlots.length]);

  async function loadContactSettings(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      await loadContactSettingsForSecret(adminSecret);
    } catch (error) {
      setHasLoadedSettings(false);
      setGuestBookingSlots([]);
      setMessage(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function updateGuestBookingSlot(index: number, patch: Partial<GuestBookingSlot>) {
    setGuestBookingSlots((prev) => {
      const next = [...prev];
      const current = next[index];
      if (!current) {
        return prev;
      }

      next[index] = {
        ...current,
        ...patch,
      };

      return next;
    });
  }

  function clearGuestBookingSlot(index: number) {
    updateGuestBookingSlot(index, {
      featureGuestName: "",
      musicalGuestName: "",
    });
  }

  async function saveGuestBookingSlots() {
    setMessage("");
    setSavingGuestBookingSlots(true);

    try {
      const secret = adminSecret.trim();
      if (!secret) {
        throw new Error("Enter admin secret first.");
      }

      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret,
        },
        body: JSON.stringify({
          guestBookingSlots,
        }),
      });

      const body = (await response.json()) as {
        guestBookingSlots?: GuestBookingSlot[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          getSettingsErrorMessage(response.status, body.error || "Failed to save contact form slots."),
        );
      }

      setGuestBookingSlots(body.guestBookingSlots ?? guestBookingSlots);
      setMessage("Contact form booking slots saved.");
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Unauthorized:")) {
        window.localStorage.removeItem("admin_secret");
      }
      setMessage(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSavingGuestBookingSlots(false);
    }
  }

  return (
    <div className="comic-bg min-h-screen px-4 py-8 sm:px-8">
      <main className="mx-auto max-w-5xl">
        <section className="paper-panel">
          <h1 className="panel-title">Contact Form Admin</h1>
          <p className="week-meta">Manage only the Guest Booking Calendar used by the public contact form.</p>

          <div className="mt-4">
            <a href="/admin" className="admin-btn inline-block">
              Back to Main Admin
            </a>
            <a href="/contact.html" className="admin-btn ml-2 inline-block">
              Open Public Contact Form
            </a>
          </div>

          <form onSubmit={loadContactSettings} className="admin-tools mt-6">
            <input
              type="password"
              value={adminSecret}
              onChange={(event) => setAdminSecret(event.target.value)}
              placeholder="Admin secret"
              className="admin-input"
            />
            <div />
            <button type="submit" className="admin-btn" disabled={loading}>
              {loading ? "Loading..." : "Load Contact Settings"}
            </button>
          </form>

          <p className="track-meta mt-2">
            If you see Unauthorized, the entered value must exactly match ADMIN_SECRET for this running environment.
          </p>
          <p className="track-meta">
            If you see a database configuration error, add DATABASE_URL to this environment and restart the server.
          </p>

          {message ? <p className="admin-message mt-4">{message}</p> : null}

          {hasLoadedSettings ? (
            <article className="admin-card mt-6">
              <h2 className="track-title">Guest Booking Calendar</h2>
              <p className="track-meta">Add a guest name in either column to block that slot on the contact form.</p>
              <p className="track-meta">Open slots: {openCount} | Booked slots: {bookedCount}</p>

              <div className="mt-4 grid gap-3">
                {guestBookingSlots.map((slot, index) => (
                  <section
                    key={slot.dateKey}
                    className="rounded border-2 border-black bg-white p-3 shadow-[4px_4px_0_#000]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="track-title text-xl">{slot.dateLabel}</p>
                        <p className="track-meta">Friday 7:30 PM</p>
                      </div>
                      <button type="button" className="admin-btn" onClick={() => clearGuestBookingSlot(index)}>
                        Clear Slot
                      </button>
                    </div>

                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      <label className="grid gap-1">
                        <span className="track-meta font-black uppercase">Feature Guest</span>
                        <input
                          type="text"
                          value={slot.featureGuestName}
                          onChange={(event) =>
                            updateGuestBookingSlot(index, { featureGuestName: event.target.value })
                          }
                          placeholder="Guest name or leave blank"
                          className="admin-input"
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="track-meta font-black uppercase">Musical Guest</span>
                        <input
                          type="text"
                          value={slot.musicalGuestName}
                          onChange={(event) =>
                            updateGuestBookingSlot(index, { musicalGuestName: event.target.value })
                          }
                          placeholder="Guest name or leave blank"
                          className="admin-input"
                        />
                      </label>
                    </div>
                  </section>
                ))}
              </div>

              <div className="admin-row mt-4">
                <div />
                <button
                  type="button"
                  className="admin-btn"
                  onClick={saveGuestBookingSlots}
                  disabled={savingGuestBookingSlots}
                >
                  {savingGuestBookingSlots ? "Saving..." : "Save Contact Calendar"}
                </button>
              </div>
            </article>
          ) : (
            <article className="admin-card mt-6">
              <h2 className="track-title">Guest Booking Calendar</h2>
              <p className="track-meta">Load contact settings with a valid admin secret to edit booking slots.</p>
            </article>
          )}
        </section>
      </main>
    </div>
  );
}
