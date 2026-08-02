import { driver, type DriveStep, type Config } from "driver.js";
import "driver.js/dist/driver.css";

export const STORAGE_KEY_DASHBOARD = "vault_dashboard_tour_completed";
export const STORAGE_KEY_GROUPS = "vault_groups_tour_completed";

/* ─── localStorage helpers ─── */

export function hasCompletedTour(key: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(key) === "true";
}

export function markTourCompleted(key: string): void {
  localStorage.setItem(key, "true");
}

/* ─── Cleanup helper ─── */

export function cleanupDriverDom(): void {
  if (typeof document === "undefined") return;
  document
    .querySelectorAll(
      ".driver-overlay, .driver-overlay-animated, .driver-popover, .driver-fade",
    )
    .forEach((el) => el.remove());
}

/* ─── Shared driver config ─── */

const baseConfig: Partial<Config> = {
  showProgress: true,
  progressText: "{{current}} of {{total}}",
  animate: true,
  smoothScroll: true,
  allowClose: false,
  overlayClickBehavior: "close",
  stagePadding: 8,
  stageRadius: 12,
  popoverOffset: 12,
  popoverClass: "vault-tour-popover",
  showButtons: ["next", "previous"],
  nextBtnText: "Next",
  prevBtnText: "Back",
  doneBtnText: "Finish",
};

/* ─── Dashboard Tour ─── */

const dashboardSteps: DriveStep[] = [
  {
    element: '[data-tour="navbar"]',
    popover: {
      title: "Welcome to Vault!",
      description:
        "This is your navigation bar. Access Dashboard, Groups, and Profile from here.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: '[data-tour="storage-bar"]',
    popover: {
      title: "Your Storage Quota",
      description:
        "Track your storage usage here. This bar shows how much space you've used out of your total quota.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: '[data-tour="upload-zone"]',
    popover: {
      title: "Upload Your First File",
      description:
        "Drag & drop files here or click to browse. Vault supports files up to 200 MB with fast concurrent uploads.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="file-tabs"]',
    popover: {
      title: "My Files & Shared",
      description:
        "Switch between your own files and files others have shared with you.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: '[data-tour="file-list"]',
    popover: {
      title: "Your File List",
      description:
        "Once uploaded, your files appear here. You can preview, download, share, or delete them.",
      side: "left",
      align: "center",
    },
  },
  {
    element: '[data-tour="file-actions"]',
    popover: {
      title: "Quick File Actions",
      description:
        "Every file has action buttons: Preview in-browser, Download, Share via link or user permissions, or Delete.",
      side: "top",
      align: "center",
    },
  },
  {
    element: '[data-tour="user-badge"]',
    popover: {
      title: "Your Account",
      description:
        "Your profile and avatar live here. Admins will see an 'Admin Portal' button to manage the platform.",
      side: "bottom",
      align: "end",
    },
  },
];

/* ─── Groups Tour ─── */

const groupsSteps: DriveStep[] = [
  {
    element: '[data-tour="groups-title"]',
    popover: {
      title: "Groups",
      description:
        "Groups let you organize team members and share files with everyone at once.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: '[data-tour="create-group-btn"]',
    popover: {
      title: "Create a Group",
      description:
        "Start by creating a group — name it after your team, project, or department.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: '[data-tour="groups-list"]',
    popover: {
      title: "Your Groups",
      description:
        "Once you create groups, they'll appear here. Click into a group to manage members, view shared files, and adjust permissions.",
      side: "top",
      align: "center",
    },
  },
];

/* ─── Tour factories ─── */

export function createDashboardTour() {
  return driver({
    ...baseConfig,
    steps: dashboardSteps,
    onDestroyed: () => {
      markTourCompleted(STORAGE_KEY_DASHBOARD);
      cleanupDriverDom();
    },
  });
}

export function createGroupsTour() {
  return driver({
    ...baseConfig,
    steps: groupsSteps,
    onDestroyed: () => {
      markTourCompleted(STORAGE_KEY_GROUPS);
      cleanupDriverDom();
    },
  });
}
