export function shopQueryHref(query: string): string {
  return `/?q=${encodeURIComponent(query)}`;
}

export function servicesHref(): string {
  return '/buyer/services';
}

export function serviceCategoryHref(title: string): string {
  return `/category/services/${encodeURIComponent(title)}`;
}
