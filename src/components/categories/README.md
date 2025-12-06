# Categories Components

This directory contains the product categories and subcategories data for the MyGarage application.

## Files

- [categoriesData.ts](file:///d:/PROJECTS/MyGarage/src/components/categories/categoriesData.ts): Contains the main product categories and subcategories data that was previously hardcoded in the Header component.

## Purpose

To modularize the application structure by moving hardcoded category data into a dedicated module. This makes the code more maintainable and easier to update in the future.

The categories data includes:
- Category IDs
- Category names
- Category icons
- Subcategories for each category

## Usage

Import the CATEGORIES constant from [categoriesData.ts](file:///d:/PROJECTS/MyGarage/src/components/categories/categoriesData.ts) in any component that needs to display or work with product categories:

```typescript
import { CATEGORIES } from '../categories/categoriesData';
```