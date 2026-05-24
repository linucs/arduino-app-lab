package blocks

import (
	"context"
	"testing"
)

func TestCompositeSourceLoadsWithoutError(t *testing.T) {
	src := NewSource()
	entries, err := src.LoadCatalog(context.Background())
	if err != nil {
		t.Fatalf("LoadCatalog failed: %v", err)
	}
	t.Logf("composite source returned %d entries", len(entries))
}
