import { Category } from '../lib/supabase';

type CategoryCardProps = {
  category: Category;
  onSelect: (categoryId: string) => void;
  isSelected: boolean;
};

export function CategoryCard({ category, onSelect, isSelected }: CategoryCardProps) {
  return (
    <button
      onClick={() => onSelect(category.id)}
      className={`group relative overflow-hidden rounded-xl transition-all duration-300 ${
        isSelected
          ? 'ring-4 ring-orange-500 shadow-2xl scale-105'
          : 'hover:shadow-xl hover:scale-105'
      }`}
    >
      <div className="aspect-[4/3] relative">
        <img
          src={category.image_url}
          alt={category.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h3 className="text-xl font-bold mb-1">{category.name}</h3>
          <p className="text-sm text-slate-200 line-clamp-2">{category.description}</p>
        </div>
      </div>
    </button>
  );
}
