package blocks

import (
	"context"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"gopkg.in/yaml.v3"
)

// FilesystemSource reads catalog YAML files from a local directory tree,
// typically a checkout of the arduino-app-blocks sibling repo pointed at by
// $BLOCK_CATALOG_PATH. Each .yaml file must contain exactly one CatalogEntry.
//
// Corrupt or unreadable files are logged and skipped; the remaining entries
// are returned. Schema validation is an authoring-time concern (codegen.md §10)
// — the Go side parses and fails gracefully, it does not re-validate the schema.
type FilesystemSource struct {
	path string
}

func (s *FilesystemSource) LoadCatalog(ctx context.Context) ([]CatalogEntry, error) {
	var entries []CatalogEntry

	err := filepath.WalkDir(s.path, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			runtime.LogWarningf(ctx, "blocks: skipping %s: %v", p, err)
			return nil
		}
		if d.IsDir() || !strings.HasSuffix(d.Name(), ".yaml") {
			return nil
		}

		data, err := os.ReadFile(p)
		if err != nil {
			runtime.LogWarningf(ctx, "blocks: failed to read %s: %v", p, err)
			return nil
		}

		var entry CatalogEntry
		if err := yaml.Unmarshal(data, &entry); err != nil {
			runtime.LogWarningf(ctx, "blocks: failed to parse %s: %v", p, err)
			return nil
		}

		entries = append(entries, entry)
		return nil
	})
	if err != nil {
		return nil, err
	}

	return entries, nil
}
