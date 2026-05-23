import { CatalogEntry } from '@cloud-editor-mono/common';

export interface BlockCatalogService {
  getBlockCatalog(): Promise<CatalogEntry[]>;
}
