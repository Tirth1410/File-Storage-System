"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import {
  hasCompletedTour,
  markTourCompleted,
  createDashboardTour,
  createGroupsTour,
  cleanupDriverDom,
  STORAGE_KEY_DASHBOARD,
  STORAGE_KEY_GROUPS,
} from "@/app/lib/tour";
import type { Driver } from "driver.js";

type TourType = "dashboard" | "groups";

const STORAGE_KEY_MAP: Record<TourType, string> = {
  dashboard: STORAGE_KEY_DASHBOARD,
  groups: STORAGE_KEY_GROUPS,
};

export function useProductTour(tourType: TourType) {
  const driverRef = useRef<Driver | null>(null);
  const [showModal, setShowModal] = useState(() => {
    if (typeof window === "undefined") return false;
    return !hasCompletedTour(STORAGE_KEY_MAP[tourType]);
  });

  const startTour = useCallback(() => {
    if (typeof window === "undefined") return;
    if (hasCompletedTour(STORAGE_KEY_MAP[tourType])) return;

    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
      cleanupDriverDom();
    }

    setShowModal(false);

    const factory =
      tourType === "dashboard" ? createDashboardTour : createGroupsTour;
    const d = factory();
    driverRef.current = d as Driver;

    setTimeout(() => {
      if (driverRef.current === d) {
        d.drive();
      }
    }, 600);
  }, [tourType]);

  const resetTour = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_MAP[tourType]);
  }, [tourType]);

  const dismissTour = useCallback(() => {
    setShowModal(false);
    markTourCompleted(STORAGE_KEY_MAP[tourType]);
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
      cleanupDriverDom();
    }
  }, [tourType]);

  useEffect(() => {
    return () => {
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
        cleanupDriverDom();
      }
    };
  }, []);

  return { showModal, startTour, dismissTour, resetTour };
}
