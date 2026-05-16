#!/usr/bin/env node

// src/cli.ts
import { Command } from "commander";
import * as readline from "readline";

// src/scanner.ts
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
var defaultClaudeDir = path.join(os.homedir(), ".claude");
function extractDescription(content) {
  const lines = content.split("\n");
  let inFrontmatter = false;
  let frontmatterClosed = false;
  for (const line of lines) {
    if (!frontmatterClosed && line.trim() === "---") {
      inFrontmatter = !inFrontmatter;
      if (!inFrontmatter) frontmatterClosed = true;
      continue;
    }
    if (inFrontmatter) continue;
    if (!line.trim() || line.startsWith("#")) continue;
    return line.trim();
  }
  return "";
}
function scanStandaloneSkills(claudeDir = defaultClaudeDir) {
  const skillsDir2 = path.join(claudeDir, "skills");
  const disabledDir2 = path.join(skillsDir2, ".disabled");
  const skills = [];
  function readDir(dir, status) {
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith(".md")) continue;
      const filePath = path.join(dir, file);
      if (!fs.statSync(filePath).isFile()) continue;
      const name = file.slice(0, -3);
      const content = fs.readFileSync(filePath, "utf-8");
      skills.push({ source: "standalone", name, path: filePath, status, description: extractDescription(content) });
    }
  }
  readDir(skillsDir2, "active");
  readDir(disabledDir2, "disabled");
  return skills;
}
function scanPlugins(claudeDir = defaultClaudeDir) {
  const pluginsDir = path.join(claudeDir, "plugins");
  const installedFile = path.join(pluginsDir, "installed_plugins.json");
  if (!fs.existsSync(installedFile)) return [];
  const raw = JSON.parse(fs.readFileSync(installedFile, "utf-8"));
  const pluginMap = raw.plugins ?? {};
  const blockedSet = /* @__PURE__ */ new Set();
  const blocklistFile = path.join(pluginsDir, "blocklist.json");
  if (fs.existsSync(blocklistFile)) {
    const bl = JSON.parse(fs.readFileSync(blocklistFile, "utf-8"));
    for (const entry of bl.plugins ?? []) blockedSet.add(entry.plugin);
  }
  return Object.keys(pluginMap).map((pluginId) => {
    const atIdx = pluginId.indexOf("@");
    const name = atIdx >= 0 ? pluginId.slice(0, atIdx) : pluginId;
    const sourceMarket = atIdx >= 0 ? pluginId.slice(atIdx + 1) : "";
    const status = blockedSet.has(pluginId) ? "disabled" : "active";
    const cacheBase = path.join(pluginsDir, "cache", sourceMarket, name);
    const pluginSkills = [];
    if (fs.existsSync(cacheBase)) {
      const versions = fs.readdirSync(cacheBase).filter((d) => fs.statSync(path.join(cacheBase, d)).isDirectory()).sort();
      if (versions.length > 0) {
        const skillsDir2 = path.join(cacheBase, versions[versions.length - 1], "skills");
        if (fs.existsSync(skillsDir2)) collectPluginSkills(skillsDir2, name, pluginId, status, pluginSkills);
      }
    }
    return { id: pluginId, name, sourceMarket, skills: pluginSkills, status };
  });
}
function collectPluginSkills(dir, pluginName, pluginId, status, out) {
  for (const entry of fs.readdirSync(dir)) {
    const entryPath = path.join(dir, entry);
    if (fs.statSync(entryPath).isDirectory()) {
      for (const sub of fs.readdirSync(entryPath)) {
        if (!sub.endsWith(".md")) continue;
        const content = fs.readFileSync(path.join(entryPath, sub), "utf-8");
        out.push({ source: "plugin", name: `${entry}:${sub.slice(0, -3)}`, plugin: pluginId, status, description: extractDescription(content) });
      }
    } else if (entry.endsWith(".md")) {
      const content = fs.readFileSync(entryPath, "utf-8");
      out.push({ source: "plugin", name: `${pluginName}:${entry.slice(0, -3)}`, plugin: pluginId, status, description: extractDescription(content) });
    }
  }
}

// src/disable.ts
import * as fs2 from "fs";
import * as path2 from "path";
import * as os2 from "os";
var defaultClaudeDir2 = path2.join(os2.homedir(), ".claude");
var skillsDir = (d) => path2.join(d, "skills");
var disabledDir = (d) => path2.join(d, "skills", ".disabled");
function disableSkill(name, claudeDir = defaultClaudeDir2) {
  const disDir = disabledDir(claudeDir);
  if (fs2.existsSync(path2.join(disDir, `${name}.md`))) throw new Error(`Skill "${name}" is already disabled`);
  const src = path2.join(skillsDir(claudeDir), `${name}.md`);
  if (!fs2.existsSync(src)) throw new Error(`Skill "${name}" not found in skills directory`);
  fs2.mkdirSync(disDir, { recursive: true });
  fs2.renameSync(src, path2.join(disDir, `${name}.md`));
}
function enableSkill(name, claudeDir = defaultClaudeDir2) {
  const src = path2.join(disabledDir(claudeDir), `${name}.md`);
  if (!fs2.existsSync(src)) throw new Error(`Skill "${name}" is not in disabled directory`);
  fs2.renameSync(src, path2.join(skillsDir(claudeDir), `${name}.md`));
}

// src/blocklist.ts
import * as fs3 from "fs/promises";
import * as path3 from "path";
import { homedir as homedir3 } from "os";
var defaultClaudeDir3 = path3.join(homedir3(), ".claude");
function blocklistPath(claudeDir) {
  return path3.join(claudeDir, "plugins", "blocklist.json");
}
async function readBlocklist(claudeDir = defaultClaudeDir3) {
  const filePath = blocklistPath(claudeDir);
  try {
    const raw = await fs3.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    const plugins = Array.isArray(parsed.plugins) ? parsed.plugins : [];
    return { fetchedAt: parsed.fetchedAt ?? (/* @__PURE__ */ new Date()).toISOString(), plugins };
  } catch (err) {
    if (err.code === "ENOENT") {
      return { fetchedAt: (/* @__PURE__ */ new Date()).toISOString(), plugins: [] };
    }
    throw err;
  }
}
async function writeBlocklist(data, claudeDir) {
  const filePath = blocklistPath(claudeDir);
  await fs3.mkdir(path3.dirname(filePath), { recursive: true });
  const tmp = filePath + ".tmp";
  await fs3.writeFile(tmp, JSON.stringify(data, null, 2));
  await fs3.rename(tmp, filePath);
}
async function blockPlugin(pluginId, reason, claudeDir = defaultClaudeDir3) {
  const blocklist = await readBlocklist(claudeDir);
  const alreadyBlocked = blocklist.plugins.some((e) => e.plugin === pluginId);
  if (alreadyBlocked) return;
  const entry = { plugin: pluginId, added_at: (/* @__PURE__ */ new Date()).toISOString(), reason };
  blocklist.plugins.push(entry);
  blocklist.fetchedAt = (/* @__PURE__ */ new Date()).toISOString();
  await writeBlocklist(blocklist, claudeDir);
}
async function unblockPlugin(pluginId, claudeDir = defaultClaudeDir3) {
  const blocklist = await readBlocklist(claudeDir);
  const filtered = blocklist.plugins.filter((e) => e.plugin !== pluginId);
  if (filtered.length === blocklist.plugins.length) return;
  blocklist.plugins = filtered;
  blocklist.fetchedAt = (/* @__PURE__ */ new Date()).toISOString();
  await writeBlocklist(blocklist, claudeDir);
}
async function setBlockedPlugins(pluginIds, reason, claudeDir = defaultClaudeDir3) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const plugins = pluginIds.map((id) => ({ plugin: id, added_at: now, reason }));
  const data = { fetchedAt: now, plugins };
  await writeBlocklist(data, claudeDir);
}

// src/profiles.ts
import * as fs4 from "fs";
import * as path4 from "path";
import { homedir as homedir4 } from "os";
var defaultClaudeDir4 = path4.join(homedir4(), ".claude");
function profileStorePath(claudeDir) {
  return path4.join(claudeDir, "skillctl", "profiles.json");
}
function readProfileStore(claudeDir = defaultClaudeDir4) {
  const filePath = profileStorePath(claudeDir);
  try {
    const raw = fs4.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") {
      return { active: null, profiles: {} };
    }
    throw err;
  }
}
function writeProfileStore(store, claudeDir) {
  const filePath = profileStorePath(claudeDir);
  fs4.mkdirSync(path4.dirname(filePath), { recursive: true });
  const tmp = filePath + ".tmp";
  fs4.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs4.renameSync(tmp, filePath);
}
function saveProfile(name, skills, plugins, claudeDir = defaultClaudeDir4) {
  const store = readProfileStore(claudeDir);
  const profile = {
    created: store.profiles[name]?.created ?? (/* @__PURE__ */ new Date()).toISOString(),
    skills,
    plugins
  };
  store.profiles[name] = profile;
  writeProfileStore(store, claudeDir);
}
function deleteProfile(name, claudeDir = defaultClaudeDir4) {
  const store = readProfileStore(claudeDir);
  if (store.active === name) throw new Error("Cannot delete active profile");
  if (!store.profiles[name]) throw new Error(`Profile "${name}" does not exist`);
  delete store.profiles[name];
  writeProfileStore(store, claudeDir);
}
async function activateProfile(name, claudeDir = defaultClaudeDir4) {
  const store = readProfileStore(claudeDir);
  const profile = store.profiles[name];
  if (!profile) {
    throw new Error(`Profile "${name}" does not exist`);
  }
  const profileSkills = new Set(profile.skills);
  const skillsDir2 = path4.join(claudeDir, "skills");
  const disabledDir2 = path4.join(claudeDir, "skills", ".disabled");
  const enabled = [];
  const disabled = [];
  if (fs4.existsSync(skillsDir2)) {
    for (const file of fs4.readdirSync(skillsDir2)) {
      if (!file.endsWith(".md")) continue;
      const stat = fs4.statSync(path4.join(skillsDir2, file));
      if (!stat.isFile()) continue;
      const skillName = file.slice(0, -3);
      if (!profileSkills.has(skillName)) {
        disableSkill(skillName, claudeDir);
        disabled.push(skillName);
      }
    }
  }
  if (fs4.existsSync(disabledDir2)) {
    for (const file of fs4.readdirSync(disabledDir2)) {
      if (!file.endsWith(".md")) continue;
      const skillName = file.slice(0, -3);
      if (profileSkills.has(skillName)) {
        enableSkill(skillName, claudeDir);
        enabled.push(skillName);
      }
    }
  }
  const profilePlugins = new Set(profile.plugins);
  const installedPath = path4.join(claudeDir, "plugins", "installed_plugins.json");
  let pluginsBlocked = [];
  try {
    const raw = JSON.parse(fs4.readFileSync(installedPath, "utf-8"));
    const allInstalled = Object.keys(raw?.plugins ?? {});
    pluginsBlocked = allInstalled.filter((id) => !profilePlugins.has(id));
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
  await setBlockedPlugins(pluginsBlocked, `blocked by profile: ${name}`, claudeDir);
  store.active = name;
  writeProfileStore(store, claudeDir);
  return { enabled, disabled, pluginsBlocked };
}

// src/catalog.ts
import * as fs5 from "fs";
import * as path5 from "path";
import * as os3 from "os";
var defaultClaudeDir5 = path5.join(os3.homedir(), ".claude");
function generateCatalog(claudeDir = defaultClaudeDir5) {
  const standalone = scanStandaloneSkills(claudeDir);
  const plugins = scanPlugins(claudeDir);
  const activeStandalone = standalone.filter((s) => s.status === "active");
  const disabledStandalone = standalone.filter((s) => s.status === "disabled");
  const activePlugins = plugins.filter((p) => p.status === "active");
  const disabledPlugins = plugins.filter((p) => p.status === "disabled");
  const totalActive = activeStandalone.length + activePlugins.reduce((n, p) => n + p.skills.length, 0);
  const totalDisabled = disabledStandalone.length + disabledPlugins.reduce((n, p) => n + p.skills.length, 0);
  const escape = (s) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
  const rows = (skills) => skills.map((s) => `| ${escape(s.name)} | ${escape(s.description || "\u2014")} |`).join("\n");
  const sections = [
    `# Skills Catalog`,
    `Generated: ${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)} | Active: ${totalActive} | Disabled: ${totalDisabled}`,
    ""
  ];
  if (activeStandalone.length > 0) {
    sections.push(`## Standalone \u2014 active (${activeStandalone.length})`, "| Skill | Description |", "|-------|-------------|", rows(activeStandalone), "");
  }
  if (disabledStandalone.length > 0) {
    sections.push(`## Standalone \u2014 disabled (${disabledStandalone.length})`, "| Skill | Description |", "|-------|-------------|", rows(disabledStandalone), "");
  }
  for (const p of activePlugins) {
    sections.push(`## Plugin: ${p.name} \u2014 active (${p.skills.length})`, "| Skill | Description |", "|-------|-------------|", rows(p.skills), "");
  }
  for (const p of disabledPlugins) {
    sections.push(`## Plugin: ${p.name} \u2014 DISABLED (${p.skills.length})`, "| Skill | Description |", "|-------|-------------|", rows(p.skills), "");
  }
  const content = sections.join("\n");
  fs5.writeFileSync(path5.join(claudeDir, "SKILLS.md"), content);
  return content;
}

// src/cli.ts
var program = new Command();
program.name("skillswitch").description("Manage Claude Code skills").version("0.1.0");
function confirm(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, (a) => {
      rl.close();
      resolve(a.toLowerCase() === "y");
    });
  });
}
program.command("list").description("Show all skills grouped by source").option("--disabled", "Show only disabled skills").action((opts) => {
  const standalone = scanStandaloneSkills();
  const plugins = scanPlugins();
  const ss = opts.disabled ? standalone.filter((s) => s.status === "disabled") : standalone;
  console.log(`
Standalone (${standalone.length} total):`);
  for (const s of ss) console.log(`  ${s.name}${s.status === "disabled" ? " [disabled]" : ""}`);
  const pp = opts.disabled ? plugins.filter((p) => p.status === "disabled") : plugins;
  for (const p of pp) console.log(`
${p.id}${p.status === "disabled" ? " [DISABLED]" : ""} (${p.skills.length} skills)`);
});
program.command("search <query>").description("Search skills by name or description (substring match)").action((query) => {
  const q = query.toLowerCase();
  const standalone = scanStandaloneSkills();
  const plugins = scanPlugins();
  const matches = [
    ...standalone.filter((s) => s.name.includes(q) || s.description.toLowerCase().includes(q)),
    ...plugins.flatMap((p) => p.skills).filter((s) => s.name.includes(q) || s.description.toLowerCase().includes(q))
  ];
  if (!matches.length) {
    console.log(`No skills matching "${query}".`);
    return;
  }
  console.log(`
${matches.length} match(es) for "${query}":
`);
  for (const s of matches) {
    console.log(`  ${s.name} [${s.status}]`);
    if (s.description) console.log(`    ${s.description}`);
  }
});
program.command("status").description("Show active profile and skill counts").action(() => {
  const store = readProfileStore();
  const standalone = scanStandaloneSkills();
  const plugins = scanPlugins();
  const active = standalone.filter((s) => s.status === "active").length + plugins.filter((p) => p.status === "active").reduce((n, p) => n + p.skills.length, 0);
  const disabled = standalone.filter((s) => s.status === "disabled").length + plugins.filter((p) => p.status === "disabled").reduce((n, p) => n + p.skills.length, 0);
  console.log(`Active profile : ${store.active ?? "none"}`);
  console.log(`Enabled skills : ${active}`);
  console.log(`Disabled skills: ${disabled}`);
  console.log(`Total          : ${active + disabled}`);
});
program.command("disable <name>").description("Disable a skill (substring match) or a plugin (--plugin)").option("--plugin", "Treat <name> as a full plugin ID (name@source)").option("--dry-run", "Preview without making changes").action(async (name, opts) => {
  if (opts.plugin) {
    if (opts.dryRun) {
      console.log(`[dry-run] Would block plugin: ${name}`);
      return;
    }
    await blockPlugin(name, "skillswitch: manually disabled");
    console.log(`Plugin blocked: ${name}`);
    return;
  }
  const matches = scanStandaloneSkills().filter((s) => s.name.includes(name) && s.status === "active");
  if (!matches.length) {
    console.log(`No active skills matching "${name}".`);
    return;
  }
  if (matches.length > 1) {
    console.log(`Matches: ${matches.map((s) => s.name).join(", ")}`);
    if (!await confirm(`Disable all ${matches.length}? (y/N) `)) {
      console.log("Aborted.");
      return;
    }
  }
  for (const s of matches) {
    if (opts.dryRun) console.log(`[dry-run] Would disable: ${s.name}`);
    else {
      disableSkill(s.name);
      console.log(`Disabled: ${s.name}`);
    }
  }
});
program.command("enable <name>").description("Enable a skill (substring match) or a plugin (--plugin)").option("--plugin", "Treat <name> as a full plugin ID (name@source)").option("--dry-run", "Preview without making changes").action(async (name, opts) => {
  if (opts.plugin) {
    if (opts.dryRun) {
      console.log(`[dry-run] Would unblock plugin: ${name}`);
      return;
    }
    await unblockPlugin(name);
    console.log(`Plugin unblocked: ${name}`);
    return;
  }
  const matches = scanStandaloneSkills().filter((s) => s.name.includes(name) && s.status === "disabled");
  if (!matches.length) {
    console.log(`No disabled skills matching "${name}".`);
    return;
  }
  if (matches.length > 1) {
    console.log(`Matches: ${matches.map((s) => s.name).join(", ")}`);
    if (!await confirm(`Enable all ${matches.length}? (y/N) `)) {
      console.log("Aborted.");
      return;
    }
  }
  for (const s of matches) {
    if (opts.dryRun) console.log(`[dry-run] Would enable: ${s.name}`);
    else {
      enableSkill(s.name);
      console.log(`Enabled: ${s.name}`);
    }
  }
});
var profileCmd = program.command("profile").description("Manage skill profiles");
profileCmd.command("create <name>").description("Snapshot current enabled skills as a named profile").action((name) => {
  const skills = scanStandaloneSkills().filter((s) => s.status === "active").map((s) => s.name);
  const plugins = scanPlugins().filter((p) => p.status === "active").map((p) => p.id);
  saveProfile(name, skills, plugins);
  console.log(`Profile "${name}" saved: ${skills.length} skills, ${plugins.length} plugins.`);
});
profileCmd.command("use <name>").description("Activate a profile").option("--dry-run", "Preview without making changes").action(async (name, opts) => {
  if (opts.dryRun) {
    const store = readProfileStore();
    const p = store.profiles[name];
    if (!p) {
      console.log(`Profile "${name}" not found.`);
      return;
    }
    console.log(`[dry-run] Would activate "${name}": ${p.skills.length} skills, ${p.plugins.length} plugins.`);
    return;
  }
  const result = await activateProfile(name);
  console.log(`Activated "${name}": ${result.disabled.length} disabled, ${result.enabled.length} enabled, ${result.pluginsBlocked.length} plugins blocked.`);
});
profileCmd.command("list").description("List saved profiles").action(() => {
  const store = readProfileStore();
  const names = Object.keys(store.profiles);
  if (!names.length) {
    console.log("No profiles saved.");
    return;
  }
  for (const name of names) {
    const p = store.profiles[name];
    const tag = store.active === name ? " [active]" : "";
    console.log(`  ${name}${tag}: ${p.skills.length} skills, ${p.plugins.length} plugins`);
  }
});
profileCmd.command("show <name>").description("Show skills in a profile").action((name) => {
  const store = readProfileStore();
  const p = store.profiles[name];
  if (!p) {
    console.log(`Profile "${name}" not found.`);
    return;
  }
  console.log(`Profile "${name}" (${p.created.slice(0, 10)}):`);
  console.log(`  Skills  (${p.skills.length}): ${p.skills.join(", ") || "none"}`);
  console.log(`  Plugins (${p.plugins.length}): ${p.plugins.join(", ") || "none"}`);
});
profileCmd.command("delete <name>").description("Delete a saved profile").action((name) => {
  try {
    deleteProfile(name);
    console.log(`Profile "${name}" deleted.`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
});
program.command("catalog").description("Generate ~/.claude/SKILLS.md catalog").action(() => {
  generateCatalog();
  console.log("Catalog written to ~/.claude/SKILLS.md");
  console.log("Tip: use @~/.claude/SKILLS.md in any Claude session to reference it.");
});
program.command("audit").description("Report duplicates, disabled skill counts, and plugin orphans").action(() => {
  const standalone = scanStandaloneSkills();
  const plugins = scanPlugins();
  const standaloneNames = new Set(standalone.map((s) => s.name));
  const pluginBaseNames = plugins.flatMap((p) => p.skills.map((s) => {
    const parts = s.name.split(":");
    return parts[parts.length - 1];
  }));
  const duplicates = [...standaloneNames].filter((n) => pluginBaseNames.includes(n));
  const disabledStandalone = standalone.filter((s) => s.status === "disabled");
  const disabledPlugins = plugins.filter((p) => p.status === "disabled");
  let found = false;
  if (duplicates.length) {
    found = true;
    console.log(`
Potential duplicates (standalone name matches plugin skill name):`);
    duplicates.forEach((d) => console.log(`  ${d}`));
  }
  if (disabledStandalone.length) {
    found = true;
    console.log(`
Disabled standalone skills (${disabledStandalone.length}) \u2014 review for removal:`);
    disabledStandalone.forEach((s) => console.log(`  ${s.name}`));
  }
  if (disabledPlugins.length) {
    found = true;
    console.log(`
Blocked plugins (${disabledPlugins.length}):`);
    disabledPlugins.forEach((p) => console.log(`  ${p.id}`));
  }
  if (!found) console.log("No issues found.");
});
program.parse();
