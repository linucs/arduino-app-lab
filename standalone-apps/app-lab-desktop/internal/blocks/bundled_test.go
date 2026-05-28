package blocks

import (
	"context"
	"fmt"
	"testing"
)

// Known imperative generator class names registered in
// sectionContainerGenerators.ts. A YAML block that references a generator
// NOT in this set will be silently refused by CodeFactory at runtime.
var knownGenerators = map[string]bool{
	"SectionIncludesGenerator":     true,
	"SectionDeclarationsGenerator": true,
	"SectionSetupGenerator":        true,
}

func TestBundledSourceLoadsWithoutError(t *testing.T) {
	src := &BundledSource{}
	entries, err := src.LoadCatalog(context.Background())
	if err != nil {
		t.Fatalf("LoadCatalog failed: %v", err)
	}
	if len(entries) == 0 {
		t.Fatal("no bundled entries loaded — builtin YAMLs are missing")
	}
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

func TestBundledBlockIntegrity(t *testing.T) {
	src := &BundledSource{}
	entries, err := src.LoadCatalog(context.Background())
	if err != nil {
		t.Fatalf("LoadCatalog failed: %v", err)
	}

	seenTypes := map[string]string{} // "runtime/blockType" → entryID (detect per-runtime duplicates)
	var declarative, imperative, rejected int

	for _, e := range entries {
		for _, impl := range e.Implementations {
			for i, b := range impl.Blocks {
				btype, _ := b.Blockly["type"].(string)
				if btype == "" {
					t.Errorf("entry %q, impl %q, block[%d]: missing blockly.type", e.ID, impl.Runtime, i)
					rejected++
					continue
				}

				// Duplicate type detection (scoped per runtime — the same block
				// type in two different runtimes is normal)
				key := fmt.Sprintf("%s/%s", impl.Runtime, btype)
				if prev, ok := seenTypes[key]; ok {
					t.Errorf("duplicate block type %q in runtime %q: first in %q, again in %q", btype, impl.Runtime, prev, e.ID)
				}
				seenTypes[key] = e.ID

				// Every block must have either codegen or generator
				hasCodegen := b.Codegen != nil
				hasGenerator := b.Generator != ""

				if !hasCodegen && !hasGenerator {
					t.Errorf("block %q in entry %q: has neither codegen nor generator", btype, e.ID)
					rejected++
					continue
				}
				if hasCodegen && hasGenerator {
					t.Errorf("block %q in entry %q: has BOTH codegen and generator — pick one", btype, e.ID)
				}

				// Imperative blocks must reference a known generator class
				if hasGenerator {
					if !knownGenerators[b.Generator] {
						t.Errorf("block %q in entry %q: generator %q not in knownGenerators allowlist", btype, e.ID, b.Generator)
						rejected++
						continue
					}
					imperative++
				} else {
					declarative++
				}
			}
		}
	}

	t.Logf("block integrity: %d declarative, %d imperative, %d rejected", declarative, imperative, rejected)
	if rejected > 0 {
		t.Errorf("%d blocks would be silently rejected at runtime", rejected)
	}
}
