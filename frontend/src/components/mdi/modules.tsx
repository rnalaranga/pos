import { lazy, Suspense } from 'react';
import type { ModuleKey } from '../../store/windowStore';

// Lazy-load each module for performance
const Dashboard  = lazy(() => import('../../pages/Dashboard'));
const POS        = lazy(() => import('../../pages/POS'));
const Products   = lazy(() => import('../../pages/Products'));
const Categories = lazy(() => import('../../pages/Categories'));
const Inventory  = lazy(() => import('../../pages/Inventory'));
const GRN        = lazy(() => import('../../pages/GRN'));
const Suppliers  = lazy(() => import('../../pages/Suppliers'));
const Customers  = lazy(() => import('../../pages/Customers'));
const Settings   = lazy(() => import('../../pages/Settings'));
const Reports    = lazy(() => import('../../pages/Reports'));
const Warehouses = lazy(() => import('../../pages/Warehouses'));

const Loading = () => (
  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Loading...</div>
);

const MODULE_COMPONENTS: Record<ModuleKey, React.ComponentType> = {
  dashboard:  Dashboard,
  pos:        POS,
  products:   Products,
  categories: Categories,
  inventory:  Inventory,
  grn:        GRN,
  suppliers:  Suppliers,
  customers:  Customers,
  settings:   Settings,
  reports:    Reports,
  warehouses: Warehouses,
};

export function ModuleRenderer({ module }: { module: ModuleKey }) {
  const Component = MODULE_COMPONENTS[module];
  return (
    <Suspense fallback={<Loading />}>
      <Component />
    </Suspense>
  );
}
