// Utility for copying text to clipboard with fallback support
// Handles both modern Clipboard API and legacy execCommand for HTTP/older browsers
class ClipboardUtils {

  static serializePins(pins) {
    if (!pins || typeof pins !== 'object') {
      return {};
    }

    const serializedPins = {};

    Object.entries(pins).forEach(([gpio, pinData]) => {
      if (!pinData || typeof pinData !== 'object') return;

      serializedPins[gpio] = {
        n: pinData.n ?? pinData.name ?? '',
        m: pinData.m ?? pinData.mode ?? '',
        v: pinData.v ?? pinData.value ?? ''
      };
    });

    return serializedPins;
  }

  static serializeDevice(device) {
    if (!device || typeof device !== 'object') {
      return {
        ip: '',
        d: '',
        ls: '',
        p: {}
      };
    }

    const serialized = {
      ip: device.ip || '',
      d: device.description ?? device.d ?? '',
      ls: device.last_seen ?? device.ls ?? '',
      p: this.serializePins(device.pins ?? device.p)
    };

    if (Boolean(device.blink ?? device.b ?? false)) {
      serialized.b = true;
    }

    if (device.is_simulator === true || device.sim === true) {
      serialized.sim = true;
    }

    return serialized;
  }

  static serializeDeviceMap(devices) {
    if (!devices || typeof devices !== 'object') {
      return {};
    }

    return Object.fromEntries(
      Object.entries(devices).map(([deviceId, device]) => [
        deviceId,
        this.serializeDevice(device)
      ])
    );
  }
  
  static async copy(text) {
    try {
      // Try modern Clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback for HTTP or older browsers
        return this._fallbackCopy(text);
      }
    } catch (error) {
      console.error('Clipboard copy failed:', error);
      return false;
    }
  }

  static _fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.left = '-999999px';
    textarea.style.top = '-999999px';
    document.body.appendChild(textarea);
    
    try {
      textarea.select();
      textarea.focus();
      const successful = document.execCommand('copy');
      return successful;
    } catch (err) {
      console.error('Fallback copy failed:', err);
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }

  static async copyJSON(obj, indent = 2) {
    try {
      const jsonString = JSON.stringify(obj, null, indent);
      return await this.copy(jsonString);
    } catch (error) {
      console.error('JSON stringify failed:', error);
      return false;
    }
  }
}

// Export for use in other scripts
window.ClipboardUtils = ClipboardUtils;
