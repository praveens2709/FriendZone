import { create } from "zustand";
import httpClient from "@/configs/axios.config";

type UploadStatus = "idle" | "uploading" | "processing" | "done" | "error";

interface UploadState {
  status: UploadStatus;
  progress: number;
  thumbUri: string | null;
  doneCount: number;
  startPostUpload: (formData: FormData, thumbUri: string | null) => void;
  retry: () => void;
  dismiss: () => void;
}

let pending: { formData: FormData; thumbUri: string | null } | null = null;
let clearTimer: ReturnType<typeof setTimeout> | null = null;

export const useUploadStore = create<UploadState>((set, get) => {
  const run = async () => {
    if (!pending) return;
    if (clearTimer) clearTimeout(clearTimer);
    set({ status: "uploading", progress: 0, thumbUri: pending.thumbUri });
    try {
      await httpClient.post("posts", pending.formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 180000,
        onUploadProgress: (event) => {
          const total = event.total || 0;
          if (!total) return;
          const ratio = Math.min(1, event.loaded / total);
          set({ progress: ratio, status: ratio >= 1 ? "processing" : "uploading" });
        },
      });
      pending = null;
      set({ status: "done", progress: 1, doneCount: get().doneCount + 1 });
      clearTimer = setTimeout(() => set({ status: "idle", progress: 0, thumbUri: null }), 1200);
    } catch {
      set({ status: "error" });
    }
  };

  return {
    status: "idle",
    progress: 0,
    thumbUri: null,
    doneCount: 0,
    startPostUpload: (formData, thumbUri) => {
      pending = { formData, thumbUri };
      run();
    },
    retry: () => {
      run();
    },
    dismiss: () => {
      pending = null;
      if (clearTimer) clearTimeout(clearTimer);
      set({ status: "idle", progress: 0, thumbUri: null });
    },
  };
});
