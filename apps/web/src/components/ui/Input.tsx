import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, hint, className = '', id, ...props }, ref) => {
        const inputId = id || props.name;
        return (
            <div className="w-full">
                {label && (
                    <label htmlFor={inputId} className="label">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    className={`input ${error ? 'border-red-500 focus-visible:ring-red-500' : ''} ${className}`}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
                    {...props}
                />
                {error && (
                    <p id={`${inputId}-error`} className="mt-1.5 text-sm text-red-600" role="alert">
                        {error}
                    </p>
                )}
                {hint && !error && (
                    <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-gray-500">
                        {hint}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';