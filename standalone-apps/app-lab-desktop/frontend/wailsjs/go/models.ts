export namespace blocks {
	
	export class BlockCodegen {
	    imports?: string[];
	    declarations?: string[];
	    setup?: string[];
	    helpers?: Record<string, string>;
	    cleanup?: string[];
	    body?: string[];
	    precedence?: string;
	    inputDefaults?: Record<string, any>;
	
	    static createFrom(source: any = {}) {
	        return new BlockCodegen(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.imports = source["imports"];
	        this.declarations = source["declarations"];
	        this.setup = source["setup"];
	        this.helpers = source["helpers"];
	        this.cleanup = source["cleanup"];
	        this.body = source["body"];
	        this.precedence = source["precedence"];
	        this.inputDefaults = source["inputDefaults"];
	    }
	}
	export class BlockDefinition {
	    blockly: Record<string, any>;
	    codegen?: BlockCodegen;
	    generator?: string;
	    tags?: string[];
	
	    static createFrom(source: any = {}) {
	        return new BlockDefinition(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.blockly = source["blockly"];
	        this.codegen = this.convertValues(source["codegen"], BlockCodegen);
	        this.generator = source["generator"];
	        this.tags = source["tags"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class CodegenSections {
	    imports?: string[];
	    declarations?: string[];
	    setup?: string[];
	    helpers?: Record<string, string>;
	    cleanup?: string[];
	
	    static createFrom(source: any = {}) {
	        return new CodegenSections(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.imports = source["imports"];
	        this.declarations = source["declarations"];
	        this.setup = source["setup"];
	        this.helpers = source["helpers"];
	        this.cleanup = source["cleanup"];
	    }
	}
	export class Dependency {
	    type: string;
	    name: string;
	    minVersion?: string;
	    variables?: Record<string, string>;
	
	    static createFrom(source: any = {}) {
	        return new Dependency(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.type = source["type"];
	        this.name = source["name"];
	        this.minVersion = source["minVersion"];
	        this.variables = source["variables"];
	    }
	}
	export class Implementation {
	    runtime: string;
	    dependencies?: Dependency[];
	    codegen?: CodegenSections;
	    blocks: BlockDefinition[];
	
	    static createFrom(source: any = {}) {
	        return new Implementation(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.runtime = source["runtime"];
	        this.dependencies = this.convertValues(source["dependencies"], Dependency);
	        this.codegen = this.convertValues(source["codegen"], CodegenSections);
	        this.blocks = this.convertValues(source["blocks"], BlockDefinition);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class CatalogEntry {
	    id: string;
	    category: string;
	    docs?: Record<string, string>;
	    implementations: Implementation[];
	
	    static createFrom(source: any = {}) {
	        return new CatalogEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.category = source["category"];
	        this.docs = source["docs"];
	        this.implementations = this.convertValues(source["implementations"], Implementation);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	

}

export namespace board {
	
	export class BoardInfo {
	    FQBN: string;
	    BoardName: string;
	    Protocol: string;
	    Serial: string;
	    Address: string;
	    CustomName: string;
	
	    static createFrom(source: any = {}) {
	        return new BoardInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.FQBN = source["FQBN"];
	        this.BoardName = source["BoardName"];
	        this.Protocol = source["Protocol"];
	        this.Serial = source["Serial"];
	        this.Address = source["Address"];
	        this.CustomName = source["CustomName"];
	    }
	}
	export class Board {
	    id: string;
	    info: BoardInfo;
	
	    static createFrom(source: any = {}) {
	        return new Board(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.info = this.convertValues(source["info"], BoardInfo);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class KeyboardLayout {
	    label: string;
	    id: string;
	
	    static createFrom(source: any = {}) {
	        return new KeyboardLayout(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.label = source["label"];
	        this.id = source["id"];
	    }
	}

}

export namespace carrier {
	
	export class DeviceResult {
	    name: string;
	    device_type: string;
	    available_devices: string[];
	
	    static createFrom(source: any = {}) {
	        return new DeviceResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.device_type = source["device_type"];
	        this.available_devices = source["available_devices"];
	    }
	}
	export class Carrier {
	    name: string;
	    devices: DeviceResult[];
	
	    static createFrom(source: any = {}) {
	        return new Carrier(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.devices = this.convertValues(source["devices"], DeviceResult);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class EnableDeviceConfig {
	    Device: string;
	    Option: string;
	
	    static createFrom(source: any = {}) {
	        return new EnableDeviceConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Device = source["Device"];
	        this.Option = source["Option"];
	    }
	}
	export class StatusDeviceResult {
	    device: string;
	    option: string;
	    device_type: string;
	
	    static createFrom(source: any = {}) {
	        return new StatusDeviceResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.device = source["device"];
	        this.option = source["option"];
	        this.device_type = source["device_type"];
	    }
	}
	export class ShowCarrierResult {
	    carrier_name: string;
	    current_enabled: boolean;
	    next_enabled: boolean;
	    current: StatusDeviceResult[];
	    next: StatusDeviceResult[];
	
	    static createFrom(source: any = {}) {
	        return new ShowCarrierResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.carrier_name = source["carrier_name"];
	        this.current_enabled = source["current_enabled"];
	        this.next_enabled = source["next_enabled"];
	        this.current = this.convertValues(source["current"], StatusDeviceResult);
	        this.next = this.convertValues(source["next"], StatusDeviceResult);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ShowResult {
	    carriers: ShowCarrierResult[];
	
	    static createFrom(source: any = {}) {
	        return new ShowResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.carriers = this.convertValues(source["carriers"], ShowCarrierResult);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace flasher {
	
	export class OSImageRelease {
	    VersionLabel: string;
	    ID: string;
	    Latest: boolean;
	
	    static createFrom(source: any = {}) {
	        return new OSImageRelease(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.VersionLabel = source["VersionLabel"];
	        this.ID = source["ID"];
	        this.Latest = source["Latest"];
	    }
	}

}

export namespace fs {
	
	export class FSNode {
	    name: string;
	    path: string;
	    size: number;
	    isDir: boolean;
	    createdAt?: string;
	    modifiedAt?: string;
	    extension?: string;
	    mimeType?: string;
	    children?: FSNode[];
	
	    static createFrom(source: any = {}) {
	        return new FSNode(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.path = source["path"];
	        this.size = source["size"];
	        this.isDir = source["isDir"];
	        this.createdAt = source["createdAt"];
	        this.modifiedAt = source["modifiedAt"];
	        this.extension = source["extension"];
	        this.mimeType = source["mimeType"];
	        this.children = this.convertValues(source["children"], FSNode);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace learn {
	
	export class Tag {
	    id: string;
	    label: string;
	
	    static createFrom(source: any = {}) {
	        return new Tag(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.label = source["label"];
	    }
	}
	export class FullLearnResource {
	    id: string;
	    title: string;
	    description: string;
	    tags: Tag[];
	    icon: string;
	    category: string;
	    // Go type: time
	    lastRevision?: any;
	    content: string;
	
	    static createFrom(source: any = {}) {
	        return new FullLearnResource(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.description = source["description"];
	        this.tags = this.convertValues(source["tags"], Tag);
	        this.icon = source["icon"];
	        this.category = source["category"];
	        this.lastRevision = this.convertValues(source["lastRevision"], null);
	        this.content = source["content"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class LearnResourceEntry {
	    id: string;
	    title: string;
	    description: string;
	    tags: Tag[];
	    icon: string;
	    category: string;
	    // Go type: time
	    lastRevision?: any;
	
	    static createFrom(source: any = {}) {
	        return new LearnResourceEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.description = source["description"];
	        this.tags = this.convertValues(source["tags"], Tag);
	        this.icon = source["icon"];
	        this.category = source["category"];
	        this.lastRevision = this.convertValues(source["lastRevision"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace options {
	
	export class SecondInstanceData {
	    Args: string[];
	    WorkingDirectory: string;
	
	    static createFrom(source: any = {}) {
	        return new SecondInstanceData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Args = source["Args"];
	        this.WorkingDirectory = source["WorkingDirectory"];
	    }
	}

}

