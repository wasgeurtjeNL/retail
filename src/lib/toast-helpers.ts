// Helper bestand voor toast functionaliteit met sonner
import { toast } from 'sonner';

// Exporteer toast functies die overal in de applicatie gebruikt kunnen worden
export const showSuccessToast = (message: string) => {
  toast.success(message);
};

export const showErrorToast = (message: string) => {
  toast.error(message);
};

export const showInfoToast = (message: string) => {
  toast.info(message);
};

export const showWarningToast = (message: string) => {
  toast.warning(message);
};

// Exporteer de basis toast voor eenvoudige meldingen
export { toast };

// Gebruik voorbeeld:
// import { showSuccessToast, showErrorToast } from '@/lib/toast-helpers';
//
// showSuccessToast('Uw bestelling is succesvol geplaatst!');
// showErrorToast('Er is een fout opgetreden bij het plaatsen van uw bestelling.'); 