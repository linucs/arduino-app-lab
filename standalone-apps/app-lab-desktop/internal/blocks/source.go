package blocks

import (
	"context"
	"os"
)

// Source is the single interface the Go backend uses to obtain catalog entries.
// Two implementations exist across iterations:
//   - FilesystemSource (this iteration): reads $BLOCK_CATALOG_PATH on disk.
//   - RemoteSource (iteration 5): fetches a tagged release tarball from the
//     arduino-app-blocks repo and caches it under {UserCacheDir}/arduino-app-lab/blocks/.
type Source interface {
	LoadCatalog(ctx context.Context) ([]CatalogEntry, error)
}

// NewSource returns the appropriate Source based on the environment. When
// BLOCK_CATALOG_PATH is set (dev override), a FilesystemSource pointing at
// that path is returned. Otherwise a noopSource is returned — RemoteSource
// is not yet implemented (iteration 5).
func NewSource() Source {
	if path := os.Getenv("BLOCK_CATALOG_PATH"); path != "" {
		return &FilesystemSource{path: path}
	}
	return &noopSource{}
}

// noopSource returns an empty catalog. Used in production builds until
// RemoteSource is implemented in iteration 5.
type noopSource struct{}

func (n *noopSource) LoadCatalog(_ context.Context) ([]CatalogEntry, error) {
	return nil, nil
}
