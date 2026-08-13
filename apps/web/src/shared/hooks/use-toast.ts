import { useToastStore, type ToastVariant } from '../components/toast';

function show(variant: ToastVariant, title: string, body?: string) {
  useToastStore.getState().add({ variant, title, ...(body !== undefined && { body }) });
}

/**
 * useToast — trigger toasts from any component.
 *
 * const { toast } = useToast();
 * toast.success('Saved');
 * toast.error('Failed to load', 'Check your connection and try again.');
 */
export function useToast() {
  const toast = {
    success: (title: string, body?: string) => show('success', title, body),
    error:   (title: string, body?: string) => show('error',   title, body),
    info:    (title: string, body?: string) => show('info',    title, body),
    warning: (title: string, body?: string) => show('warning', title, body),
  };
  return { toast };
}

/**
 * toast — static helper for use outside React components (stores, utils).
 *
 * import { toast } from '@/shared/hooks/use-toast';
 * toast.error('Something went wrong');
 */
export const toast = {
  success: (title: string, body?: string) => show('success', title, body),
  error:   (title: string, body?: string) => show('error',   title, body),
  info:    (title: string, body?: string) => show('info',    title, body),
  warning: (title: string, body?: string) => show('warning', title, body),
};
