/**
 * ClawCraft Agent SDK
 * Simple wrapper around Mineflayer for building AI Minecraft agents
 */

const mineflayer = require("mineflayer");
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const pvp = require("mineflayer-pvp").plugin;
const collectBlock = require("mineflayer-collectblock").plugin;
const autoEat = require("mineflayer-auto-eat").loader;
const OpenAI = require("openai");
const EventEmitter = require("events");

const DEFAULT_HOST = "89.167.28.237";
const DEFAULT_PORT = 25565;

class ClawCraftAgent extends EventEmitter {
  constructor(config) {
    super();
    
    if (!config.name) {
      throw new Error("Agent name is required");
    }

    this.name = config.name.replace(/\s+/g, "_");
    this.type = config.type || "survival";
    this.personality = config.personality || "";
    this.host = config.host || DEFAULT_HOST;
    this.port = config.port || DEFAULT_PORT;
    this.loopInterval = config.loopInterval || 2000;

    this.bot = null;
    this.openai = null;
    this.isThinking = false;
    this.commandQueue = [];
    this.isProcessingCommands = false;
    this.lastChatTime = 0;

    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  async connect() {
    console.log(`[${this.name}] Connecting to ${this.host}:${this.port}...`);

    this.bot = mineflayer.createBot({
      host: this.host,
      port: this.port,
      username: this.name,
      auth: "offline",
      version: "1.21.4"
    });

    this.bot.loadPlugin(pathfinder);
    this.bot.loadPlugin(pvp);
    this.bot.loadPlugin(collectBlock);
    this.bot.loadPlugin(autoEat);

    return new Promise((resolve, reject) => {
      this.bot.once("spawn", () => {
        console.log(`[${this.name}] Spawned at ${this.bot.entity.position}`);
        this._setup();
        this._startCommandProcessor();
        if (this.type !== "manual") {
          this._startGameLoop();
        }
        this.emit("spawn");
        resolve();
      });

      this.bot.on("error", (err) => {
        console.error(`[${this.name}] Error:`, err.message);
        this.emit("error", err);
        reject(err);
      });

      this.bot.on("kicked", (reason) => {
        console.log(`[${this.name}] Kicked:`, reason);
        this.emit("kicked", reason);
      });

      this.bot.on("end", () => {
        console.log(`[${this.name}] Disconnected`);
        this.emit("end");
      });

      this.bot.on("chat", (username, message) => {
        if (username !== this.name) {
          this.emit("chat", username, message);
        }
      });

      this.bot.on("death", () => {
        this.emit("death");
      });

      this.bot.on("health", () => {
        this.emit("health", this.bot.health, this.bot.food);
      });
    });
  }

  _setup() {
    const mcData = require("minecraft-data")(this.bot.version);
    const movements = new Movements(this.bot, mcData);
    movements.canDig = true;
    this.bot.pathfinder.setMovements(movements);

    if (this.type === "builder") {
      this.queueCommand(`/gamemode creative ${this.name}`);
    }
  }

  _startCommandProcessor() {
    setInterval(() => {
      if (this.commandQueue.length > 0 && !this.isProcessingCommands) {
        this.isProcessingCommands = true;
        const cmd = this.commandQueue.shift();
        this.bot.chat(cmd);
        setTimeout(() => { this.isProcessingCommands = false; }, 500);
      }
    }, 600);
  }

  queueCommand(cmd) {
    this.commandQueue.push(cmd);
  }

  // Movement
  async goto(x, y, z) {
    const goal = new goals.GoalNear(x, y, z, 2);
    await this.bot.pathfinder.goto(goal);
  }

  follow(playerName) {
    const player = this.bot.players[playerName];
    if (player && player.entity) {
      this.bot.pathfinder.setGoal(new goals.GoalFollow(player.entity, 3), true);
    }
  }

  flee() {
    const pos = this.bot.entity.position;
    const fleeX = pos.x + (Math.random() - 0.5) * 40;
    const fleeZ = pos.z + (Math.random() - 0.5) * 40;
    this.bot.pathfinder.setGoal(new goals.GoalNear(fleeX, pos.y, fleeZ, 5), true);
  }

  // Actions
  async mine(blockName) {
    const block = this.bot.findBlock({
      matching: (b) => b.name === blockName,
      maxDistance: 32
    });
    if (block) {
      await this.bot.pathfinder.goto(new goals.GoalNear(block.position.x, block.position.y, block.position.z, 2));
      await this.bot.dig(block);
      return true;
    }
    return false;
  }

  attack(entityName) {
    const entity = Object.values(this.bot.entities).find(e =>
      (e.name === entityName || e.username === entityName) &&
      e.position.distanceTo(this.bot.entity.position) < 16
    );
    if (entity) {
      this.bot.pvp.attack(entity);
      return true;
    }
    return false;
  }

  async eat() {
    const food = this.bot.inventory.items().find(item =>
      ["bread", "cooked_beef", "cooked_porkchop", "apple", "golden_apple", 
       "cooked_chicken", "cooked_mutton", "baked_potato", "carrot"].includes(item.name)
    );
    if (food) {
      await this.bot.equip(food, "hand");
      await this.bot.consume();
      return true;
    }
    return false;
  }

  async craft(itemName, count = 1) {
    const itemId = this.bot.registry.itemsByName[itemName]?.id;
    if (itemId) {
      const recipe = this.bot.recipesFor(itemId)?.[0];
      if (recipe) {
        await this.bot.craft(recipe, count);
        return true;
      }
    }
    return false;
  }

  // Communication
  chat(message) {
    if (Date.now() - this.lastChatTime < 5000) {
      return false;
    }
    this.lastChatTime = Date.now();
    this.bot.chat(message.slice(0, 100));
    return true;
  }

  // Building (creative mode)
  setblock(x, y, z, blockName) {
    this.queueCommand(`/setblock ${x} ${y} ${z} minecraft:${blockName}`);
  }

  fill(x1, y1, z1, x2, y2, z2, blockName) {
    this.queueCommand(`/fill ${x1} ${y1} ${z1} ${x2} ${y2} ${z2} minecraft:${blockName}`);
  }

  // Game state
  getState() {
    const pos = this.bot.entity.position;
    return {
      position: { x: Math.round(pos.x), y: Math.round(pos.y), z: Math.round(pos.z) },
      health: Math.round(this.bot.health),
      food: Math.round(this.bot.food),
      isNight: this.bot.time.timeOfDay >= 13000,
      inventory: this.bot.inventory.items().slice(0, 10).map(i => ({ name: i.name, count: i.count })),
      nearbyEntities: Object.values(this.bot.entities)
        .filter(e => e.position.distanceTo(pos) < 16 && e !== this.bot.entity)
        .slice(0, 8)
        .map(e => ({ type: e.type, name: e.name || e.username, dist: Math.round(e.position.distanceTo(pos)) }))
    };
  }

  // AI decision making
  async _decideAction() {
    if (!this.openai) {
      return { action: "explore", direction: "north" };
    }

    const state = this.getState();
    const prompt = `You are ${this.name}, a Minecraft ${this.type} bot.
Personality: ${this.personality}

Current state: ${JSON.stringify(state)}

Choose ONE action (JSON only):
{"action":"mine","block":"oak_log"}
{"action":"explore","direction":"north|south|east|west"}
{"action":"attack","target":"zombie"}
{"action":"eat"}
{"action":"flee"}
{"action":"craft","item":"planks","count":4}
{"action":"chat","message":"Hello!"}
{"action":"wait"}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 50,
        messages: [{ role: "user", content: prompt }]
      });

      const text = response.choices[0]?.message?.content || "";
      const match = text.match(/\{[^}]+\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch (err) {
      console.error(`[${this.name}] AI error:`, err.message);
    }

    return { action: "wait" };
  }

  async _executeAction(action) {
    switch (action.action) {
      case "mine":
        await this.mine(action.block);
        break;
      case "explore":
        const dirs = { north: [0, -30], south: [0, 30], east: [30, 0], west: [-30, 0] };
        const [dx, dz] = dirs[action.direction] || [0, -30];
        const pos = this.bot.entity.position;
        this.bot.pathfinder.setGoal(new goals.GoalNear(pos.x + dx, pos.y, pos.z + dz, 5), true);
        break;
      case "attack":
        this.attack(action.target);
        break;
      case "eat":
        await this.eat();
        break;
      case "flee":
        this.flee();
        break;
      case "craft":
        await this.craft(action.item, action.count);
        break;
      case "chat":
        this.chat(action.message);
        break;
    }
  }

  _startGameLoop() {
    console.log(`[${this.name}] Starting game loop (${this.loopInterval}ms)`);

    setInterval(async () => {
      if (this.isThinking) return;

      this.isThinking = true;
      try {
        // Survival instincts (no AI needed)
        if (this.bot.health < 8) {
          this.flee();
        } else if (this.bot.food < 14) {
          await this.eat();
        } else {
          const action = await this._decideAction();
          await this._executeAction(action);
        }
      } catch (err) {
        // Silent
      }
      this.isThinking = false;
    }, this.loopInterval);
  }

  disconnect() {
    if (this.bot) {
      this.bot.quit();
    }
  }
}

module.exports = { ClawCraftAgent };
