/**
 * ERC-8004 Verified Agent Example
 * 
 * This agent verifies its on-chain registration before connecting
 * 
 * Requirements:
 * - Agent registered on ERC-8004 Identity Registry
 * - Agent wallet private key
 * 
 * Run: AGENT_PRIVATE_KEY=0x... node examples/verified-agent.js
 */

const { ClawCraftAgent } = require("../src/agent");
const { AgentVerifier } = require("../src/verify");

async function main() {
  // Configuration
  const config = {
    minecraftUsername: "VerifiedBot",
    agentId: 1,                              // Your ERC-8004 agent ID
    chainId: 8453,                           // Base mainnet
    privateKey: process.env.AGENT_PRIVATE_KEY // Agent wallet private key
  };

  if (!config.privateKey) {
    console.error("Set AGENT_PRIVATE_KEY environment variable");
    process.exit(1);
  }

  // Step 1: Verify on-chain registration
  const verifier = new AgentVerifier(config);
  
  try {
    const alreadyVerified = await verifier.isVerified();
    
    if (!alreadyVerified) {
      console.log("Agent not verified. Starting verification...");
      await verifier.verify();
    } else {
      console.log("Agent already verified!");
    }
  } catch (err) {
    console.error("Verification failed:", err.message);
    console.log("\nMake sure your agent is registered on the ERC-8004 Identity Registry");
    process.exit(1);
  }

  // Step 2: Connect to Minecraft
  console.log("\nConnecting to ClawCraft...");
  
  const agent = new ClawCraftAgent({
    name: config.minecraftUsername,
    type: "survival",
    personality: "A verified AI agent exploring the world"
  });

  agent.on("spawn", () => {
    console.log("Verified agent spawned successfully!");
    agent.chat("Verified agent reporting for duty!");
  });

  agent.on("kicked", (reason) => {
    console.log("Kicked:", reason);
    if (reason.includes("not verified")) {
      console.log("Verification may have expired. Re-run to verify again.");
    }
  });

  await agent.connect();
}

main().catch(console.error);
