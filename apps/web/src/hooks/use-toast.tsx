
import { Toast, ToastActionElement, ToastProps } from "@/components/ui/toast";
import { useState, createContext, ReactNode, useContext } from "react";

type ToastContextType = {
  toasts: ToastType[];
  addToast: (toast: ToastType) => void;
  removeToast: (id: string) => void;
  updateToast: (id: string, toast: Partial<ToastType>) => void;
};

type ToastType = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastType[]>([]);

  const addToast = (toast: ToastType) => {
    setToasts((prev) => [...prev, toast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const updateToast = (id: string, toast: Partial<ToastType>) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...toast } : t))
    );
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, updateToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  
  const { toasts, addToast, removeToast, updateToast } = context;

  return {
    toast: (props: Omit<ToastType, "id">) => {
      const id = Math.random().toString(36).slice(2);
      addToast({ id, ...props });
      
      if (props.duration !== Infinity) {
        setTimeout(() => {
          removeToast(id);
        }, props.duration || 5000);
      }
      
      return {
        id,
        update: (props: Partial<ToastType>) => updateToast(id, props),
        dismiss: () => removeToast(id),
      };
    },
    dismiss: (id: string) => removeToast(id),
    toasts,
  };
};
