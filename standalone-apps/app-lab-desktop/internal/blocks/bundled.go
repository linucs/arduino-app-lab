package blocks

import (
	"context"
	"io/fs"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"gopkg.in/yaml.v3"
)

// BundledSource reads catalog YAML files from the embedded builtinFS.
// These are built-in Arduino blocks (I/O, Messaging, Utility, etc.)
// that ship inside the App Lab binary and are always available.
type BundledSource struct{}

func (s *BundledSource) LoadCatalog(ctx context.Context) ([]CatalogEntry, error) {
	var entries []CatalogEntry

	err := fs.WalkDir(builtinFS, "builtin", func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			runtime.LogWarningf(ctx, "blocks: skipping bundled %s: %v", p, err)
			return nil
		}
		if d.IsDir() || !strings.HasSuffix(d.Name(), ".yaml") {
			return nil
		}

		data, err := fs.ReadFile(builtinFS, p)
		if err != nil {
			runtime.LogWarningf(ctx, "blocks: failed to read bundled %s: %v", p, err)
			return nil
		}

		var entry CatalogEntry
		if err := yaml.Unmarshal(data, &entry); err != nil {
			runtime.LogWarningf(ctx, "blocks: failed to parse bundled %s: %v", p, err)
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
