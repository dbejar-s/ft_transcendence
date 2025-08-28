import validator from 'validator';

// Input validation and sanitization functions
export const validateEmail = (email: string): boolean => {
    return validator.isEmail(email) && email.length <= 255;
};

export const validateUsername = (username: string): boolean => {
    // Username: 3-30 characters, alphanumeric + underscore/dash
    return /^[a-zA-Z0-9_-]{3,30}$/.test(username);
};

export const validatePassword = (password: string): boolean => {
    // Password: at least 8 characters, contains letter and number
    return password.length >= 8 && 
           /[A-Za-z]/.test(password) && 
           /[0-9]/.test(password);
};

export const validateUUID = (uuid: string): boolean => {
    return validator.isUUID(uuid);
};

export const validate2FACode = (code: string): boolean => {
    return /^\d{6}$/.test(code);
};

export const validateAlphanumeric = (input: string, minLength = 1, maxLength = 100): boolean => {
    return input.length >= minLength && 
           input.length <= maxLength && 
           /^[a-zA-Z0-9\s_-]+$/.test(input);
};

export const validateInteger = (input: any): boolean => {
    return Number.isInteger(Number(input)) && Number(input) >= 0;
};

export const sanitizeString = (input: string): string => {
    return validator.escape(validator.trim(input));
};

export const sanitizeUsername = (username: string): string => {
    // Remove any non-alphanumeric, underscore, or dash characters
    return username.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 30);
};

export const sanitizeEmail = (email: string): string => {
    return validator.normalizeEmail(validator.trim(email)) || '';
};

// Common validation schemas
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

export const validateUserRegistration = (data: any): ValidationResult => {
    const errors: string[] = [];

    if (!data.email || !validateEmail(data.email)) {
        errors.push('Valid email is required');
    }

    if (!data.username || !validateUsername(data.username)) {
        errors.push('Username must be 3-30 characters, alphanumeric with underscore/dash only');
    }

    if (!data.password || !validatePassword(data.password)) {
        errors.push('Password must be at least 8 characters with letters and numbers');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

export const validateUserLogin = (data: any): ValidationResult => {
    const errors: string[] = [];

    if (!data.email || !validateEmail(data.email)) {
        errors.push('Valid email is required');
    }

    if (!data.password || data.password.length < 1) {
        errors.push('Password is required');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

export const validate2FARequest = (data: any): ValidationResult => {
    const errors: string[] = [];

    if (!data.userId || !validateUUID(data.userId)) {
        errors.push('Valid user ID is required');
    }

    if (!data.code || !validate2FACode(data.code)) {
        errors.push('Valid 6-digit 2FA code is required');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};
