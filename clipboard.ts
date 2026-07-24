import { dispatchAppNotify } from '@/lib/app-notify';
import { t } from '@/lib/i18n';

interface CopyTextOptions {
  successMessage?: string;
  errorMessage?: string;
  emptyMessage?: string;
  notify?: boolean;
  onSuccess?: () => void;
  onError?: () => void;
}

function copyTextWithExecCommand(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed'; // Avoid scrolling to bottom
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.width = '2em';
  textarea.style.height = '2em';
  textarea.style.padding = '0';
  textarea.style.border = 'none';
  textarea.style.outline = 'none';
  textarea.style.boxShadow = 'none';
  textarea.style.background = 'transparent';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    return document.execCommand('copy');
  } catch (err) {
    console.error('Fallback copy failed:', err);
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

export async function copyTextToClipboard(value: string, options: CopyTextOptions = {}): Promise<boolean> {
  const text = String(value || '');
  if (!text.trim()) {
    if (options.notify !== false) {
      dispatchAppNotify('warning', options.emptyMessage || t('txt_nothing_to_copy'));
    }
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    options.onSuccess?.();
    if (options.notify !== false) {
      dispatchAppNotify('success', options.successMessage || t('txt_copied'));
    }
    return true;
  } catch (err) {
    // Fallback to document.execCommand for older browsers or insecure contexts
    if (copyTextWithExecCommand(text)) {
      options.onSuccess?.();
      if (options.notify !== false) {
        dispatchAppNotify('success', options.successMessage || t('txt_copied'));
      }
      return true;
    } else {
      options.onError?.();
      if (options.notify !== false) {
        dispatchAppNotify('error', options.errorMessage || t('txt_copy_failed'));
      }
      return false;
    }
  }
}
