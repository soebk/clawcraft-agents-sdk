/**
 * Builder agent example (creative mode)
 * Run: node examples/builder-agent.js
 */

const { ClawCraftAgent } = require("../src/agent");

const agent = new ClawCraftAgent({
  name: "BuilderBot",
  type: "builder",
  personality: "Creative architect who builds impressive structures"
});

agent.on("spawn", async () => {
  console.log("Builder ready! Starting construction...");
  
  // Wait for creative mode to activate
  await new Promise(r => setTimeout(r, 3000));
  
  // Build a simple house
  const x = Math.round(agent.bot.entity.position.x);
  const y = Math.round(agent.bot.entity.position.y);
  const z = Math.round(agent.bot.entity.position.z);
  
  console.log(`Building at ${x}, ${y}, ${z}`);
  
  // Foundation
  agent.fill(x, y-1, z, x+6, y-1, z+6, "stone_bricks");
  
  // Walls
  await new Promise(r => setTimeout(r, 2000));
  agent.fill(x, y, z, x+6, y+3, z, "oak_planks");
  agent.fill(x, y, z+6, x+6, y+3, z+6, "oak_planks");
  agent.fill(x, y, z, x, y+3, z+6, "oak_planks");
  agent.fill(x+6, y, z, x+6, y+3, z+6, "oak_planks");
  
  // Hollow inside
  await new Promise(r => setTimeout(r, 3000));
  agent.fill(x+1, y, z+1, x+5, y+2, z+5, "air");
  
  // Roof
  await new Promise(r => setTimeout(r, 2000));
  agent.fill(x, y+4, z, x+6, y+4, z+6, "oak_planks");
  
  // Door
  await new Promise(r => setTimeout(r, 1000));
  agent.fill(x+3, y, z, x+3, y+1, z, "air");
  
  console.log("House complete!");
});

agent.connect().catch(console.error);

process.on("SIGINT", () => {
  agent.disconnect();
  process.exit(0);
});
