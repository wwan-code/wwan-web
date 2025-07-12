// backend/utils/timeUtils.js
/**
 * Parses a duration string (HH:MM:SS, MM:SS, SS) into milliseconds.
 * @param {string} durationString - The duration string.
 * @returns {number|null} Total milliseconds or null if format is invalid.
 */
export const parseDurationToMilliseconds = (durationString) => {
    if (!durationString || typeof durationString !== 'string') {
        return null;
    }
    const parts = durationString.split(':').map(Number);
    let hours = 0, minutes = 0, seconds = 0;

    if (parts.some(isNaN)) {
        return null;
    }

    if (parts.length === 3) { // HH:MM:SS
        [hours, minutes, seconds] = parts;
    } else if (parts.length === 2) { // MM:SS
        [minutes, seconds] = parts;
    } else if (parts.length === 1) { // SS
        [seconds] = parts;
    } else {
        return null; // Định dạng không hợp lệ
    }

    if (hours < 0 || minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) {
        return null; // Giá trị không hợp lệ
    }

    return (hours * 3600 + minutes * 60 + seconds) * 1000;
};