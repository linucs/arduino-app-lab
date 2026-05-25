import { CatalogEntry } from './catalogEntry.types';

export interface BlockCatalogService {
  getBlockCatalog(): Promise<CatalogEntry[]>;
}
