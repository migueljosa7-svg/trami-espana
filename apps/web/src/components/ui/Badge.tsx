import { HTMLAttributes } from 'react';

type BadgeVariant = 'primary' | 'green' | 'yellow' | 'gray' | 'red';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
    primary: 'badge-primary',
    green: 'badge-green',
    yellow: 'badge-yellow',
    gray: 'badge-gray',
    red: 'badge bg-red-50 text-red-700'
};

export function Badge({ variant = 'primary', className = '', children, ...props }: BadgeProps) {
    return (
        <span className={`${variantClasses[variant]} ${className}`} {...props}>
            {children}
        </span>
    );
}