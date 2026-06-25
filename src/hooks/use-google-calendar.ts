"use client";

import { useCallback, useEffect, useState } from "react";

interface GoogleCalendarStatus {
  connected: boolean;
  calendar_id: string | null;
  loading: boolean;
}

export function useGoogleCalendar() {
  const [status, setStatus] = useState<GoogleCalendarStatus>({
    connected: false,
    calendar_id: null,
    loading: true,
  });

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/google-calendar/status");
      if (!response.ok) {
        setStatus({ connected: false, calendar_id: null, loading: false });
        return;
      }
      const data = (await response.json()) as {
        connected: boolean;
        calendar_id: string | null;
      };
      setStatus({
        connected: data.connected,
        calendar_id: data.calendar_id,
        loading: false,
      });
    } catch {
      setStatus({ connected: false, calendar_id: null, loading: false });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const connect = () => {
    window.location.href = "/api/google-calendar/auth";
  };

  const disconnect = async () => {
    const response = await fetch("/api/google-calendar/disconnect", {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("No se pudo desconectar Google Calendar");
    }
    await refresh();
  };

  return {
    connected: status.connected,
    calendarId: status.calendar_id,
    loading: status.loading,
    connect,
    disconnect,
    refresh,
  };
}
