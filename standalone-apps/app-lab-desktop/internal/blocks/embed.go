package blocks

import (
	"embed"
)

//go:embed all:builtin
var builtinFS embed.FS
