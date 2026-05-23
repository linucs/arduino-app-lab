import { BlockCatalogService } from './blockCatalogService.type';

export let getBlockCatalog: BlockCatalogService['getBlockCatalog'] =
  async function () {
    throw new Error('getBlockCatalog service not implemented');
  };

export const setBlockCatalogService = (service: BlockCatalogService): void => {
  getBlockCatalog = service.getBlockCatalog;
};
