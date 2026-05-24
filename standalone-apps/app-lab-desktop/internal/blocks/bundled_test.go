package blocks

import (
	"context"
	"testing"
)

func TestBundledSourceLoadsWithoutError(t *testing.T) {
	src := &BundledSource{}
	entries, err := src.LoadCatalog(context.Background())
	if err != nil {
		t.Fatalf("LoadCatalog failed: %v", err)
	}
	// Empty is valid — builtin YAML files are added incrementally in step 6.
	t.Logf("loaded %d bundled entries", len(entries))

	for _, e := range entries {
		if e.ID == "" {
			t.Error("bundled entry has empty ID")
		}
		if len(e.Implementations) == 0 {
			t.Errorf("bundled entry %q has no implementations", e.ID)
		}
	}
}
