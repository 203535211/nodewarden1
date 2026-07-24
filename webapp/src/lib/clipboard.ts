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

/**
 * 增强版 execCommand 回退方案
 * 针对 iOS/Android 及旧版浏览器进行了深度适配
 */
function fallbackCopyTextToClipboard(text: string): boolean {
  const textArea = document.createElement('textarea');
  textArea.value = text;

  // 核心修复：确保元素在 DOM 中但对用户不可见
  // 使用 opacity: 0 和 position: fixed 而不是 display: none，确保浏览器认为它是“活跃”的
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  textArea.style.top = '0';
  textArea.style.opacity = '0';
  textArea.style.fontSize = '12pt'; // 防止 iOS 聚焦时触发页面缩放
  
  // 某些浏览器需要 readonly 属性来辅助选中
  textArea.setAttribute('readonly', '');
  
  document.body.appendChild(textArea);

  // 兼容 iOS 的选中方式：iOS 需要 Range 和 Selection API 才能稳定选中
  const isiOS = navigator.userAgent.match(/ipad|iphone/i);
  if (isiOS) {
    const range = document.createRange();
    range.selectNodeContents(textArea);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    textArea.setSelectionRange(0, 999999);
  } else {
    textArea.focus();
    textArea.select();
  }

  let successful = false;
  try {
    successful = document.execCommand('copy');
  } catch (err) {
    console.error('Fallback copy failed:', err);
    successful = false;
  }

  document.body.removeChild(textArea);
  return successful;
}

/**
 * 复制文本到剪贴板（现代 API + 增强版回退）
 */
export async function copyTextToClipboard(value: string, options: CopyTextOptions = {}): Promise<boolean> {
  const text = String(value || '');
  if (!text.trim()) {
    if (options.notify !== false) {
      dispatchAppNotify('warning', options.emptyMessage || t('txt_nothing_to_copy'));
    }
    return false;
  }

  let successful = false;

  try {
    // 优先使用现代 API，但需满足安全上下文 (HTTPS/localhost)
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      successful = true;
    } else {
      // 在非安全上下文或不支持的浏览器中直接使用回退
      successful = fallbackCopyTextToClipboard(text);
    }
  } catch (err) {
    console.warn('Modern Clipboard API failed, trying fallback...', err);
    // 如果现代 API 报错（如权限拒绝），尝试回退方案
    try {
      successful = fallbackCopyTextToClipboard(text);
    } catch (fallbackErr) {
      successful = false;
    }
  }

  if (successful) {
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
