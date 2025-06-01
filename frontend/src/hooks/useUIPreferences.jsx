// hooks/useUIPreferences.jsx
import { useState, useEffect, useCallback }
//Không cần useMemo ở đây nếu không có tính toán phức tạp cần ghi nhớ
from "react";

// --- Các hằng số và hàm helper ---
const DEFAULT_ACCENT_COLOR = '#0d9394';
const DEFAULT_THEME_MODE = 'system'; // Đổi tên để rõ ràng là chế độ sáng/tối
const DEFAULT_FONT_SIZE = 'medium';
const DEFAULT_BORDER_RADIUS = 'medium';
const DEFAULT_CUSTOM_THEME = null; // Theme tùy chỉnh mặc định (không có)

export const ACCENT_COLORS = [
    { name: 'Mặc định (Teal)', value: '#0d9394', className: 'accent-default' },
    { name: 'Xanh dương', value: '#0d6efd', className: 'accent-blue' },
    { name: 'Hồng', value: '#d63384', className: 'accent-pink' },
    { name: 'Cam', value: '#fd7e14', className: 'accent-orange' },
    { name: 'Tím', value: '#6f42c1', className: 'accent-purple' },
    { name: 'Đỏ', value: '#dc3545', className: 'accent-red' },
    { name: 'Xanh lá', value: '#198754', className: 'accent-green' },
    { name: 'Xanh lạnh', value: '#0dcaf0', className: 'accent-cyan' },
    { name: 'Vàng', value: '#ffc107', className: 'accent-yellow' }
];

const hexToRgbArray = (hex) => {
    if (!hex) return [13, 147, 148];
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : [13, 147, 148];
};

function calculateDarkenedRgb(rgbArray, percent) {
    return rgbArray.map(channel => Math.max(0, Math.floor(channel * (1 - percent / 100))));
}

function calculateLightenedRgb(rgbArray, percent) {
    return rgbArray.map(channel => Math.min(255, Math.floor(channel + (255 - channel) * (percent / 100))));
}
// Không cần darkenColor và lightenColor với isEffectiveDark nữa nếu logic tính toán màu đã ổn định.

const useUIPreferences = () => {
    const [preferences, setPreferences] = useState(() => {
        try {
            return {
                theme: localStorage.getItem('theme') || DEFAULT_THEME_MODE, // Chế độ sáng/tối/hệ thống
                accentColor: localStorage.getItem('accentColor') || DEFAULT_ACCENT_COLOR,
                fontSize: localStorage.getItem('fontSize') || DEFAULT_FONT_SIZE,
                borderRadius: localStorage.getItem('borderRadius') || DEFAULT_BORDER_RADIUS,
                activeCustomTheme: localStorage.getItem('activeCustomTheme') || DEFAULT_CUSTOM_THEME, // Theme tùy chỉnh từ cửa hàng
            };
        } catch (e) {
            console.warn("localStorage is unavailable, using default preferences.");
            return {
                theme: DEFAULT_THEME_MODE,
                accentColor: DEFAULT_ACCENT_COLOR,
                fontSize: DEFAULT_FONT_SIZE,
                borderRadius: DEFAULT_BORDER_RADIUS,
                activeCustomTheme: DEFAULT_CUSTOM_THEME,
            };
        }
    });

    // Hàm áp dụng tất cả các tùy chọn UI
    const applyAllPreferences = useCallback(() => {
        const root = document.documentElement;

        // 1. Áp dụng Theme Sáng/Tối (theme)
        const currentSystemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        const themeToApply = preferences.theme === 'system' ? currentSystemTheme : preferences.theme;
        root.setAttribute('data-ww-theme', themeToApply); // data-ww-theme cho light/dark

        // 2. Áp dụng Theme Tùy Chỉnh (activeCustomTheme)
        // Xóa các class custom theme cũ trước khi thêm class mới
        root.classList.forEach(className => {
            if (className.startsWith('custom-theme-')) {
                root.classList.remove(className);
            }
        });
        if (preferences.activeCustomTheme && preferences.activeCustomTheme !== "null") { // Kiểm tra "null" string
            root.classList.add(`custom-theme-${preferences.activeCustomTheme}`);
        }

        // 3. Áp dụng Accent Color
        if (preferences.accentColor) {
            const primaryRgbArray = hexToRgbArray(preferences.accentColor);
            root.style.setProperty('--w-primary-rgb', primaryRgbArray.join(', '));
            root.style.setProperty('--w-primary', preferences.accentColor);

            const isEffectiveDark = themeToApply === 'dark'; // Dùng theme đã được giải quyết

            const textEmphasisRgb = isEffectiveDark
                ? calculateLightenedRgb(primaryRgbArray, 60)
                : calculateDarkenedRgb(primaryRgbArray, 60);
            root.style.setProperty('--w-primary-text-emphasis-rgb', textEmphasisRgb.join(', '));
            root.style.setProperty('--w-primary-text-emphasis', `rgb(${textEmphasisRgb.join(', ')})`);

            const bgSubtleRgb = isEffectiveDark
                ? calculateDarkenedRgb(primaryRgbArray, 40)
                : calculateLightenedRgb(primaryRgbArray, 42);
            root.style.setProperty('--w-primary-bg-subtle-rgb', bgSubtleRgb.join(', '));
            root.style.setProperty('--w-primary-bg-subtle', `rgb(${bgSubtleRgb.join(', ')})`);

            const borderSubtleRgb = isEffectiveDark
                ? calculateDarkenedRgb(primaryRgbArray, 65)
                : calculateLightenedRgb(primaryRgbArray, 80);
            root.style.setProperty('--w-primary-border-subtle-rgb', borderSubtleRgb.join(', '));
            root.style.setProperty('--w-primary-border-subtle', `rgb(${borderSubtleRgb.join(', ')})`);

            // ... (các màu phụ trợ khác nếu có: --w-primary-dark, --w-primary-light)
        }

        // 4. Áp dụng Font Size
        if (preferences.fontSize) {
            let baseFontSize = '1rem'; // medium
            if (preferences.fontSize === 'small') baseFontSize = '0.875rem';
            else if (preferences.fontSize === 'large') baseFontSize = '1.125rem';
            root.style.setProperty('--w-body-font-size', baseFontSize);
        }

        // 5. Áp dụng Border Radius
        if (preferences.borderRadius) {
            let radiusValue = '0.375rem'; // medium
            let radiusSmValue = '0.25rem';
            let radiusLgValue = '0.5rem';
            if (preferences.borderRadius === 'none') { /* ... */ }
            else if (preferences.borderRadius === 'small') { /* ... */ }
            else if (preferences.borderRadius === 'large') { /* ... */ }
            root.style.setProperty('--w-border-radius', radiusValue);
            root.style.setProperty('--w-border-radius-sm', radiusSmValue);
            root.style.setProperty('--w-border-radius-lg', radiusLgValue);
        }
    }, [preferences]); // Phụ thuộc vào state preferences tổng

    // Áp dụng preferences khi state preferences thay đổi
    useEffect(() => {
        applyAllPreferences();
    }, [applyAllPreferences]);

    // Lắng nghe thay đổi theme hệ thống (chỉ khi theme là 'system')
    useEffect(() => {
        const mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
        const systemThemeChangeHandler = () => {
            if (preferences.theme === 'system') {
                // Chỉ cần gọi lại applyAllPreferences là đủ vì nó sẽ đọc lại system theme
                applyAllPreferences();
            }
        };
        mediaQueryList.addEventListener('change', systemThemeChangeHandler);
        return () => mediaQueryList.removeEventListener('change', systemThemeChangeHandler);
    }, [preferences.theme, applyAllPreferences]); // Chạy lại nếu theme hoặc applyAllPreferences thay đổi

    // Hàm để cập nhật một tùy chọn cụ thể và lưu vào localStorage
    const setSinglePreference = useCallback((key, value) => {
        setPreferences(prevPrefs => {
            const newPrefs = { ...prevPrefs, [key]: value };
            try {
                // Lưu giá trị mới vào localStorage
                if (value === null || value === undefined) {
                    localStorage.removeItem(key);
                } else {
                    localStorage.setItem(key, String(value)); // Đảm bảo lưu String
                }
            } catch (e) {
                console.warn(`Failed to save preference '${key}' to localStorage.`, e);
            }
            return newPrefs;
        });
        // applyAllPreferences sẽ được gọi tự động bởi useEffect ở trên khi preferences thay đổi
    }, []);


    return {
        preferences,
        setSinglePreference, // Đổi tên hàm này để rõ ràng hơn
        ACCENT_COLORS,
    };
};

export default useUIPreferences;