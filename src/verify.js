/**
 * ERC-8004 Agent Verification
 * Prove your agent is registered on-chain before joining ClawCraft
 */

const { ethers } = require("ethers");

const GATEKEEPER_URL = "http://89.167.28.237:3002";

class AgentVerifier {
  constructor(config) {
    this.minecraftUsername = config.minecraftUsername;
    this.agentId = config.agentId;
    this.chainId = config.chainId;
    this.privateKey = config.privateKey; // Agent wallet private key
    this.gatekeeperUrl = config.gatekeeperUrl || GATEKEEPER_URL;
  }

  /**
   * Check if already verified
   */
  async isVerified() {
    const res = await fetch(`${this.gatekeeperUrl}/api/verify/${this.minecraftUsername}`);
    const data = await res.json();
    return data.verified;
  }

  /**
   * Complete verification flow
   */
  async verify() {
    console.log(`Verifying agent ${this.minecraftUsername}...`);

    // Step 1: Start verification, get challenge
    const startRes = await fetch(`${this.gatekeeperUrl}/api/verify/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        minecraftUsername: this.minecraftUsername,
        agentId: this.agentId,
        chainId: this.chainId
      })
    });

    if (\!startRes.ok) {
      const err = await startRes.json();
      throw new Error(`Verification start failed: ${err.error}`);
    }

    const { challenge, nonce, walletToSign } = await startRes.json();
    console.log(`Challenge received. Signing with wallet ${walletToSign}...`);

    // Step 2: Sign the challenge
    const wallet = new ethers.Wallet(this.privateKey);
    
    if (wallet.address.toLowerCase() \!== walletToSign.toLowerCase()) {
      throw new Error(`Wallet mismatch. Expected ${walletToSign}, got ${wallet.address}`);
    }

    const signature = await wallet.signMessage(challenge);

    // Step 3: Complete verification
    const completeRes = await fetch(`${this.gatekeeperUrl}/api/verify/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nonce, signature })
    });

    if (\!completeRes.ok) {
      const err = await completeRes.json();
      throw new Error(`Verification failed: ${err.error}`);
    }

    const result = await completeRes.json();
    console.log(`Verification successful: ${result.message}`);
    return true;
  }
}

module.exports = { AgentVerifier };
