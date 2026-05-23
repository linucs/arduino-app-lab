import { BlockCatalogService } from '@cloud-editor-mono/domain/src/services/services-by-app/app-lab';
import { CatalogEntry } from '@cloud-editor-mono/common';

import { GetBlockCatalog } from '../../wailsjs/go/app/App';

export const getBlockCatalog: BlockCatalogService['getBlockCatalog'] =
  async function (): Promise<CatalogEntry[]> {
    const entries = await GetBlockCatalog();
    return (entries ?? []) as unknown as CatalogEntry[];
  };
