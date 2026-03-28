import { NextRequest, NextResponse } from 'next/server';
import { getProductsByCategories } from '@/lib/db';
import { sidebarCategories, type SidebarCategoryNode } from '@/data/sidebar-categories';

/** Collect the titles of a node and every descendant under it. */
function collectDescendantTitles(nodes: SidebarCategoryNode[], target: string): string[] | null {
  for (const node of nodes) {
    if (node.title.trim().toLowerCase() === target.trim().toLowerCase()) {
      return gatherAllTitles(node);
    }
    if (node.children?.length) {
      const found = collectDescendantTitles(node.children, target);
      if (found !== null) return found;
    }
  }
  return null;
}

function gatherAllTitles(node: SidebarCategoryNode): string[] {
  const titles: string[] = [node.title];
  if (node.children?.length) {
    for (const child of node.children) {
      titles.push(...gatherAllTitles(child));
    }
  }
  return titles;
}

export async function GET(req: NextRequest) {
  try {
    const name = req.nextUrl.searchParams.get('name') ?? '';
    if (!name.trim()) {
      return NextResponse.json({ error: 'name query parameter is required' }, { status: 400 });
    }

    const matchingTitles = collectDescendantTitles(sidebarCategories, name);

    if (!matchingTitles) {
      return NextResponse.json([]);
    }

    const products = await getProductsByCategories(matchingTitles);
    return NextResponse.json(products);
  } catch (error) {
    console.error('by-category route error:', error);
    return NextResponse.json({ error: 'Failed to fetch products for category' }, { status: 500 });
  }
}
