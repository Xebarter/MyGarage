import { NextResponse } from 'next/server'
import { sidebarCategories } from '@/data/sidebar-categories'

export async function GET() {
  try {
    return NextResponse.json({ items: sidebarCategories })
  } catch {
    return NextResponse.json({ items: [] }, { status: 500 })
  }
}

