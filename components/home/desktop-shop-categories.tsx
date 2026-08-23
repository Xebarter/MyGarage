import { ProductImage } from '@/components/product-image';
import { HomeSectionHeader } from '@/components/home/home-section-header';
import { homeCardTone } from '@/lib/home-card-tones';

export type DepartmentTile = {
  category: string;
  count: number;
  image: string;
};

function formatCategoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function DesktopShopCategories({
  tiles,
  onSelectCategory,
}: {
  tiles: DepartmentTile[];
  onSelectCategory: (category: string) => void;
}) {
  if (tiles.length === 0) return null;

  const visible = tiles.slice(0, 12);

  return (
    <section id="shop-departments" aria-label="Shop by department" className="scroll-mt-28">
      <HomeSectionHeader
        eyebrow="Departments"
        title="Shop by category"
        description="Browse the parts desk the way a workshop would — grouped by the job, not the aisle."
      />

      <div className="grid grid-cols-3 gap-3 lg:grid-cols-4 lg:gap-4 xl:grid-cols-6 xl:gap-5">
        {visible.map((tile, index) => (
          <button
            key={tile.category}
            type="button"
            onClick={() => onSelectCategory(tile.category)}
            className="home-dept-tile group overflow-hidden rounded-2xl border border-black/[0.06] text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-300 hover:-translate-y-1 hover:border-black/[0.1] hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
            style={{
              backgroundColor: homeCardTone(index),
              animationDelay: `${Math.min(index, 8) * 45}ms`,
            }}
          >
            <div className="relative aspect-[5/4] overflow-hidden">
              <ProductImage
                src={tile.image}
                alt=""
                fill
                className="object-contain p-4 transition duration-500 group-hover:scale-[1.06] sm:p-5 lg:p-2.5 xl:p-2"
                sizes="(max-width: 1280px) 22vw, 220px"
              />
            </div>
            <div className="px-3.5 py-3.5">
              <p className="truncate text-sm font-semibold tracking-tight text-[#0B1220]">
                {formatCategoryLabel(tile.category)}
              </p>
              <p className="mt-0.5 text-xs text-[#64748B]">
                {tile.count} {tile.count === 1 ? 'item' : 'items'}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
