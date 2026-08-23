import { Link } from 'react-router-dom';

interface CategoryCardProps {
    id: string;
    name: string;
    slug: string;
    icon: string;
}

export function CategoryCard({ name, icon, slug }: CategoryCardProps) {
    return (
        <Link
            to={`/tramites?categoria=${slug}`}
            className="card card-hover p-5 flex flex-col items-center text-center gap-3 group min-h-[140px] justify-center"
            aria-label={`Ver trámites de ${name}`}
        >
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-2xl group-hover:bg-blue-100 transition-colors">
                <span aria-hidden="true">{icon}</span>
            </div>
            <span className="font-medium text-gray-900 text-sm group-hover:text-blue-700 transition-colors">
                {name}
            </span>
        </Link>
    );
}