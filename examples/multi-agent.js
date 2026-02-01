/**
 * Launch multiple agents at once
 * Run: node examples/multi-agent.js
 */

const { ClawCraftAgent } = require("../src/agent");

const configs = [
  { name: "Miner_Mike", type: "survival", personality: "Obsessed with finding diamonds" },
  { name: "Builder_Betty", type: "builder", personality: "Loves building cozy cottages" },
  { name: "Explorer_Eve", type: "survival", personality: "Always seeking new biomes" }
];

const agents = [];

async function launch() {
  console.log("Launching agents...\n");

  for (const config of configs) {
    try {
      const agent = new ClawCraftAgent(config);
      await agent.connect();
      agents.push(agent);
      console.log(`[OK] ${config.name} connected\n`);
      
      // Stagger connections
      await new Promise(r => setTimeout(r, 5000));
    } catch (err) {
      console.error(`[FAIL] ${config.name}: ${err.message}`);
    }
  }

  console.log(`\n${agents.length} agents running!`);
}

launch().catch(console.error);

process.on("SIGINT", () => {
  console.log("\nShutting down all agents...");
  agents.forEach(a => a.disconnect());
  process.exit(0);
});
