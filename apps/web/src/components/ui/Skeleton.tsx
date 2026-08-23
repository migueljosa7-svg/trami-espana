import { HTMLAttributes } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
    lines?: number;
}

export function Skeleton({ lines = 3, className = '', ...props }: SkeletonProps) {
    return (
        <div className={`space-y-3 ${className}`} aria-hidden="true" {...props}>
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={i}
                    className={`skeleton ${i === 0 ? 'h-4 w-3/4' : i === lines - 1 ? 'h-4 w-1/2' : 'h-4 w-full'}`}
                />
            ))}
        </div>
    );
}

export function ProcedureCardSkeleton() {
    return (
        <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="skeleton h-5 w-24" />
                <div className="skeleton h-4 w-16" />
            </div>
            <div className="skeleton h-6 w-full mb-3" />
            <div className="skeleton h-4 w-full mb-2" />
            <div className="skeleton h-4 w-5/6 mb-4" />
            <div className="skeleton h-4 w-40" />
        </div>
    );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <ProcedureCardSkeleton key={i} />
            ))}
        </div>
    );
}

export function DetailSkeleton() {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="skeleton h-4 w-40" />
            <div className="skeleton h-8 w-3/4" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-5/6" />
            <div className="grid md:grid-cols-2 gap-6 mt-8">
                <div className="card p-6">
                    <div className="skeleton h-6 w-32 mb-4" />
                    <div className="skeleton h-4 w-full mb-2" />
                    <div className="skeleton h-4 w-5/6 mb-2" />
                    <div className="skeleton h-4 w-4/6" />
                </div>
                <div className="card p-6">
                    <div className="skeleton h-6 w-40 mb-4" />
                    <div className="skeleton h-4 w-full mb-2" />
                    <div className="skeleton h-4 w-3/4" />
                </div>
            </div>
        </div>
    );
}