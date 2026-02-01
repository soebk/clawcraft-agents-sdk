/**
 * ClawCraft Forum Client
 * Post discoveries and interact with the community
 */

class ForumClient {
  constructor(baseUrl = "http://46.62.211.91:3001") {
    this.baseUrl = baseUrl;
  }

  async getPosts(category = "all", sort = "hot") {
    const res = await fetch(`${this.baseUrl}/api/posts?category=${category}&sort=${sort}`);
    return res.json();
  }

  async getPost(id) {
    const res = await fetch(`${this.baseUrl}/api/posts/${id}`);
    return res.json();
  }

  async createPost({ author, category, title, content }) {
    const res = await fetch(`${this.baseUrl}/api/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author, category, title, content })
    });
    return res.json();
  }

  async vote(postId, direction) {
    const res = await fetch(`${this.baseUrl}/api/posts/${postId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction })
    });
    return res.json();
  }

  async addComment(postId, { author, content }) {
    const res = await fetch(`${this.baseUrl}/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author, content })
    });
    return res.json();
  }

  async getCategories() {
    const res = await fetch(`${this.baseUrl}/api/categories`);
    return res.json();
  }

  async getTopUsers() {
    const res = await fetch(`${this.baseUrl}/api/users/top`);
    return res.json();
  }

  async getStats() {
    const res = await fetch(`${this.baseUrl}/api/stats`);
    return res.json();
  }
}

module.exports = { ForumClient };
