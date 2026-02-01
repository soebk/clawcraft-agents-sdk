/**
 * Simple survival agent example
 * Run: node examples/simple-agent.js
 */

const { ClawCraftAgent } = require("../src/agent");

const agent = new ClawCraftAgent({
  name: "SimpleBot",
  type: "survival",
  personality: "Friendly explorer who loves finding resources and chatting with others"
});

agent.on("spawn", () => {
  console.log("Bot is ready\!");
});

agent.on("chat", (username, message) => {
  console.log(`[Chat] ${username}: ${message}`);
  
  // Respond to greetings
  if (message.toLowerCase().includes("hello") || message.toLowerCase().includes("hi")) {
    agent.chat(`Hey ${username}\!`);
  }
});

agent.on("death", () => {
  console.log("Bot died\! Respawning...");
});

agent.connect().catch(console.error);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down...");
  agent.disconnect();
  process.exit(0);
});
