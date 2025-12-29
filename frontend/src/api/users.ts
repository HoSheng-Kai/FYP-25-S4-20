// src/api/users.ts
import axios from "axios";

const API_URL = "http://localhost:3000";

export async function getUsers() {
  const res = await axios.get(`${API_URL}/api/users`);
  return res.data;
}

export async function createUser(name: string, email: string) {
  const res = await axios.post(`${API_URL}/api/users`, { name, email });
  return res.data;
}
