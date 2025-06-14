import React from 'react';
import LoadingDialog from '../components/LoadingDialog';

const LoadingDialogContext = React.createContext<{
  visible: boolean;
  show: () => void;
  hide: () => void;
} | null>(null);

export function useLoadingDialog() {
  const context = React.useContext(LoadingDialogContext);

  if (!context) {
    throw new Error('useLoadingDialog must be used within an AuthProvider');
  }

  return context;
}

export function LoadingDialogProvider({children}: {children: React.ReactNode}) {
  const [visible, setVisible] = React.useState(false);
  return (
    <LoadingDialogContext.Provider
      value={{
        visible,
        show: () => {
          setVisible(true);
        },
        hide: () => {
          setVisible(false);
        },
      }}>
      <LoadingDialog visible={visible} />
      {children}
    </LoadingDialogContext.Provider>
  );
}
