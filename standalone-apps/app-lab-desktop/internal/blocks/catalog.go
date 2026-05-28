package blocks

// Domain types for the block catalog. The JSON tags mirror the TypeScript
// CatalogEntry types in app/domain/src/services/block-catalog-service/catalogEntry.types.ts — Wails
// serializes these structs directly to the frontend via GetBlockCatalog().

// CatalogEntry is the top-level unit in the block catalog. A single YAML file
// contains exactly one entry.
type CatalogEntry struct {
	ID              string            `yaml:"id"              json:"id"`
	Category        string            `yaml:"category"        json:"category"`
	Docs            map[string]string `yaml:"docs,omitempty"  json:"docs,omitempty"`
	Implementations []Implementation  `yaml:"implementations" json:"implementations"`
}

// Implementation describes how a catalog entry's blocks are implemented for
// one runtime. A single CatalogEntry may have multiple implementations
// (e.g. one for arduino:cpp and one for arduino:python).
type Implementation struct {
	Runtime      string           `yaml:"runtime"               json:"runtime"`
	Dependencies []Dependency     `yaml:"dependencies,omitempty" json:"dependencies,omitempty"`
	Codegen      *CodegenSections `yaml:"codegen,omitempty"      json:"codegen,omitempty"`
	Blocks       []BlockDefinition `yaml:"blocks"                json:"blocks"`
}

// Dependency names a library, pip package, or Docker brick required by an
// implementation.
type Dependency struct {
	Type       string            `yaml:"type"               json:"type"`
	Name       string            `yaml:"name"               json:"name"`
	MinVersion string            `yaml:"minVersion,omitempty" json:"minVersion,omitempty"`
	Variables  map[string]string `yaml:"variables,omitempty"  json:"variables,omitempty"`
}

// CodegenSections is the shared codegen shape for both implementation-level
// and block-level sections. All string values support {{placeholder}} syntax.
type CodegenSections struct {
	Imports      []string          `yaml:"imports,omitempty"      json:"imports,omitempty"`
	Declarations []string          `yaml:"declarations,omitempty" json:"declarations,omitempty"`
	Setup        []string          `yaml:"setup,omitempty"        json:"setup,omitempty"`
	Helpers      map[string]string `yaml:"helpers,omitempty"      json:"helpers,omitempty"`
	Cleanup      []string          `yaml:"cleanup,omitempty"      json:"cleanup,omitempty"`
}

// BlockCodegen extends CodegenSections with block-level fields (body,
// precedence, inputDefaults).
type BlockCodegen struct {
	CodegenSections `yaml:",inline"`
	Body          []string               `yaml:"body,omitempty"          json:"body,omitempty"`
	Precedence    string                 `yaml:"precedence,omitempty"    json:"precedence,omitempty"`
	InputDefaults map[string]interface{} `yaml:"inputDefaults,omitempty" json:"inputDefaults,omitempty"`
}

// BlockDefinition is one block inside an Implementation. The Blockly field is
// passed verbatim to Blockly.common.defineBlocksWithJsonArray() on the
// frontend; arbitrary Blockly JSON properties are allowed.
type BlockDefinition struct {
	Blockly   map[string]interface{} `yaml:"blockly"             json:"blockly"`
	Codegen   *BlockCodegen          `yaml:"codegen,omitempty"   json:"codegen,omitempty"`
	Generator string                 `yaml:"generator,omitempty" json:"generator,omitempty"`
	Tags      []string               `yaml:"tags,omitempty"      json:"tags,omitempty"`
}
