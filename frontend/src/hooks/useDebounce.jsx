import { useEffect, useState } from 'react';

// A generic debounce hook that updates the returned value only after a given delay.
// Useful for delaying expensive operations like API calls while the user is typing.
export default function useDebounce(value, delay = 500) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
} 