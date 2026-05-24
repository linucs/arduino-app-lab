package blocks

import (
	"context"
	"os"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// Source is the single interface the Go backend uses to obtain catalog entries.
// Three implementations exist across iterations:
//   - BundledSource (this iteration): reads //go:embed YAML from the binary.
//   - FilesystemSource (dev override): reads $BLOCK_CATALOG_PATH on disk.
//   - RemoteSource (iteration 5): fetches a tagged release tarball from the
//     arduino-app-blocks repo and caches it under {UserCacheDir}/arduino-app-lab/blocks/.
type Source interface {
	LoadCatalog(ctx context.Context) ([]CatalogEntry, error)
}

// compositeSource merges entries from multiple sources. Bundled entries
// (built-in blocks embedded in the binary) are always loaded first;
// external entries (FilesystemSource or RemoteSource) are appended.
type compositeSource struct {
	sources []Source
}

func (c *compositeSource) LoadCatalog(ctx context.Context) ([]CatalogEntry, error) {
	var all []CatalogEntry
	for _, src := range c.sources {
		entries, err := src.LoadCatalog(ctx)
		if err != nil {
			runtime.LogWarningf(ctx, "blocks: source failed: %v", err)
			continue
		}
		all = append(all, entries...)
	}
	return all, nil
}

// NewSource returns a composite Source that always includes bundled entries
// (//go:embed built-in blocks). When BLOCK_CATALOG_PATH is set (dev override),
// a FilesystemSource is added for external catalog entries. In production,
// RemoteSource (iteration 5) will replace the noop external slot.
func NewSource() Source {
	sources := []Source{&BundledSource{}}

	if path := os.Getenv("BLOCK_CATALOG_PATH"); path != "" {
		sources = append(sources, &FilesystemSource{path: path})
	}

	return &compositeSource{sources: sources}
}
