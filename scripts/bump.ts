import { readFileSync, readdirSync, existsSync, writeFileSync } from "fs";
import { resolve, dirname, join, basename } from "path";
import { fileURLToPath } from "url";
import * as YAML from "yaml";
import { select, confirm, text, isCancel, cancel } from "@clack/prompts";
import { Command } from "commander";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface AppConfig {
	name: string;
	version: string;
	path: string;
	slug: string;
	configPath: string;
}

type BumpType = "major" | "minor" | "patch";

/**
 * Load a single app from a specific folder
 */
function loadAppFromFolder(folderPath: string): AppConfig | { error: string } {
	const appPath = resolve(folderPath);

	if (!existsSync(appPath)) {
		return { error: `Directory does not exist: ${appPath}` };
	}

	const configPath = join(appPath, "config.yaml");

	if (!existsSync(configPath)) {
		return { error: `No config.yaml found in ${appPath}` };
	}

	try {
		const configContent = readFileSync(configPath, "utf-8");
		const config = YAML.parse(configContent) as Record<string, unknown>;

		if (
			typeof config.name === "string" &&
			typeof config.version === "string"
		) {
			return {
				name: config.name,
				version: config.version,
				path: appPath,
				slug: appPath.split("/").pop() || "unknown",
				configPath,
			};
		}

		return { error: `Invalid config.yaml in ${appPath} - missing 'name' or 'version'` };
	} catch (error) {
		return { error: `Failed to parse config.yaml: ${error}` };
	}
}

/**
 * Discover available apps by looking for config.yaml files
 * in subdirectories of the workspace root
 */
function discoverApps(): AppConfig[] {
	const wsRoot = join(__dirname, "..");
	const entries = readdirSync(wsRoot, { withFileTypes: true });

	const apps: AppConfig[] = [];

	for (const entry of entries) {
		if (!entry.isDirectory()) continue;

		const folderPath = join(wsRoot, entry.name);
		const result = loadAppFromFolder(folderPath);

		// Check if result is an AppConfig (has 'name' property) or error object
		if ("error" in result) {
			// Skip entries that don't have a valid config
			continue;
		}

		apps.push(result);
	}

	return apps;
}

/**
 * Validate version format (semver)
 */
function isValidVersion(version: string): boolean {
	return /^\d+\.\d+\.\d+/.test(version);
}

/**
 * Parse and increment version number
 */
function bumpVersion(version: string, bumpType: BumpType): string {
	const parts = version.split(".");
	const major = parseInt(parts[0] ?? "", 10);
	const minor = parseInt(parts[1] ?? "", 10);
	const patch = parseInt(parts[2] ?? "", 10);

	if (bumpType === "major") {
		return `${major + 1}.0.0`;
	} else if (bumpType === "minor") {
		return `${major}.${minor + 1}.0`;
	} else {
		return `${major}.${minor}.${patch + 1}`;
	}
}

/**
 * Update the version in config.yaml file
 */
function updateConfigVersion(
	configPath: string,
	newVersion: string,
	dryRun: boolean
): void {
	const configContent = readFileSync(configPath, "utf-8");
	const config = YAML.parse(configContent) as Record<string, unknown>;

	const oldVersion = config.version;
	config.version = newVersion;

	const updatedContent = YAML.stringify(config, {
		lineWidth: -1,
		indent: 2,
	} as any);

	if (!dryRun) {
		writeFileSync(configPath, updatedContent, "utf-8");
	}
}

/**
 * List all available apps with their name and version
 */
function listApps(): void {
	const apps = discoverApps();

	if (apps.length === 0) {
		console.log("❌ No apps found");
		process.exit(1);
	}

	console.log("\n📦 Available apps:\n");

	apps.forEach((app) => {
		console.log(`  ${app.name.padEnd(30)} v${app.version}`);
	});

	console.log(`\n✅ Found ${apps.length} app(s)\n`);
}

/**
 * Interactive bump version command
 */
async function bumpApp(dryRun: boolean, folder?: string): Promise<void> {
	let selectedApp: AppConfig;

	if (folder) {
		// Direct app bump from specified folder
		console.log(`⏳ Loading app from ${basename(folder)}...`);
		const result = loadAppFromFolder(folder);
		if ("error" in result) {
			console.error(`❌ ${result.error}`);
			process.exit(1);
		}
		selectedApp = result;
	} else {
		// Discover and select from available apps
		const apps = discoverApps();

		if (apps.length === 0) {
			console.log("❌ No apps found");
			process.exit(1);
		}

		// If only one app, use it directly
		if (apps.length === 1) {
			selectedApp = apps[0]!;
		} else {
			// Select app from multiple apps
			const selectedAppSlug = await select({
				message: "Select an app to bump:",
				options: apps.map((app) => ({
					label: `${app.name} (v${app.version})`,
					value: app.slug,
				})),
			});

			if (isCancel(selectedAppSlug)) {
				cancel("Operation cancelled.");
				process.exit(0);
			}

			const app = apps.find((app) => app.slug === selectedAppSlug);
			if (!app) {
				console.log("❌ App not found");
				process.exit(1);
			}

			selectedApp = app;
		}
	}


	// Display the app being bumped
	console.log(`\n📦 Bumping: ${selectedApp.name} (v${selectedApp.version})\n`);

	// Select bump type
	const bumpTypeOrCustom = await select({
		message: "Select version bump type:",
		options: [
			{ label: `Major (${selectedApp.version} → ${bumpVersion(selectedApp.version, "major")})`, value: "major" },
			{ label: `Minor (${selectedApp.version} → ${bumpVersion(selectedApp.version, "minor")})`, value: "minor" },
			{ label: `Patch (${selectedApp.version} → ${bumpVersion(selectedApp.version, "patch")})`, value: "patch" },
			{ label: "Custom version", value: "custom" },
		],
	});

	if (isCancel(bumpTypeOrCustom)) {
		cancel("Operation cancelled.");
		process.exit(0);
	}

	let newVersion: string;

	if (bumpTypeOrCustom === "custom") {
		// Calculate suggested versions
		const suggestedMajor = bumpVersion(selectedApp.version, "major");
		const suggestedMinor = bumpVersion(selectedApp.version, "minor");
		const suggestedPatch = bumpVersion(selectedApp.version, "patch");

		// Prompt for custom version with suggestions
		const customVersion = await text({
			message: "Enter version number:",
			placeholder: `e.g., ${suggestedMajor}, ${suggestedMinor}, or ${suggestedPatch}`,
			initialValue: selectedApp.version,
		});

		if (isCancel(customVersion)) {
			cancel("Operation cancelled.");
			process.exit(0);
		}

		if (!isValidVersion(customVersion)) {
			console.log("❌ Invalid version format. Please use semantic versioning (e.g., 1.2.3)");
			process.exit(1);
		}

		newVersion = customVersion;
	} else {
		const bumpType = bumpTypeOrCustom as BumpType;
		newVersion = bumpVersion(selectedApp.version, bumpType);
	}

	// Display change information
	console.log("\n📝 Version change:");
	console.log(`   App:     ${selectedApp.name}`);
	console.log(`   Current: v${selectedApp.version}`);
	console.log(`   New:     v${newVersion}`);

	if (dryRun) {
		console.log("\n🔍 DRY RUN - No changes will be applied");
		return;
	}

	// Ask for confirmation
	const shouldApply = await confirm({
		message: "Apply this change?",
	});

	if (isCancel(shouldApply)) {
		cancel("Operation cancelled.");
		process.exit(0);
	}

	if (!shouldApply) {
		console.log("\n❌ Cancelled");
		process.exit(0);
	}

	// Apply the change
	updateConfigVersion(selectedApp.configPath, newVersion, false);
	console.log("\n✅ Version bumped successfully!");
}

// Main CLI setup
const program = new Command()
	.name("bump")
	.description("Bump app versions")
	.option("--dry-run", "Preview changes without applying them")
	.option("--list", "List all available apps")
	.option("--folder <path>", "Specify a specific app folder to bump");

program.parse(process.argv);
const options = program.opts();

// Execute the appropriate command
if (options.list) {
	listApps();
} else {
	bumpApp(options.dryRun, options.folder).catch((err) => {
		console.error("Error:", err);
		process.exit(1);
	});
}
