import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    hover?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ hover = false, className = '', children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`card ${hover ? 'card-hover' : ''} ${className}`}
                {...props}
            >
                {children}
            </div>
        );
    }
);

Card.displayName = 'Card';