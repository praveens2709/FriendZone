import React, { createContext, useCallback, useContext, useState } from "react";
import ConfirmModal from "@/components/ConfirmModal";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
}

const ConfirmContext = createContext<(options: ConfirmOptions) => void>(() => undefined);

export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [visible, setVisible] = useState(false);

  const confirm = useCallback((next: ConfirmOptions) => {
    setOptions(next);
    setVisible(true);
  }, []);

  const close = () => setVisible(false);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmModal
        visible={visible}
        title={options?.title ?? ""}
        message={options?.message}
        confirmLabel={options?.confirmLabel}
        cancelLabel={options?.cancelLabel}
        onCancel={close}
        onConfirm={() => {
          close();
          options?.onConfirm();
        }}
      />
    </ConfirmContext.Provider>
  );
}
