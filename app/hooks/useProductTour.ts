"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  hasCompletedTour,
  createDashboardTour,
  createGroupsTour,
} from "@/app/lib/tour";
import type { Driver } from "driver.js";

type TourType = "dashboard" | "groups";

export function useProductTour(tourType: TourType, autoStart = true) {
  const driverRef = useRef<Driver | null>(null);

  const startTour = useCallback(() => {
    if (typeof window === "undefined") return;
    if (hasCompletedTour(`${tourType}_tour`)) return;

    const factory =
      tourType === "dashboard" ? createDashboardTour : createGroupsTour;
    const d = factory();
    driverRef.current = d as Driver;

    setTimeout(() => {
      d.drive();
    }, 600);
  }, [tourType]);

  const resetTour = useCallback(() => {
    localStorage.removeItem(`${tourType}_tour_completed`);
  }, [tourType]);

  const skipTour = useCallback(() => {
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (autoStart) {
      startTour();
    }
    return () => {
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
    };
  }, [autoStart, startTour]);

  return { startTour, resetTour, skipTour };
}
