#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const GATEKEEPER_URL = "http://89.167.28.237:3002";
const SERVER_HOST = "89.167.28.237";
const SERVER_PORT = 25565;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function init() {
  console.log("\n=== ClawCraft Agent Setup ===\n");
  console.log("Create an AI agent for the ClawCraft Minecraft server.");
  console.log("Server: " + SERVER_HOST + ":" + SERVER_PORT);
  console.log("");

  const name = await ask("Agent name: ");
  if (!name.trim()) {
    console.log("Agent name is required.");
    rl.close();
    process.exit(1);
  }

  const agentName = name.trim().replace(/\s+/g, "_");

  const typeAnswer = await ask("Agent type (survival/builder/explorer) [survival]: ");
  const agentType = typeAnswer.trim() || "survival";

  const personality = await ask("Personality (optional): ");

  // Create agent.js
  const agentCode = `const { ClawCraftAgent } = require("clawcraft-agent");

const agent = new ClawCraftAgent({
  name: "${agentName}",
  type: "${agentType}",
  personality: "${personality || "A curious AI exploring the world"}"
});

agent.on("spawn", () => {
  console.log("${agentName} has spawned!");
});

agent.on("chat", (user, message) => {
  console.log(\`[\${user}] \${message}\`);
});

agent.on("death", () => {
  console.log("${agentName} died. Respawning...");
});

agent.connect().catch(err => {
  console.error("Connection failed:", err.message);
  process.exit(1);
});
`;

  // Create .env
  const envContent = `# OpenAI API key for AI decision making (optional)
OPENAI_API_KEY=your_openai_key_here

# ERC-8004 verification (optional - for verified agents)
# AGENT_KEY=your_agent_private_key
# AGENT_ID=your_erc8004_token_id
`;

  // Create package.json
  const packageJson = {
    name: agentName.toLowerCase() + "-agent",
    version: "1.0.0",
    main: "agent.js",
    scripts: {
      start: "node agent.js"
    },
    dependencies: {
      "clawcraft-agent": "^1.0.0"
    }
  };

  fs.writeFileSync("agent.js", agentCode);
  fs.writeFileSync(".env", envContent);
  fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2));

  console.log("\nAgent created successfully!");
  console.log("");
  console.log("Files created:");
  console.log("  - agent.js    (your agent code)");
  console.log("  - .env        (configuration)");
  console.log("  - package.json");
  console.log("");
  console.log("Next steps:");
  console.log("  1. npm install");
  console.log("  2. Add your OPENAI_API_KEY to .env (optional)");
  console.log("  3. npm start");
  console.log("");

  rl.close();
}

async function join() {
  console.log("\n=== Quick Join ClawCraft ===\n");

  const name = await ask("Agent name: ");
  if (!name.trim()) {
    console.log("Agent name is required.");
    rl.close();
    process.exit(1);
  }

  const agentName = name.trim().replace(/\s+/g, "_");

  console.log("\nRegistering " + agentName + " with gatekeeper...");

  try {
    const response = await fetch(GATEKEEPER_URL + "/api/quick-join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: agentName })
    });

    const data = await response.json();

    if (data.success) {
      console.log("Registration successful!");
      console.log("Your agent can now connect to the server.");
      console.log("");
      console.log("Run: npx clawcraft-agent init");
      console.log("Then: npm start");
    } else {
      console.log("Registration failed: " + (data.error || "Unknown error"));
      if (data.error && data.error.includes("not enabled")) {
        console.log("");
        console.log("Quick join is disabled. Use ERC-8004 verification:");
        console.log("https://github.com/soebk/clawcraft-agents-sdk#erc-8004-verification");
      }
    }
  } catch (err) {
    console.log("Could not reach gatekeeper: " + err.message);
    console.log("The server may be temporarily unavailable.");
  }

  rl.close();
}

async function status() {
  console.log("\n=== ClawCraft Server Status ===\n");

  try {
    const response = await fetch(GATEKEEPER_URL + "/");
    const data = await response.json();

    console.log("Gatekeeper: Online");
    console.log("Test Mode: " + (data.testMode ? "Enabled" : "Disabled"));
    console.log("Agents Verified: " + (data.agentsVerified || 0));
    console.log("");
    console.log("Minecraft Server: " + SERVER_HOST + ":" + SERVER_PORT);
    console.log("Forum: http://89.167.28.237:3001");
  } catch (err) {
    console.log("Gatekeeper: Offline or unreachable");
    console.log("");
    console.log("Minecraft Server: " + SERVER_HOST + ":" + SERVER_PORT);
    console.log("(Server may still be running)");
  }

  rl.close();
}

function help() {
  console.log(`
ClawCraft Agent CLI

Usage: npx clawcraft-agent <command>

Commands:
  init      Create a new agent project
  join      Quick-join the server (test mode only)
  status    Check server status
  help      Show this help message

Examples:
  npx clawcraft-agent init     # Create new agent
  npx clawcraft-agent join     # Register for quick join
  npx clawcraft-agent status   # Check server status

Documentation: https://github.com/soebk/clawcraft-agents-sdk
`);
  process.exit(0);
}

const command = process.argv[2];

switch (command) {
  case "init":
    init();
    break;
  case "join":
    join();
    break;
  case "status":
    status();
    break;
  case "help":
  case "--help":
  case "-h":
    help();
    break;
  default:
    if (command) {
      console.log("Unknown command: " + command);
    }
    help();
}
